-- Trafficmaxxers Database Schema (SQLite)
-- Local development database using better-sqlite3

-- Vehicles table: Core vehicle data
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('truck', 'car', 'van')),
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'in-transit', 'loading', 'unloading', 'refueling', 'maintenance')),
    
    -- Location data
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    heading REAL DEFAULT 0,
    
    -- Vehicle state
    speed REAL DEFAULT 0,
    fuel REAL DEFAULT 100,
    cargo_weight REAL DEFAULT 0,
    cargo_capacity REAL DEFAULT 5000,
    
    -- Route information
    current_route_id TEXT,
    waypoint_index INTEGER DEFAULT 0,
    destination_lat REAL,
    destination_lng REAL,
    current_route_json TEXT,
    alternative_route_json TEXT,
    
    -- AI agent data
    last_ai_decision INTEGER DEFAULT (strftime('%s', 'now')),
    ai_personality TEXT DEFAULT 'balanced' CHECK (ai_personality IN ('aggressive', 'cautious', 'balanced', 'efficient')),
    
    -- Metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Traffic zones table
CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- Boundary
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    radius_meters INTEGER DEFAULT 1000,
    
    -- Traffic conditions
    congestion_level INTEGER DEFAULT 0 CHECK (congestion_level BETWEEN 0 AND 100),
    avg_speed REAL DEFAULT 40,
    vehicle_count INTEGER DEFAULT 0,
    
    -- Zone attributes
    zone_type TEXT DEFAULT 'urban' CHECK (zone_type IN ('urban', 'highway', 'industrial', 'residential', 'commercial')),
    
    -- Metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('accident', 'construction', 'congestion', 'weather', 'breakdown')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Location
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    affected_radius_meters INTEGER DEFAULT 500,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'reported')),
    description TEXT,
    
    -- Impact
    speed_reduction_factor REAL DEFAULT 0.5,
    
    -- Timestamps
    reported_at INTEGER DEFAULT (strftime('%s', 'now')),
    resolved_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT,
    
    -- Start/End points
    start_lat REAL NOT NULL,
    start_lng REAL NOT NULL,
    end_lat REAL NOT NULL,
    end_lng REAL NOT NULL,
    
    -- Route data (stored as JSON text)
    waypoints TEXT NOT NULL,
    total_distance_meters INTEGER NOT NULL,
    estimated_duration_seconds INTEGER NOT NULL,
    
    -- Route metadata
    route_type TEXT DEFAULT 'fastest' CHECK (route_type IN ('fastest', 'shortest', 'balanced', 'scenic')),
    avoid_tolls INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- AI decisions table
CREATE TABLE IF NOT EXISTS ai_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    
    -- Decision context
    decision_type TEXT NOT NULL CHECK (decision_type IN ('route_choice', 'speed_adjustment', 'fuel_stop', 'incident_response', 'load_balance', 'rest_break')),
    
    -- Input state (JSON text)
    context TEXT NOT NULL,
    
    -- AI model response
    model_name TEXT DEFAULT 'qwen/qwen2.5-72b-instruct',
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    decision_taken TEXT NOT NULL,
    
    -- Outcome
    confidence REAL,
    execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executed', 'failed', 'overridden')),
    
    -- Timestamps
    decided_at INTEGER DEFAULT (strftime('%s', 'now')),
    executed_at INTEGER,
    
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Vehicle history table
CREATE TABLE IF NOT EXISTS vehicle_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    
    -- Snapshot of vehicle state
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    speed REAL NOT NULL,
    fuel REAL NOT NULL,
    status TEXT NOT NULL,
    
    -- Contextual data
    zone_id TEXT,
    traffic_congestion INTEGER,
    weather_condition TEXT,
    
    -- Timestamp
    recorded_at INTEGER DEFAULT (strftime('%s', 'now')),
    
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Environment state table
CREATE TABLE IF NOT EXISTS environment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Weather
    condition TEXT DEFAULT 'clear' CHECK (condition IN ('clear', 'cloudy', 'rain', 'heavy_rain', 'fog', 'storm')),
    temperature REAL,
    visibility_meters INTEGER DEFAULT 10000,
    wind_speed REAL,
    
    -- Time simulation
    sim_time INTEGER NOT NULL,
    time_multiplier REAL DEFAULT 1.0,
    
    -- Global traffic state
    global_congestion_level INTEGER DEFAULT 20 CHECK (global_congestion_level BETWEEN 0 AND 100),
    rush_hour INTEGER DEFAULT 0,
    
    -- Metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Fuel stations table
CREATE TABLE IF NOT EXISTS fuel_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- Location
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    
    -- Station attributes
    fuel_price REAL DEFAULT 100.0,
    capacity INTEGER DEFAULT 5,
    current_queue INTEGER DEFAULT 0,
    
    -- Status
    operational INTEGER DEFAULT 1,
    
    -- Metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_zones_location ON zones(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_vehicle ON ai_decisions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle ON vehicle_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_time ON vehicle_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_fuel_stations_location ON fuel_stations(location_lat, location_lng);

-- Triggers to update 'updated_at' timestamp automatically
CREATE TRIGGER IF NOT EXISTS update_vehicles_updated_at
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
    UPDATE vehicles SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_zones_updated_at
AFTER UPDATE ON zones
FOR EACH ROW
BEGIN
    UPDATE zones SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_incidents_updated_at
AFTER UPDATE ON incidents
FOR EACH ROW
BEGIN
    UPDATE incidents SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_routes_updated_at
AFTER UPDATE ON routes
FOR EACH ROW
BEGIN
    UPDATE routes SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_environment_updated_at
AFTER UPDATE ON environment
FOR EACH ROW
BEGIN
    UPDATE environment SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_fuel_stations_updated_at
AFTER UPDATE ON fuel_stations
FOR EACH ROW
BEGIN
    UPDATE fuel_stations SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
