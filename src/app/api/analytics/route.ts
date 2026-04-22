import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import Database from 'better-sqlite3';

function getDbInstance() {
  return new Database(process.env.DATABASE_PATH || './trafficmaxxers.db');
}

export async function GET(request: NextRequest) {
  try {
    const vehicles = db.getVehicles() as any[];
    const zones = db.getZones() as any[];
    const incidents = db.getActiveIncidents() as any[];
    const fuelStations = db.getFuelStations() as any[];

    // --- FLEET STATISTICS (Real from DB) ---
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'in-transit').length;
    const idleVehicles = vehicles.filter(v => v.status === 'idle').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

    const truckCount = vehicles.filter(v => v.type === 'truck').length;
    const vanCount = vehicles.filter(v => v.type === 'van').length;
    const carCount = vehicles.filter(v => v.type === 'car').length;

    // --- FUEL ANALYTICS (Real from DB) ---
    const avgFuel = vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + (v.fuel || 0), 0) / vehicles.length
      : 0;
    const lowFuelVehicles = vehicles.filter(v => v.fuel < 20).length;
    const criticalFuelVehicles = vehicles.filter(v => v.fuel < 5).length;
    const totalFuelConsumed = vehicles.reduce((sum, v) => sum + (100 - (v.fuel || 100)), 0);

    // Fuel cost estimation (₹105/L, efficiency varies by type)
    const fuelCostByVehicle = vehicles.map(v => {
      const consumed = 100 - (v.fuel || 100); // % consumed
      const tankLiters = v.type === 'truck' ? 400 : v.type === 'van' ? 60 : 45;
      const litersUsed = (consumed / 100) * tankLiters;
      return { id: v.id, name: v.name, type: v.type, litersUsed, cost: litersUsed * 105 };
    });
    const totalFuelCost = fuelCostByVehicle.reduce((sum, v) => sum + v.cost, 0);

    // --- ZONE CONGESTION ANALYTICS (Real from DB) ---
    const zoneCongestionData = zones.map(z => ({
      name: z.name,
      congestion: z.congestion_level || 0,
      vehicleCount: z.vehicle_count || 0,
    }));
    const avgCongestion = zones.length > 0
      ? zones.reduce((sum, z) => sum + (z.congestion_level || 0), 0) / zones.length
      : 0;
    const redZones = zones.filter(z => (z.congestion_level || 0) >= 80).length;
    const yellowZones = zones.filter(z => (z.congestion_level || 0) >= 50 && (z.congestion_level || 0) < 80).length;
    const greenZones = zones.filter(z => (z.congestion_level || 0) < 50).length;

    // --- ROUTE ANALYTICS (Real from DB) ---
    const vehiclesWithRoutes = vehicles.filter(v => v.current_route_json);
    let totalRouteDistance = 0;
    let totalRouteTime = 0;
    let routeCount = 0;

    for (const v of vehiclesWithRoutes) {
      try {
        const route = JSON.parse(v.current_route_json);
        if (route.totalDistance) totalRouteDistance += route.totalDistance;
        if (route.totalDuration) totalRouteTime += route.totalDuration;
        routeCount++;
      } catch (e) {}
    }

    // --- SPEED ANALYTICS (Real from DB) ---
    const movingVehicles = vehicles.filter(v => v.speed > 0);
    const avgSpeed = movingVehicles.length > 0
      ? movingVehicles.reduce((sum, v) => sum + v.speed, 0) / movingVehicles.length
      : 0;
    const maxSpeed = vehicles.reduce((max, v) => Math.max(max, v.speed || 0), 0);

    const speedDistribution = {
      stopped: vehicles.filter(v => (v.speed || 0) === 0).length,
      slow: vehicles.filter(v => v.speed > 0 && v.speed <= 20).length,
      moderate: vehicles.filter(v => v.speed > 20 && v.speed <= 50).length,
      fast: vehicles.filter(v => v.speed > 50).length,
    };

    // --- AI DECISIONS ANALYTICS (Real from DB) ---
    let aiDecisionStats = { total: 0, reroute: 0, continue_action: 0, slow_down: 0, speed_up: 0, refuel: 0, rest_break: 0 };
    try {
      const dbInst = getDbInstance();
      const decisionCounts = dbInst.prepare(`
        SELECT decision_type, COUNT(*) as count FROM ai_decisions GROUP BY decision_type
      `).all() as any[];
      
      for (const row of decisionCounts) {
        aiDecisionStats.total += row.count;
        if (row.decision_type === 'reroute') aiDecisionStats.reroute = row.count;
        else if (row.decision_type === 'continue') aiDecisionStats.continue_action = row.count;
        else if (row.decision_type === 'slow_down') aiDecisionStats.slow_down = row.count;
        else if (row.decision_type === 'speed_up') aiDecisionStats.speed_up = row.count;
        else if (row.decision_type === 'refuel') aiDecisionStats.refuel = row.count;
        else if (row.decision_type === 'rest_break') aiDecisionStats.rest_break = row.count;
      }

      // Get avg confidence
      const confResult = dbInst.prepare(`SELECT AVG(confidence) as avg_conf FROM ai_decisions WHERE confidence IS NOT NULL`).get() as any;
      (aiDecisionStats as any).avgConfidence = confResult?.avg_conf || 0;
      
      dbInst.close();
    } catch (e) {
      console.warn('AI decisions table query failed:', e);
    }

    // --- INCIDENT ANALYTICS ---
    const incidentsByType = {
      accident: incidents.filter(i => i.type === 'accident').length,
      roadwork: incidents.filter(i => i.type === 'roadwork').length,
      weather: incidents.filter(i => i.type === 'weather').length,
      other: incidents.filter(i => !['accident', 'roadwork', 'weather'].includes(i.type)).length,
    };
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;

    // --- CO2 SAVINGS ESTIMATION ---
    // Average reroute saves ~2km. 1km = 2.31 kg CO2 for truck. AI reroutes save fuel & CO2.
    const estimatedKmSaved = aiDecisionStats.reroute * 2;
    const co2SavedKg = estimatedKmSaved * 2.31;
    const timeSavedMinutes = aiDecisionStats.reroute * 8; // ~8 min saved per reroute

    // --- FUEL STATION ANALYTICS ---
    const totalStations = fuelStations.length;
    const avgFuelPrice = fuelStations.length > 0
      ? fuelStations.reduce((sum, s: any) => sum + (s.fuel_price || 105), 0) / fuelStations.length
      : 105;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fleet: {
        total: totalVehicles,
        active: activeVehicles,
        idle: idleVehicles,
        maintenance: maintenanceVehicles,
        byType: { truck: truckCount, van: vanCount, car: carCount },
      },
      fuel: {
        averageLevel: Math.round(avgFuel * 10) / 10,
        lowFuelCount: lowFuelVehicles,
        criticalFuelCount: criticalFuelVehicles,
        totalConsumedPercent: Math.round(totalFuelConsumed * 10) / 10,
        totalCostINR: Math.round(totalFuelCost),
        byVehicle: fuelCostByVehicle,
      },
      congestion: {
        average: Math.round(avgCongestion),
        redZones,
        yellowZones,
        greenZones,
        zones: zoneCongestionData,
      },
      routes: {
        activeRoutes: routeCount,
        totalDistanceKm: Math.round(totalRouteDistance / 1000 * 10) / 10,
        totalTimeMins: Math.round(totalRouteTime / 60),
      },
      speed: {
        average: Math.round(avgSpeed * 10) / 10,
        max: Math.round(maxSpeed * 10) / 10,
        distribution: speedDistribution,
      },
      ai: aiDecisionStats,
      incidents: {
        active: incidents.length,
        critical: criticalIncidents,
        byType: incidentsByType,
      },
      impact: {
        co2SavedKg: Math.round(co2SavedKg * 10) / 10,
        timeSavedMinutes,
        estimatedKmSaved,
        fuelSavedLiters: Math.round(estimatedKmSaved / 8 * 10) / 10,
      },
      fuelStations: {
        total: totalStations,
        avgPrice: Math.round(avgFuelPrice * 10) / 10,
      },
    });
  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
