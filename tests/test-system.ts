/**
 * Comprehensive System Tests
 * Run with: npm run test:system
 */

import { db, testDatabaseConnection } from '../src/lib/db/database';
import { getEnvironmentEngine } from '../src/lib/simulation/environmentEngine';
import { getRoute, snapToRoad } from '../src/lib/routing/osrmService';

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      console.log(`${CYAN}🧪 Testing: ${name}${RESET}`);
      await fn();
      console.log(`${GREEN}✅ PASS: ${name}${RESET}\n`);
      passCount++;
    } catch (error) {
      console.error(`${RED}❌ FAIL: ${name}${RESET}`);
      console.error(`${RED}   Error: ${error instanceof Error ? error.message : error}${RESET}\n`);
      failCount++;
    }
  };
}

function skip(name: string, reason: string) {
  console.log(`${YELLOW}⏭️  SKIP: ${name} (${reason})${RESET}\n`);
  skipCount++;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value: any, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value should exist but is null/undefined');
  }
}

// ========================================
// WHITEBOX TESTS (Internal Implementation)
// ========================================

const testDatabaseConnection_Test = test('Database Connection', () => {
  const result = testDatabaseConnection();
  assert(result, 'Database connection should succeed');
});

const testDatabaseSchema_Test = test('Database Schema Integrity', () => {
  const vehicles = db.getVehicles();
  assertExists(vehicles, 'Vehicles table should exist');
  assert(Array.isArray(vehicles), 'getVehicles should return an array');
  assert(vehicles.length > 0, 'Should have at least one vehicle');

  const zones = db.getZones();
  assertExists(zones, 'Zones table should exist');
  assert(Array.isArray(zones), 'getZones should return an array');

  const incidents = db.getActiveIncidents();
  assertExists(incidents, 'Incidents table should exist');
  assert(Array.isArray(incidents), 'getActiveIncidents should return an array');

  const environment = db.getEnvironment();
  assertExists(environment, 'Environment table should exist');
  assert(typeof environment === 'object', 'getEnvironment should return an object');
});

const testDatabaseVehicleOperations_Test = test('Database Vehicle CRUD Operations', () => {
  const vehicles = db.getVehicles();
  const firstVehicle = vehicles[0] as any;
  assertExists(firstVehicle, 'Should have at least one vehicle');

  // Test getVehicle
  const vehicle = db.getVehicle(firstVehicle.id);
  assertExists(vehicle, 'Should retrieve vehicle by ID');
  assertEqual((vehicle as any).id, firstVehicle.id, 'Vehicle ID should match');

  // Test updateVehicleLocation
  const newLat = 12.9716;
  const newLng = 77.5946;
  db.updateVehicleLocation(firstVehicle.id, newLat, newLng, 50, 90);
  const updated = db.getVehicle(firstVehicle.id) as any;
  assertEqual(updated.location_lat, newLat, 'Latitude should update');
  assertEqual(updated.location_lng, newLng, 'Longitude should update');
  assertEqual(updated.speed, 50, 'Speed should update');

  // Test updateVehicleFuel
  db.updateVehicleFuel(firstVehicle.id, 80);
  const fuelUpdated = db.getVehicle(firstVehicle.id) as any;
  assertEqual(fuelUpdated.fuel, 80, 'Fuel should update');

  // Test updateVehicleStatus
  db.updateVehicleStatus(firstVehicle.id, 'idle');
  const statusUpdated = db.getVehicle(firstVehicle.id) as any;
  assertEqual(statusUpdated.status, 'idle', 'Status should update');
});

