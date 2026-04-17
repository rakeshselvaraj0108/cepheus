const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../trafficmaxxers.db');
const db = new Database(dbPath);

console.log('🔄 Migrating database...');

try {
  // 1. Add current_route_json
  try {
    db.prepare('ALTER TABLE vehicles ADD COLUMN current_route_json TEXT').run();
    console.log('✅ Added current_route_json');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.log('ℹ️ current_route_json already exists');
  }

  // 2. Add alternative_route_json
  try {
    db.prepare('ALTER TABLE vehicles ADD COLUMN alternative_route_json TEXT').run();
    console.log('✅ Added alternative_route_json');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.log('ℹ️ alternative_route_json already exists');
  }

  // 3. Relax status check constraint (SQLite usually doesn't strictly enforce old check constraints after data mod unless re-created, but for new data it might)
  // Since we can't easily drop constraints in SQLite, we will rely on application logic validation mostly,
  // or we recreate the table. Recreating is safer.
  
  // Actually, for this dev environment, let's just create a new table and copy data if needed.
  // Or simpler: We just don't enforce the DB check constraint if we can't easily change it, 
  // but if the DB enforces it, we might crash.
  
  // Let's try to disable foreign keys/constraints, rename table, create new, copy data.
  
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  
  // Only recreate if we really need to change the check constraint.
  // Let's assume the user wants this done properly.
  
  if (vehicles.length > 0 && !vehicles[0].alternative_route_json) {
      console.log('♻️ Recreating vehicles table to update constraints...');
      
      db.exec('DROP TABLE IF EXISTS vehicles_temp');
      db.exec('ALTER TABLE vehicles RENAME TO vehicles_temp');
      
      db.exec(`
        CREATE TABLE vehicles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('truck', 'car', 'van')),
            status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'in-transit', 'loading', 'unloading', 'refueling', 'maintenance', 'needs_approval')),
            location_lat REAL NOT NULL,
            location_lng REAL NOT NULL,
            heading REAL DEFAULT 0,
            speed REAL DEFAULT 0,
            fuel REAL DEFAULT 100,
            cargo_weight REAL DEFAULT 0,
            cargo_capacity REAL DEFAULT 5000,
            current_route_id TEXT,
            waypoint_index INTEGER DEFAULT 0,
            destination_lat REAL,
            destination_lng REAL,
            last_ai_decision INTEGER DEFAULT (strftime('%s', 'now')),
            ai_personality TEXT DEFAULT 'balanced' CHECK (ai_personality IN ('aggressive', 'cautious', 'balanced', 'efficient')),
            current_route_json TEXT,
            alternative_route_json TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);
      
      const insert = db.prepare(`
        INSERT INTO vehicles (
            id, name, type, status, location_lat, location_lng, heading, speed, fuel, 
            cargo_weight, cargo_capacity, current_route_id, waypoint_index, 
            destination_lat, destination_lng, last_ai_decision, ai_personality, 
            created_at, updated_at
        ) VALUES (
            @id, @name, @type, @status, @location_lat, @location_lng, @heading, @speed, @fuel,
            @cargo_weight, @cargo_capacity, @current_route_id, @waypoint_index,
            @destination_lat, @destination_lng, @last_ai_decision, @ai_personality,
            @created_at, @updated_at
        )
      `);
      
      const updateStatus = db.transaction((rows) => {
        for (const row of rows) insert.run(row);
      });
      
      updateStatus(vehicles);
      
      // Cleanup
      db.exec('DROP TABLE vehicles_temp');
      console.log('✅ Table vehicles recreated successfully');
  }

} catch (error) {
  console.error('❌ Migration failed:', error);
}

console.log('🏁 Migration complete.');
