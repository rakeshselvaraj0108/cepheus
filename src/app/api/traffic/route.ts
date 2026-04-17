/**
 * Traffic API endpoint - Returns FREE UNLIMITED real-time traffic data for Bangalore
 */

import { NextResponse } from 'next/server';
import { fetchTrafficIncidents, updateZoneTrafficData } from '@/lib/traffic/freeTrafficService';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'trafficmaxxers.db');
const db = new Database(dbPath);

/**
 * GET /api/traffic
 * Returns current traffic incidents and zones for Bangalore (FREE UNLIMITED)
 */
export async function GET() {
  try {
    const incidents = await fetchTrafficIncidents();
    
    // Fetch zones from database
    const zones = db.prepare(`
      SELECT 
        id,
        name,
        center_lat,
        center_lng,
        radius_meters,
        avg_speed,
        vehicle_count,
        congestion_level
      FROM zones
    `).all();

    // Fetch fuel stations from database
    const fuelStations = db.prepare(`
        SELECT
            id,
            name,
            location_lat,
            location_lng,
            fuel_price,
            capacity,
            operational
        FROM fuel_stations
        WHERE operational = 1
    `).all();
    
    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents: incidents.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        location: i.location,
        description: i.description,
        delayMinutes: i.delayMinutes,
        affectedRoads: i.affectedRoads
      })),
      fuelStations: fuelStations.map((f: any) => ({
          id: f.id,
          name: f.name,
          location: {
              lat: f.location_lat,
              lng: f.location_lng
          },
          price: f.fuel_price,
          capacity: f.capacity
      })),
      zones: zones.map((z: any) => ({
        id: z.id,
        name: z.name,
        location: {
          lat: z.center_lat,
          lng: z.center_lng
        },
        radius: z.radius_meters,
        avgSpeed: z.avg_speed,
        vehicleCount: z.vehicle_count,
        congestionLevel: z.congestion_level
      }))
    });
  } catch (error) {
    console.error('Traffic API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch traffic data' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/traffic/zones
 * Updates zone traffic data based on current incidents
 * Body: { zones: Zone[] }
 */
export async function POST(request: Request) {
  try {
    // Fetch all zones from database
    const zones = db.prepare(`
      SELECT 
        zone_id,
        zone_name,
        center_lat,
        center_lng,
        radius_km,
        avg_speed,
        vehicle_count,
        congestion_level,
        active_incidents
      FROM traffic_zones
    `).all();

    // Update zone data with live traffic
    const updatedZones = await updateZoneTrafficData(zones as any);
    
    // Update database with new zone data
    const updateStmt = db.prepare(`
      UPDATE traffic_zones
      SET 
        avg_speed = ?,
        congestion_level = ?,
        active_incidents = ?
      WHERE zone_id = ?
    `);
    
    const updateMany = db.transaction((zones: any[]) => {
      for (const zone of zones) {
        updateStmt.run(
          zone.avgSpeed,
          zone.congestionLevel,
          zone.activeIncidents,
          zone.zoneId
        );
      }
    });
    
    updateMany(updatedZones);
    
    console.log(`✅ Updated ${updatedZones.length} zones with traffic data`);
    
    return NextResponse.json({
      success: true,
      zonesUpdated: updatedZones.length,
      zones: updatedZones.map(z => ({
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        avgSpeed: z.avgSpeed,
        congestionLevel: z.congestionLevel,
        activeIncidents: z.activeIncidents
      }))
    });
  } catch (error) {
    console.error('Zone traffic update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update zone traffic' 
      },
      { status: 500 }
    );
  }
}