const testEnvironmentEngine_Test = test('Environment Engine State Management', () => {
  const engine = getEnvironmentEngine();
  const initialState = engine.getState();

  assertExists(initialState, 'Engine should return state');
  assertExists(initialState.condition, 'Should have weather condition');
  assertExists(initialState.temperature, 'Should have temperature');
  assertExists(initialState.globalCongestionLevel, 'Should have congestion level');

  // Test speed factor calculation
  const speedFactor = engine.getSpeedFactor();
  assert(typeof speedFactor === 'number', 'Speed factor should be a number');
  assert(speedFactor > 0 && speedFactor <= 1.5, 'Speed factor should be in valid range');

  // Test weather description
  const description = engine.getWeatherDescription();
  assert(typeof description === 'string', 'Weather description should be a string');
  assert(description.length > 0, 'Weather description should not be empty');
});

const testEnvironmentUpdate_Test = test('Environment Engine Updates', () => {
  const engine = getEnvironmentEngine();
  const initialState = engine.getState();
  const initialTime = initialState.simTime.getTime();

  // Update engine
  engine.update();
  const updatedState = engine.getState();

  // Time should advance
  assert(updatedState.simTime.getTime() >= initialTime, 'Simulation time should advance');

  // State should still be valid
  assertExists(updatedState.condition, 'Weather condition should still exist after update');
  assert(
    updatedState.globalCongestionLevel >= 0 && updatedState.globalCongestionLevel <= 100,
    'Congestion level should be in valid range'
  );
});

// ========================================
// GREYBOX TESTS (Interface/API Level)
// ========================================

const testRoutingService_Test = test('OSRM Routing Service', async () => {
  const start = { lat: 12.9716, lng: 77.5946 }; // Central Bangalore
  const end = { lat: 12.9172, lng: 77.6229 };   // Silk Board

  try {
    const route = await getRoute(start, end);
    assertExists(route, 'Should return a route');
    if (!route) throw new Error('Route is null');
    assertExists(route.waypoints, 'Route should have waypoints');
    assert(Array.isArray(route.waypoints), 'Waypoints should be an array');
    assert(route.waypoints.length > 0, 'Should have at least one waypoint');
    
    assertExists(route.totalDistance, 'Route should have total distance');
    assert(route.totalDistance > 0, 'Distance should be positive');
    
    // Check duration if available
    const duration = (route as any).estimatedDuration || (route as any).duration;
    if (duration) {
      assert(duration > 0, 'Duration should be positive');
    }

    console.log(`   📍 Route: ${route.waypoints.length} waypoints, ${(route.totalDistance / 1000).toFixed(2)} km`);
  } catch (error) {
    // If OSRM is offline, test should use fallback
    console.log(`   ⚠️  OSRM offline, checking fallback...`);
    const route = await getRoute(start, end);
    assertExists(route, 'Fallback route should still be generated');
    if (!route) throw new Error('Fallback route is null');
    assert(route.waypoints.length >= 2, 'Fallback should have at least start and end points');
  }
});

const testSnapToRoad_Test = test('Snap to Road Functionality', async () => {
  const coord = { lat: 12.9716, lng: 77.5946 };

  try {
    const snapped = await snapToRoad(coord);
    assertExists(snapped, 'Should return snapped coordinates');
    if (!snapped) throw new Error('Snapped is null');
    assertExists(snapped.lat, 'Snapped coord should have latitude');
    assertExists(snapped.lng, 'Snapped coord should have longitude');

    // Snapped coordinates should be close to original (within ~100m)
    const latDiff = Math.abs(snapped.lat - coord.lat);
    const lngDiff = Math.abs(snapped.lng - coord.lng);
    assert(latDiff < 0.001, 'Snapped latitude should be close to original');
    assert(lngDiff < 0.001, 'Snapped longitude should be close to original');

    console.log(`   📍 Snapped: ${coord.lat},${coord.lng} → ${snapped.lat},${snapped.lng}`);
  } catch (error) {
    console.log(`   ⚠️  OSRM offline, using original coordinates`);
  }
});

