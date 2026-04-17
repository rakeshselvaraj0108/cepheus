-- Seed data for Trafficmaxxers Bangalore simulation
-- Run this after schema.sql

-- Initialize environment
INSERT INTO environment (sim_time, condition, temperature, global_congestion_level, rush_hour)
VALUES (NOW(), 'clear', 28.5, 30, FALSE)
ON CONFLICT DO NOTHING;

-- Fuel stations in key Bangalore locations
INSERT INTO fuel_stations (id, name, location_lat, location_lng, fuel_price, capacity) VALUES
('FS-001', 'Silk Board Fuel Station', 12.9172, 77.6229, 105.50, 4),
('FS-002', 'Electronic City Petrol Pump', 12.8456, 77.6603, 103.20, 6),
('FS-003', 'Whitefield Highway Fuel', 12.9698, 77.7499, 106.80, 5),
('FS-004', 'Bannerghatta Road Station', 12.8930, 77.5960, 104.50, 3),
('FS-005', 'Hebbal Flyover Fuel', 13.0358, 77.5970, 107.20, 4),
('FS-006', 'Airport Road Petrol', 13.1986, 77.7066, 108.90, 5)
ON CONFLICT (id) DO NOTHING;

-- Traffic zones (major areas in Bangalore)
INSERT INTO zones (id, name, center_lat, center_lng, radius_meters, congestion_level, avg_speed, zone_type) VALUES
('ZONE-SILK', 'Silk Board Junction', 12.9172, 77.6229, 1500, 75, 18, 'urban'),
('ZONE-ECITY', 'Electronic City', 12.8456, 77.6603, 2000, 45, 35, 'industrial'),
('ZONE-WHITE', 'Whitefield', 12.9698, 77.7499, 2500, 50, 32, 'commercial'),
('ZONE-KORAM', 'Koramangala', 12.9279, 77.6271, 1200, 65, 22, 'commercial'),
('ZONE-INDIRA', 'Indiranagar', 12.9719, 77.6412, 1300, 60, 25, 'residential'),
('ZONE-JAYNR', 'Jayanagar', 12.9250, 77.5838, 1800, 55, 28, 'residential'),
('ZONE-MGRD', 'MG Road', 12.9750, 77.6060, 1000, 70, 20, 'commercial'),
('ZONE-MALYA', 'Malleshwaram', 13.0030, 77.5710, 1500, 50, 30, 'residential'),
('ZONE-HEBBL', 'Hebbal', 13.0358, 77.5970, 1600, 60, 26, 'urban'),
('ZONE-YSHPT', 'Yeshwanthpur', 13.0280, 77.5385, 1400, 55, 28, 'industrial'),
('ZONE-BTMLY', 'BTM Layout', 12.9165, 77.6101, 1300, 65, 23, 'residential'),
('ZONE-AIRPT', 'Kempegowda Airport', 13.1986, 77.7066, 3000, 25, 60, 'highway')
ON CONFLICT (id) DO NOTHING;

-- Initial vehicle fleet (10 vehicles between high-traffic areas for demo)
INSERT INTO vehicles (id, name, type, status, location_lat, location_lng, destination_lat, destination_lng, fuel, cargo_capacity, ai_personality, heading, speed) VALUES
-- Route: Koramangala (High) → Whitefield (High)
('DEMO-001', 'Koramangala Express', 'truck', 'in-transit', 12.9279, 77.6271, 12.9698, 77.7499, 85, 15000, 'efficient', 75, 28),
-- Route: Whitefield (High) → Hebbal (High)
('DEMO-002', 'Whitefield Hauler', 'truck', 'in-transit', 12.9698, 77.7499, 13.0358, 77.5970, 72, 18000, 'balanced', 320, 32),
-- Route: M.G. Road (High) → Indiranagar (High)
('DEMO-003', 'MG Road Transporter', 'van', 'in-transit', 12.9750, 77.6060, 12.9719, 77.6412, 90, 3500, 'aggressive', 65, 42),
-- Route: Silk Board (Congested) → Koramangala (High)
('DEMO-004', 'Silk Board Carrier', 'truck', 'in-transit', 12.9172, 77.6229, 12.9279, 77.6271, 68, 16000, 'cautious', 30, 22),
-- Route: Indiranagar (High) → M.G. Road (High)
('DEMO-005', 'Indiranagar Swift', 'car', 'in-transit', 12.9719, 77.6412, 12.9750, 77.6060, 95, 500, 'aggressive', 250, 55),
-- Route: Hebbal (High) → Jayanagar (High)
('DEMO-006', 'Hebbal Long Haul', 'truck', 'in-transit', 13.0358, 77.5970, 12.9250, 77.5838, 55, 20000, 'efficient', 180, 35),
-- Route: Jayanagar (High) → Electronic City (Medium)
('DEMO-007', 'Jayanagar Runner', 'van', 'in-transit', 12.9250, 77.5838, 12.8456, 77.6603, 78, 3200, 'balanced', 135, 38),
-- Route: Electronic City → Silk Board (Congested)
('DEMO-008', 'E-City Shuttle', 'van', 'in-transit', 12.8456, 77.6603, 12.9172, 77.6229, 82, 3000, 'cautious', 350, 30),
-- Route: Koramangala (High) → M.G. Road (High)
('DEMO-009', 'Koramangala Courier', 'car', 'in-transit', 12.9279, 77.6271, 12.9750, 77.6060, 88, 480, 'aggressive', 315, 48),
-- Route: Whitefield (High) → Indiranagar (High)
('DEMO-010', 'Tech Park Express', 'car', 'in-transit', 12.9698, 77.7499, 12.9719, 77.6412, 75, 520, 'balanced', 280, 52)
ON CONFLICT (id) DO NOTHING;

-- Initial incidents (realistic Bangalore traffic scenarios)
INSERT INTO incidents (id, type, severity, location_lat, location_lng, affected_radius_meters, status, description, speed_reduction_factor) VALUES
('INC-001', 'accident', 'high', 12.9172, 77.6229, 800, 'active', 'Multi-vehicle collision at Silk Board Junction, 2 lanes blocked', 0.3),
('INC-002', 'construction', 'medium', 12.9750, 77.6060, 500, 'active', 'Metro construction work on MG Road, single lane traffic', 0.6),
('INC-003', 'congestion', 'low', 13.0358, 77.5970, 600, 'active', 'Heavy traffic near Hebbal Flyover during evening hours', 0.7)
ON CONFLICT (id) DO NOTHING;

-- Update zone vehicle counts (initial)
UPDATE zones SET vehicle_count = (
    SELECT COUNT(*) FROM vehicles v 
    WHERE SQRT(POWER((v.location_lat - zones.center_lat) * 111000, 2) + 
               POWER((v.location_lng - zones.center_lng) * 111000, 2)) < zones.radius_meters
);
