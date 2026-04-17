import { NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

// Helper: Convert database format to frontend format
function formatStateForFrontend() {
  const vehicles = db.getVehicles();
  const zones = db.getZones();
  const incidents = db.getActiveIncidents();
  const environment = db.getEnvironment();

  // Convert Unix timestamps to Date objects for frontend
  const formattedVehicles = vehicles.map((v: any) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    status: v.status,
    location: {
      lat: v.location_lat,
      lng: v.location_lng
    },
    speed: v.speed,
    heading: v.heading,
    fuel: v.fuel,
    cargoWeight: v.cargo_weight,
    cargoCapacity: v.cargo_capacity,
    aiPersonality: v.ai_personality,
    lastUpdate: new Date(v.updated_at * 1000).toISOString()
  }));

  const formattedZones = zones.map((z: any) => ({
    id: z.id,
    name: z.name,
    location: {
      lat: z.center_lat,
      lng: z.center_lng
    },
    radius: z.radius_meters,
    congestionLevel: z.congestion_level,
    avgSpeed: z.avg_speed,
    vehicleCount: z.vehicle_count,
    type: z.zone_type
  }));

  const formattedIncidents = incidents.map((i: any) => ({
    id: i.id,
    type: i.type,
    severity: i.severity,
    location: {
      lat: i.location_lat,
      lng: i.location_lng
    },
    affectedRadius: i.affected_radius_meters,
    status: i.status,
    description: i.description,
    speedReduction: i.speed_reduction_factor,
    reportedAt: new Date(i.reported_at * 1000).toISOString()
  }));

  return {
    vehicles: formattedVehicles,
    zones: formattedZones,
    incidents: formattedIncidents,
    environment: environment ? {
      condition: (environment as any).condition,
      temperature: (environment as any).temperature,
      congestionLevel: (environment as any).global_congestion_level,
      rushHour: (environment as any).rush_hour === 1
    } : null,
    lastUpdated: Date.now()
  };
}

// GET: Retrieve the current world state
export async function GET() {
  try {
    const state = formatStateForFrontend();
    return NextResponse.json(state);
  } catch (error) {
    console.error('❌ Failed to get simulation state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch simulation state' },
      { status: 500 }
    );
  }
}

// POST: Update the world state (Called by Simulation Engine)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicles, zones, incidents, environment } = body;

    // Update vehicles in database
    if (vehicles && Array.isArray(vehicles)) {
      for (const vehicle of vehicles) {
        if (vehicle.location) {
          db.updateVehicleLocation(
            vehicle.id,
            vehicle.location.lat,
            vehicle.location.lng,
            vehicle.speed || 0,
            vehicle.heading || 0
          );
        }
        if (vehicle.fuel !== undefined) {
          db.updateVehicleFuel(vehicle.id, vehicle.fuel);
        }
        if (vehicle.status) {
          db.updateVehicleStatus(vehicle.id, vehicle.status);
        }
      }
    }

    // Update zones in database
    if (zones && Array.isArray(zones)) {
      for (const zone of zones) {
        if (zone.congestionLevel !== undefined) {
          db.updateZoneCongestion(
            zone.id,
            zone.congestionLevel,
            zone.vehicleCount || 0
          );
        }
      }
    }

    // Update environment
    if (environment) {
      db.updateEnvironment({
        condition: environment.condition,
        temperature: environment.temperature,
        globalCongestion: environment.congestionLevel,
        rushHour: environment.rushHour
      });
    }

    const updatedState = formatStateForFrontend();
    return NextResponse.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('❌ Failed to update simulation state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update state' },
      { status: 500 }
    );
  }
}

// DELETE: Reset simulation to initial state
export async function DELETE() {
  try {
    // For now, just return current state
    // In future, could re-run seed data to truly reset
    const state = formatStateForFrontend();
    return NextResponse.json({
      success: true,
      message: 'Simulation state retrieved (reset not yet implemented)',
      state
    });
  } catch (error) {
    console.error('❌ Failed to reset simulation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset' },
      { status: 500 }
    );
  }
}