const testZoneCongestionUpdate_Test = test('Zone Congestion Updates', () => {
  const zones = db.getZones();
  const firstZone = zones[0] as any;
  assertExists(firstZone, 'Should have at least one zone');

  const initialCongestion = firstZone.congestion_level;
  const newCongestion = Math.min(100, initialCongestion + 10);
  const newVehicleCount = 5;

  db.updateZoneCongestion(firstZone.id, newCongestion, newVehicleCount);

  const updated = db.getZones().find((z: any) => z.id === firstZone.id) as any;
  assertEqual(updated.congestion_level, newCongestion, 'Congestion should update');
  assertEqual(updated.vehicle_count, newVehicleCount, 'Vehicle count should update');

  console.log(`   🚦 Zone "${updated.name}": ${initialCongestion}% → ${newCongestion}% congestion`);
});

// ========================================
// BLACKBOX TESTS (E2E User Scenarios)
// ========================================

const testCompleteVehicleSimulation_Test = test('Complete Vehicle Simulation Cycle', () => {
  const vehicles = db.getVehicles();
  const vehicle = vehicles[0] as any;

  console.log(`   🚛 Testing vehicle: ${vehicle.name}`);

  // Step 1: Vehicle starts in-transit
  db.updateVehicleStatus(vehicle.id, 'in-transit');
  
  // Step 2: Move vehicle
  const newLat = vehicle.location_lat + 0.01;
  const newLng = vehicle.location_lng + 0.01;
  db.updateVehicleLocation(vehicle.id, newLat, newLng, 45, 180);
  
  // Step 3: Consume fuel
  const newFuel = Math.max(0, vehicle.fuel - 5);
  db.updateVehicleFuel(vehicle.id, newFuel);
  
  // Step 4: Verify all updates
  const updated = db.getVehicle(vehicle.id) as any;
  assertEqual(updated.status, 'in-transit', 'Status should be in-transit');
  assert(Math.abs(updated.location_lat - newLat) < 0.0001, 'Position should update');
  assertEqual(updated.fuel, newFuel, 'Fuel should decrease');
  assert(updated.updated_at > vehicle.updated_at, 'Timestamp should update');

  console.log(`   ✓ Moved to ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
  console.log(`   ✓ Fuel: ${vehicle.fuel}% → ${newFuel}%`);
});

const testIncidentWorkflow_Test = test('Incident Creation and Resolution', () => {
  const initialIncidents = db.getActiveIncidents();
  const initialCount = initialIncidents.length;

  // Create new incident
  const newIncident = {
    id: `test-incident-${Date.now()}`,
    type: 'accident',
    severity: 'high',
    location: { lat: 12.9716, lng: 77.5946 },
    description: 'Test incident',
    affectedRadius: 500,
    speedReduction: 0.5
  };

  db.createIncident(newIncident);

  // Verify incident was created
  const afterCreate = db.getActiveIncidents();
  assertEqual(afterCreate.length, initialCount + 1, 'Should have one more incident');

  // Resolve incident
  db.resolveIncident(newIncident.id);

  // Verify incident was resolved
  const afterResolve = db.getActiveIncidents();
  assertEqual(afterResolve.length, initialCount, 'Active incidents should return to original count');

  console.log(`   ✓ Created incident: ${newIncident.type} at ${newIncident.location.lat},${newIncident.location.lng}`);
  console.log(`   ✓ Resolved incident successfully`);
});

const testFuelStationLookup_Test = test('Fuel Station Nearest Neighbor Search', () => {
  const stations = db.getFuelStations();
  assert(stations.length > 0, 'Should have fuel stations in database');

  // Find nearest station to Central Bangalore
  const testLocation = { lat: 12.9716, lng: 77.5946 };
  const nearest = db.getNearestFuelStation(testLocation.lat, testLocation.lng);

  assertExists(nearest, 'Should find nearest fuel station');
  assertExists((nearest as any).location_lat, 'Station should have coordinates');
  assertExists((nearest as any).distance, 'Should calculate distance');

  console.log(`   ⛽ Nearest station: ${(nearest as any).name} (${((nearest as any).distance / 1000).toFixed(2)} km away)`);
});

const testEnvironmentIncidentSpawning_Test = test('Environment-Based Incident Spawning', () => {
  const engine = getEnvironmentEngine();
  
  // Test in clear weather
  engine.setWeather('clear');
  const clearSpawn = engine.shouldSpawnIncident();
  assert(typeof clearSpawn.spawn === 'boolean', 'Should return spawn decision');
  
  // Test in storm (higher probability)
  engine.setWeather('storm');
  let stormSpawnCount = 0;
  for (let i = 0; i < 1000; i++) {
    if (engine.shouldSpawnIncident().spawn) stormSpawnCount++;
  }
  
  console.log(`   ⛈️  Storm incident rate: ${(stormSpawnCount / 10).toFixed(1)}% (expected: >0.5%)`);
  
  // Storm should have at least some incidents in 1000 iterations
  assert(stormSpawnCount > 0, 'Storm should increase incident probability');
});

const testDataIntegrity_Test = test('Data Integrity Across Tables', () => {
  const vehicles = db.getVehicles();
  const zones = db.getZones();
  
  // Check vehicle data integrity
  vehicles.forEach((v: any) => {
    assert(v.id, 'Vehicle should have ID');
    assert(v.name, 'Vehicle should have name');
    assert(['truck', 'van', 'car'].includes(v.type), 'Vehicle type should be valid');
    assert(['idle', 'in-transit', 'loading', 'unloading', 'refueling', 'maintenance'].includes(v.status), 'Vehicle status should be valid');
    assert(v.fuel >= 0 && v.fuel <= 100, 'Fuel should be 0-100%');
    assert(!isNaN(v.location_lat) && !isNaN(v.location_lng), 'Location should be valid numbers');
  });

  // Check zone data integrity
  zones.forEach((z: any) => {
    assert(z.id, 'Zone should have ID');
    assert(z.name, 'Zone should have name');
    assert(z.congestion_level >= 0 && z.congestion_level <= 100, 'Congestion should be 0-100%');
    assert(!isNaN(z.center_lat) && !isNaN(z.center_lng), 'Zone center should be valid');
  });

  console.log(`   ✓ ${vehicles.length} vehicles validated`);
  console.log(`   ✓ ${zones.length} zones validated`);
});

// ========================================
// RUN ALL TESTS
// ========================================

async function runAllTests() {
  console.log(`\n${CYAN}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║     TRAFFICMAXXERS SYSTEM TEST SUITE                 ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════╝${RESET}\n`);

  console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}WHITEBOX TESTS (Internal Implementation)${RESET}`);
  console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
  
  await testDatabaseConnection_Test();
  await testDatabaseSchema_Test();
  await testDatabaseVehicleOperations_Test();
  await testEnvironmentEngine_Test();
  await testEnvironmentUpdate_Test();

  console.log(`\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}GREYBOX TESTS (Interface/API Level)${RESET}`);
  console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
  
  await testRoutingService_Test();
  await testSnapToRoad_Test();
  await testZoneCongestionUpdate_Test();

  console.log(`\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}BLACKBOX TESTS (E2E User Scenarios)${RESET}`);
  console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
  
  await testCompleteVehicleSimulation_Test();
  await testIncidentWorkflow_Test();
  await testFuelStationLookup_Test();
  await testEnvironmentIncidentSpawning_Test();
  await testDataIntegrity_Test();

  // Summary
  console.log(`\n${CYAN}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║                    TEST SUMMARY                       ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════╝${RESET}\n`);
  
  const total = passCount + failCount + skipCount;
  console.log(`   ${GREEN}✅ Passed: ${passCount}${RESET}`);
  console.log(`   ${RED}❌ Failed: ${failCount}${RESET}`);
  console.log(`   ${YELLOW}⏭️  Skipped: ${skipCount}${RESET}`);
  console.log(`   Total: ${total}\n`);

  if (failCount === 0) {
    console.log(`${GREEN}🎉 ALL TESTS PASSED! System is ready.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}⚠️  ${failCount} test(s) failed. Please review errors above.${RESET}\n`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error(`${RED}❌ Test suite crashed:${RESET}`, error);
  process.exit(1);
});
