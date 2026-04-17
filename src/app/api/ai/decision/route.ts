import { NextRequest, NextResponse } from 'next/server';
import { VehicleAgent } from '@/lib/ai/vehicleAgent';
import { db } from '@/lib/db/database';

// Store agents in memory (singleton per vehicle)
const agentCache = new Map<string, VehicleAgent>();

function getAgent(vehicleId: string, personality: string): VehicleAgent {
  if (!agentCache.has(vehicleId)) {
    agentCache.set(vehicleId, new VehicleAgent(vehicleId, personality as any));
  }
  return agentCache.get(vehicleId)!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleId, vehicle, zones, environment } = body;

    if (!vehicleId || !vehicle) {
      return NextResponse.json(
        { error: 'Missing required fields: vehicleId, vehicle' },
        { status: 400 }
      );
    }

    // Get vehicle personality from database
    const dbVehicle = db.getVehicle(vehicleId) as any;
    const personality = dbVehicle?.ai_personality || 'balanced';

    // Get agent for this vehicle
    const agent = getAgent(vehicleId, personality);

    // Build decision context
    const context = {
      vehicle: {
        id: vehicle.id,
        name: vehicle.name || `Vehicle ${vehicle.id}`,
        number: vehicle.number || vehicle.id,
        type: vehicle.type,
        status: vehicle.status,
        location: vehicle.location,
        speed: vehicle.speed,
        fuel: vehicle.fuel,
        efficiency: vehicle.efficiency || 85,
        cargo: vehicle.cargo || null,
        routeId: vehicle.routeId
      },
      destination: vehicle.dest_lat && vehicle.dest_lng ? {
        lat: vehicle.dest_lat,
        lng: vehicle.dest_lng
      } : undefined,
      nearbyZones: zones || [],
      environment: environment || {
        weather: 'clear',
        temperature: 28,
        visibility: 10000,
        congestion: 30
      },
      nearbyIncidents: [] // TODO: Calculate nearby incidents
    };

    // Make AI decision
    const decision = await agent.makeDecision(context);

    // Map action to database decision_type
    const actionToType: {[key: string]: string} = {
      'continue': 'route_choice',
      'reroute': 'route_choice',
      'refuel': 'fuel_stop',
      'slow_down': 'speed_adjustment',
      'speed_up': 'speed_adjustment',
      'rest_break': 'rest_break'
    };

    // Log decision to database
    if (decision && decision.action !== 'continue') {
      const logData = {
        vehicleId,
        action: decision.action,
        type: actionToType[decision.action] || 'route_choice',
        reasoning: decision.reasoning || 'No reasoning provided',
        modelName: 'liquid/lfm-2.5-1.2b-thinking:free',
        confidence: decision.confidence || 0.8,
        status: 'executed',
        context: JSON.stringify(context)
      };
      db.logAIDecision(logData);
    }

    return NextResponse.json({
      vehicleId,
      decision: decision?.action || 'continue',
      reasoning: decision?.reasoning || 'No decision made',
      confidence: decision?.confidence || 0.5,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI Decision API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to make AI decision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
