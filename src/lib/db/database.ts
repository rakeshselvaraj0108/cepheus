import Database from 'better-sqlite3';
import path from 'path';

// SQLite database path (local file)
const DB_PATH = path.join(process.cwd(), 'trafficmaxxers.db');

// Global singleton database instance
const globalForDb = globalThis as unknown as {
  simDb: Database.Database | undefined;
};

// Get or create database connection
function getDb(): Database.Database {
  if (!globalForDb.simDb) {
    console.log('🔌 Opening SQLite database:', DB_PATH);
    globalForDb.simDb = new Database(DB_PATH);
    
    // Enable foreign keys
    globalForDb.simDb.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better performance
    globalForDb.simDb.pragma('journal_mode = WAL');
  }
  
  return globalForDb.simDb;
}

// Test database connection
export function testDatabaseConnection(): boolean {
  try {
    const db = getDb();
    const result = db.prepare("SELECT datetime('now') as time, sqlite_version() as version").get() as any;
    console.log('✅ Database connected:', result);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Helper: Check if database is available
export function isDatabaseAvailable(): boolean {
  return true; // SQLite is always available locally
}

// Run migrations (execute schema-sqlite.sql)
export function runMigrations(): void {
  console.log('🔄 Running database migrations...');
  
  try {
    const fs = require('fs');
    const db = getDb();
    
    // Read schema-sqlite.sql
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema-sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute schema (SQLite supports executing multiple statements)
    db.exec(schema);
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run seed data
export function runSeedData(): void {
  console.log('🌱 Seeding database...');
  
  try {
    const fs = require('fs');
    const db = getDb();
    
    // Read seed-sqlite.sql
    const seedPath = path.join(process.cwd(), 'src/lib/db/seed-sqlite.sql');
    const seed = fs.readFileSync(seedPath, 'utf-8');
    
    // Execute seed data
    db.exec(seed);
    
    console.log('✅ Seed data inserted successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Database query helpers
export const db = {
  // Vehicles
  getVehicles() {
    const db = getDb();
    return db.prepare('SELECT * FROM vehicles ORDER BY updated_at DESC').all();
  },
  
  getVehicle(id: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) || null;
  },
  
  updateVehicleLocation(id: string, lat: number, lng: number, speed: number, heading: number) {
    const db = getDb();
    return db.prepare(`
      UPDATE vehicles 
      SET location_lat = ?, 
          location_lng = ?, 
          speed = ?,
          heading = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(lat, lng, speed, heading, id);
  },
  
  updateVehicleFuel(id: string, fuel: number) {
    const db = getDb();
    return db.prepare(`
      UPDATE vehicles 
      SET fuel = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(fuel, id);
  },
  
  updateVehicleStatus(id: string, status: string) {
    const db = getDb();
    return db.prepare(`
      UPDATE vehicles
      SET status = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(status, id);
  },

  updateVehicleDestination(id: string, lat: number, lng: number) {
    const db = getDb();
    return db.prepare(`
      UPDATE vehicles
      SET destination_lat = ?, destination_lng = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(lat, lng, id);
  },

  deleteVehicle(id: string) {
    const db = getDb();
    // Also delete relations
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    db.prepare('DELETE FROM routes WHERE vehicle_id = ?').run(id);
    db.prepare('DELETE FROM ai_decisions WHERE vehicle_id = ?').run(id);
    return true;
  },

  updateVehicleRoutes(id: string, currentRoute: string | null, alternativeRoute: string | null) {
    const db = getDb();
    return db.prepare(`
        UPDATE vehicles
        SET current_route_json = ?, alternative_route_json = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
    `).run(currentRoute, alternativeRoute, id);
  },
  
  // Zones
  getZones() {
    const db = getDb();
    return db.prepare('SELECT * FROM zones ORDER BY name').all();
  },
  
  updateZoneCongestion(id: string, congestionLevel: number, vehicleCount: number) {
    const db = getDb();
    return db.prepare(`
      UPDATE zones 
      SET congestion_level = ?, 
          vehicle_count = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(congestionLevel, vehicleCount, id);
  },
  
  // Incidents
  getActiveIncidents() {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM incidents 
      WHERE status = 'active' 
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        reported_at DESC
    `).all();
  },
  
  createIncident(incident: any) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO incidents (id, type, severity, location_lat, location_lng, affected_radius_meters, description, speed_reduction_factor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incident.id,
      incident.type,
      incident.severity,
      incident.location.lat,
      incident.location.lng,
      incident.affectedRadius || 500,
      incident.description || '',
      incident.speedReduction || 0.7
    );
  },
  
  resolveIncident(id: string) {
    const db = getDb();
    return db.prepare(`
      UPDATE incidents 
      SET status = 'resolved', resolved_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(id);
  },
  
  // Routes
  createRoute(route: any) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO routes (id, vehicle_id, start_lat, start_lng, end_lat, end_lng, waypoints, total_distance_meters, estimated_duration_seconds, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      route.id,
      route.vehicleId,
      route.start.lat,
      route.start.lng,
      route.end.lat,
      route.end.lng,
      JSON.stringify(route.waypoints),
      route.totalDistance,
      route.estimatedDuration
    );
  },
  
  getVehicleRoute(vehicleId: string) {
    const db = getDb();
    const result = db.prepare(`
      SELECT * FROM routes 
      WHERE vehicle_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(vehicleId);
    
    if (result) {
      // Parse JSON waypoints
      (result as any).waypoints = JSON.parse((result as any).waypoints);
    }
    
    return result || null;
  },
  
  // AI Decisions
  logAIDecision(decision: any) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO ai_decisions (vehicle_id, decision_type, context, model_name, prompt, response, decision_taken, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decision.vehicleId,
      decision.action || decision.type || 'unknown',
      JSON.stringify(decision.context || {}),
      decision.modelName || decision.model || 'unknown',
      decision.prompt || '',
      decision.reasoning || decision.response || '',
      decision.action || decision.decision || '',
      decision.confidence || null
    );
  },
  
  getRecentAIDecisions(vehicleId: string, limit: number = 10) {
    const db = getDb();
    const results = db.prepare(`
      SELECT * FROM ai_decisions 
      WHERE vehicle_id = ?
      ORDER BY decided_at DESC
      LIMIT ?
    `).all(vehicleId, limit);
    
    // Parse JSON context
    return results.map((r: any) => ({
      ...r,
      context: JSON.parse(r.context)
    }));
  },
  
  // Environment
  getEnvironment() {
    const db = getDb();
    return db.prepare('SELECT * FROM environment ORDER BY created_at DESC LIMIT 1').get() || null;
  },
  
  updateEnvironment(env: any) {
    const db = getDb();
    return db.prepare(`
      UPDATE environment 
      SET weather_condition = ?,
          temperature = ?,
          visibility = ?,
          simulation_time = ?,
          congestion_level = ?,
          is_rush_hour = ?,
          updated_at = datetime('now')
      WHERE id = (SELECT id FROM environment ORDER BY created_at DESC LIMIT 1)
    `).run(
      env.weather,
      env.temperature,
      env.visibility || 10000,
      env.simulationTime || new Date().toISOString(),
      env.congestionLevel || 30,
      env.rushHour ? 1 : 0
    );
  },
  
  // Fuel Stations
  getFuelStations() {
    const db = getDb();
    return db.prepare('SELECT * FROM fuel_stations WHERE operational = 1').all();
  },
  
  getNearestFuelStation(lat: number, lng: number) {
    const stations = db.getFuelStations();
    
    // Calculate distances and find nearest
    const stationsWithDistance = stations.map((station: any) => {
      const dlat = station.location_lat - lat;
      const dlng = station.location_lng - lng;
      const distance = Math.sqrt(dlat * dlat + dlng * dlng) * 111000; // Rough meters
      return { ...station, distance };
    });
    
    stationsWithDistance.sort((a, b) => a.distance - b.distance);
    return stationsWithDistance[0] || null;
  },
  
  // Vehicle History (for analytics)
  recordVehicleHistory(vehicleId: string, data: any) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO vehicle_history (vehicle_id, location_lat, location_lng, speed, fuel, status, zone_id, traffic_congestion, weather_condition)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vehicleId,
      data.lat,
      data.lng,
      data.speed,
      data.fuel,
      data.status,
      data.zoneId || null,
      data.congestion || null,
      data.weather || null
    );
  }
};
