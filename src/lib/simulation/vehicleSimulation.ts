/**
 * Vehicle Simulation Engine
 * Handles realistic vehicle movement along OSRM routes
 */

import { db } from '../db/database';
import { getRoute, getRouteAlternatives } from '../routing/osrmService';
import { VehicleAgent } from '../ai/vehicleAgent';
import { fetchTrafficIncidents, type TrafficIncident } from '../traffic/freeTrafficService';

interface RoutePoint {
  lat: number;
  lng: number;
}

// Global singleton tracking to prevent duplicate simulation loops during hot-reloads
const globalForSim = globalThis as unknown as {
  simInterval: NodeJS.Timeout | null;
  simInstance: VehicleSimulationEngine | null;
};

class VehicleSimulationEngine {
  public readonly version = 21.5; // v21.5: Persistent congestion state (gradual buildup), Traffic flow patterns (radial/ring roads)
  private isRunning: boolean = false;
  // private intervalId: NodeJS.Timeout | null = null; // Use global instead
  
  // Vehicle routes cache: vehicleId -> { points: [], currentIndex: number }
  private vehicleRoutes: Map<string, { points: RoutePoint[], currentIndex: number, stuckCounter: number, lastLat: number, lastLng: number, originalStart: RoutePoint, originalDest: RoutePoint }> = new Map();
  // AI Agents cache: vehicleId -> VehicleAgent
  private agents: Map<string, VehicleAgent> = new Map();
  
  private instanceId: string = Math.random().toString(36).substring(7);

  constructor() {
     console.log(`🔧 VehicleSimulationEngine constructed (ID: ${this.instanceId})`);
  }

  /**
   * Start the simulation engine (runs server-side)
   */
  start() {
    // IDEMPOTENCY CHECK: If already running and interval exists, do nothing.
    if (this.isRunning && globalForSim.simInterval) {
      return; 
    }

    // Force clear any lingering interval if we got here (e.g. isRunning=false but interval stuck)
    if (globalForSim.simInterval) {
        clearInterval(globalForSim.simInterval);
        globalForSim.simInterval = null;
    }

    this.isRunning = true;
    console.log(`Starting vehicle simulation engine v20 (ID: ${this.instanceId})...`);

    // Update every 300ms (3.3 Hz)
    const id = setInterval(() => {
      this.simulationTick();
    }, 300);
    
    globalForSim.simInterval = id;
  }

  /**
   * Stop the simulation engine
   */
  stop() {
    if (globalForSim.simInterval) {
      clearInterval(globalForSim.simInterval);
      globalForSim.simInterval = null;
    }
    this.isRunning = false;
    console.log(`🛑 Simulation stopped (ID: ${this.instanceId})`);
  }

  /**
   * Main simulation tick - updates all vehicles
   */
  private async simulationTick() {
    try {
      const vehicles = db.getVehicles();
      const transitVehicles = vehicles.filter((v: any) => v.status === 'in-transit');

      if (transitVehicles.length === 0) {
        return; // No vehicles to simulate
      }

      console.log(`🔄 Simulating ${transitVehicles.length} vehicles...`);

      for (const vehicle of transitVehicles) {
        await this.updateVehicle(vehicle);
      }
      
      // Update traffic zones based on vehicle density
      this.updateTrafficZones();

    } catch (error) {
      console.error('❌ Simulation tick error:', error);
    }
  }

  /**
   * Update traffic zones congestion based on current vehicle positions
   */
  private updateTrafficZones() {
    try {
        const vehicles = db.getVehicles() as any[]; // Get fresh locations
        const zones = db.getZones() as any[];
        
        for (const zone of zones) {
           try {
               let count = 0;
               let zLat: number = 0;
               let zLng: number = 0;
               
               // Robust Zone Location Parsing
               if ((zone as any).center_lat != null && (zone as any).center_lng != null) {
                   zLat = Number((zone as any).center_lat);
                   zLng = Number((zone as any).center_lng);
               } else if (typeof zone.location === 'string') {
                   const loc = JSON.parse(zone.location);
                   zLat = Number(loc.lat); zLng = Number(loc.lng);
               } else if (zone.location && typeof zone.location === 'object') {
                   zLat = Number(zone.location.lat); zLng = Number(zone.location.lng);
               }
               
               // Skip if coordinates are invalid
               if (!zLat || !zLng || isNaN(zLat) || isNaN(zLng)) continue;
               
               // Count vehicles within 1km (approx 0.01 deg)
               for (const v of vehicles) {
                   if (v.status === 'in-transit') {
                       const d = Math.sqrt(Math.pow(v.location_lat - zLat, 2) + Math.pow(v.location_lng - zLng, 2));
                       if (d < 0.01) count++;
                   }
               }
               
               // Update zone with BASELINE + Vehicle Count + Time Variation
               // Baseline: Every zone has 20-50% congestion naturally
               let baseCongestion = 20 + Math.random() * 30;
               
               // Add vehicle-based congestion on top
               let vehicleCongestion = 0;
               if (count > 5) vehicleCongestion = 40;
               else if (count > 2) vehicleCongestion = 25;
               else if (count > 0) vehicleCongestion = 10;
               
               // Time-based variation (simulate rush hour waves)
               const hour = new Date().getHours();
               let rushFactor = 0;
               if (hour >= 8 && hour <= 10) rushFactor = 20; // Morning rush
               else if (hour >= 17 && hour <= 19) rushFactor = 20; // Evening rush
               
               // Random variation for demo realism
               const randomNoise = Math.random() * 20 - 10;
               
               let congestion = baseCongestion + vehicleCongestion + rushFactor + randomNoise;
               congestion = Math.min(100, Math.max(15, congestion));
               
               db.updateZoneCongestion(zone.id, Math.round(congestion), count);
           
           } catch (e) { continue; }
        }

    } catch (error) {
      console.error('❌ Simulation tick error:', error);
    }
  }

  /**
   * Update a single vehicle's position and state
   */
  private async updateVehicle(vehicle: any) {
    try {
      // console.log(`[DEBUG_START] Updating ${vehicle.id} (${vehicle.name})`);

      // Check if vehicle has route
      if (!this.vehicleRoutes.has(vehicle.id)) {
        // Initialize route from source to destination
        if (!vehicle.destination_lat || !vehicle.destination_lng) {
          console.warn(`⚠️ Vehicle ${vehicle.id} has no destination`);
          return;
        }

        console.log(`🗺️ Calculating optimal route for ${vehicle.name}...`);
        
        // Get traffic conditions first to determine if we need alternatives
        const incidents = await fetchTrafficIncidents();
        // Only consider incidents within 1km, and skip if too many (likely data issue)
        const nearbyIncidents = incidents.length < 20 ? incidents.filter((inc: any) => {
          const dist = this.getDistance(
            vehicle.location_lat, vehicle.location_lng,
            inc.location.lat, inc.location.lng
          );
          return dist < 0.01; // Within ~1km radius
        }) : [];
        
        // Get congested areas from real traffic data (CSV-based)
        const trafficHotspots = (typeof globalThis !== 'undefined' && (globalThis as any).__trafficHotspots) || [];
        const nearbyHotspots = trafficHotspots.filter((hotspot: any) => {
          const dist = this.getDistance(
            vehicle.location_lat, vehicle.location_lng,
            hotspot.lat, hotspot.lng
          );
          // Within ~3km of high congestion = consider it
          return dist < 0.03 && hotspot.severity === 'high';
        });
        
        if (nearbyHotspots.length > 0) {
          console.log(`🔴 ${nearbyHotspots.length} high-congestion areas detected from CSV data - will evaluate alternate routes`);
        }

        const start = { lat: vehicle.location_lat, lng: vehicle.location_lng };
        const end = { lat: vehicle.destination_lat, lng: vehicle.destination_lng };
        let route = null;

        // If there are nearby incidents OR congested hotspots, try to find alternative route
        if (nearbyIncidents.length > 0 || nearbyHotspots.length > 0) {
          console.log(`⚠️ ${nearbyIncidents.length} incidents + ${nearbyHotspots.length} congestion hotspots near route - seeking alternative...`);
          
          try {
            // Get alternative routes
            const alternatives = await getRouteAlternatives(start, end);
            
            if (alternatives && alternatives.length > 0) {
              console.log(`🔍 Evaluating ${alternatives.length} alternative routes...`);
              
              let bestRoute = alternatives[0];
              let minScore = Number.MAX_VALUE;

              for (const altRoute of alternatives) {
                // Base score is duration (lower is better)
                let score = altRoute.totalDuration;
                let incidentImpact = 0;
                let congestionImpact = 0;

                // Check for incident impact on this route
                for (const incident of nearbyIncidents) {
                  const passesIncident = altRoute.waypoints.some((wp: any, idx: number) => {
                    if (idx % 5 !== 0) return false;
                    const d = this.getDistance(wp.lat, wp.lng, incident.location.lat, incident.location.lng);
                    return d < 0.005; // ~500m proximity
                  });

                  if (passesIncident) {
                    const delaySeconds = (incident.delayMinutes || 15) * 60;
                    incidentImpact += delaySeconds;
                  }
                }
                
                // Check for congestion hotspot impact (from CSV data)
                for (const hotspot of nearbyHotspots) {
                  const passesHotspot = altRoute.waypoints.some((wp: any, idx: number) => {
                    if (idx % 5 !== 0) return false;
                    const d = this.getDistance(wp.lat, wp.lng, hotspot.lat, hotspot.lng);
                    return d < 0.01; // ~1km proximity to congestion zone
                  });

                  if (passesHotspot) {
                    // High congestion adds ~10min delay, medium adds ~5min
                    const delaySeconds = hotspot.severity === 'high' ? 600 : 300;
                    congestionImpact += delaySeconds;
                  }
                }

                // Add all impacts to score
                score += incidentImpact + congestionImpact;
                
                // heavy penalty for intersecting incidents makes us prefer clean routes
                if (score < minScore) {
                  minScore = score;
                  bestRoute = altRoute;
                }
              }

              if (bestRoute !== alternatives[0]) {
                console.log(`✅ Identified better alternative route. Requesting approval.`);
                
                // Instead of applying it, we save it and wait for approval
                db.updateVehicleRoutes(vehicle.id, null, JSON.stringify(bestRoute));
                db.updateVehicleStatus(vehicle.id, 'needs_approval');
                
                // Clear active route in memory so it stops moving
                this.vehicleRoutes.delete(vehicle.id);
                return;
              }
              
              // If standard route is still best, we use it directly
               route = bestRoute;
            }
          } catch (err) {
            console.error('Error finding alternatives:', err);
             // FALLBACK if alternatives fail: Just use standard route, don't fallback to straight line yet
          }
        }

        if (!route) {
          route = await getRoute(start, end);
        }

        if (!route || !route.waypoints || route.waypoints.length < 2) {
          console.error(`❌ Failed to get route for ${vehicle.id}`);
          
          // Retry logic or safe fallback
          // If we fail, just try again next tick instead of fallback line which causes jumping
          return; 
          
          /* 
          // OLD FALLBACK - REMOVED TO PREVENT "Jumping back and forth"
          // Fallback: direct line 
          const simpleRoute = { ... }
          */

        } else {
          // Use OSRM waypoints
          this.vehicleRoutes.set(vehicle.id, {
            points: route.waypoints.map((wp: any) => ({ lat: wp.lat, lng: wp.lng })),
            currentIndex: 0,
            stuckCounter: 0,
            lastLat: vehicle.location_lat,
            lastLng: vehicle.location_lng,
            originalStart: { lat: start.lat, lng: start.lng },
            originalDest: { lat: end.lat, lng: end.lng }
          });
          
          // Save valid route to DB
          try {
             db.updateVehicleRoutes(vehicle.id, JSON.stringify(route), null);
          } catch (e) { console.error('Failed to save route to DB', e); }

          console.log(`✅ Route calculated: ${route.waypoints.length} waypoints`);
        }
      }

      // Check for approval state
      if (vehicle.status === 'needs_approval') {
          return; // Do not move
      }

      const routeData = this.vehicleRoutes.get(vehicle.id);
      if (!routeData) {
         // console.warn(`[DEBUG_FAIL] No route data for ${vehicle.id}`);
         return;
      }

      const points = routeData.points;
      let currentIndex = routeData.currentIndex;
      
      // console.log(`[DEBUG_ROUTE] ${vehicle.id}: Points=${points.length}, Idx=${currentIndex}, Status=${vehicle.status}`);

        // Check if we are too far from the start of the calculated route (e.g. drifting)
        // If route[0] is far from vehicle, we might jump.
        if (routeData.points.length > 0) {
            const startDist = this.getDistance(vehicle.location_lat, vehicle.location_lng, routeData.points[0].lat, routeData.points[0].lng);
            if (startDist > 0.05 && currentIndex === 0) { // ~5km drift!
                 // This typically means the vehicle moved while route was calculating, OR route snapped to wrong road.
                 // Force snap or recalculate?
                 // Let's create a temporary connector
                 console.warn(`⚠️ Vehicle ${vehicle.name} drifted from route start. Snapping...`);
                 routeData.points.unshift({ lat: vehicle.location_lat, lng: vehicle.location_lng });
            }
        }

      // Check if journey complete
      if (currentIndex >= points.length - 1) {
        console.log(`🏁 Vehicle ${vehicle.name} reached destination`);
        
        // ALWAYS REFUEL at destination (instant) and clear refueling status
        db.updateVehicleFuel(vehicle.id, 100);
        db.updateVehicleStatus(vehicle.id, 'idle');

        // SHUTTLE A <-> B Logic
        let nextDestLat: number, nextDestLng: number;
        
        // Check if we're at original destination (point B) - if yes, return to start (point A)
        const distToDest = this.getDistance(vehicle.location_lat, vehicle.location_lng, 
                                            routeData.originalDest.lat, routeData.originalDest.lng);
        const distToStart = this.getDistance(vehicle.location_lat, vehicle.location_lng, 
                                             routeData.originalStart.lat, routeData.originalStart.lng);
        
        // 0.01 degrees ≈ 1km
        if (distToDest < 0.01) {
            // We just arrived at B, now go back to A
            console.log(`↩️ [${vehicle.name}] Job Done. Returning to base A...`);
            nextDestLat = routeData.originalStart.lat;
            nextDestLng = routeData.originalStart.lng;
        } else if (distToStart < 0.01) {
            // We just arrived back at A, now go to B again
            console.log(`🔄 [${vehicle.name}] Back at base A. Starting new trip to B...`);
            nextDestLat = routeData.originalDest.lat;
            nextDestLng = routeData.originalDest.lng;
        } else {
            // Unknown location - go back to start
            console.log(`⚠️ [${vehicle.name}] Unknown position. Returning to base...`);
            nextDestLat = routeData.originalStart.lat;
            nextDestLng = routeData.originalStart.lng;
        }

        db.updateVehicleDestination(vehicle.id, nextDestLat, nextDestLng);
        this.vehicleRoutes.delete(vehicle.id);
        return;
      }

      // Calculate realistic speed based on vehicle type and traffic
      const speedMap: Record<string, number> = {
        truck: 40,  // 40 km/h average for trucks
        van: 50,    // 50 km/h average for vans
        car: 60     // 60 km/h average for cars
      };
      const baseSpeed = speedMap[vehicle.type] || 50;

      // Get traffic conditions
      const incidents = await fetchTrafficIncidents();
      
      // Find nearby incidents (simplified)
      let speedFactor = 1.0;
      let inRedZone = false;

      // 1. Check Incidents
      for (const incident of incidents) {
        const dist = this.getDistance(
          vehicle.location_lat, vehicle.location_lng,
          incident.location.lat, incident.location.lng
        );
        if (dist < 0.005) { // Within 500m
          const reductionFactor = Math.min(0.5, incident.delayMinutes / 60);
          speedFactor = Math.min(speedFactor, 1 - reductionFactor);
          // If super slow, flag as Red Zone
          if (speedFactor < 0.4) inRedZone = true;
        }
      }
      
      // 2. Check Area Congestion (Zones)
      if (speedFactor < 0.3) inRedZone = true;

      // RED ZONE LOGIC: "Until it becomes red... gets a different path"
      // Added debounce: Don't reroute if we just started (currentIndex < 5) to avoid instant loops
      // [DISABLED] Disable auto-reroute for stability
      /*
      if (inRedZone && Math.random() < 0.2 && currentIndex > 5) { 
           console.log(`🛑 Vehicle ${vehicle.name} hit RED ZONE (Speed Factor ${speedFactor.toFixed(2)}). Rerouting...`);
           
           // Force route recalculation (which will check for alternatives in updateVehicle init)
           this.vehicleRoutes.delete(vehicle.id);
           
           // IMPORTANT: Update vehicle state to "seeking_alternative" so next route calculation knows to allow alternatives
           // We do this by artificially setting a flag or we rely on the implementation of getRouteAlternatives above
           
           return; 
      }
      */

      // Logic: AI Agent Usage
      let agent = this.agents.get(vehicle.id);
      if (!agent) {
          // Initialize new agent with vehicle's personality
          agent = new VehicleAgent(vehicle.id, (vehicle.ai_personality || 'balanced') as any);
          this.agents.set(vehicle.id, agent);
          console.log(`🤖 AI Agent initialized for ${vehicle.name} (${vehicle.ai_personality})`);
      }

      // Periodically consult AI
      // 50x speed means 1 real second = 50 sim seconds.
      // We want AI to run every ~20 real seconds.
      // So prob = 1/20 = 0.05
      if (Math.random() < 0.05 || (speedFactor < 0.3 && Math.random() < 0.2)) {
         try {
             const decision = await agent.makeDecision({
                 vehicle: vehicle,
                 environment: {
                     weather: 'clear', // TODO: Fetch real weather
                     congestion: Math.round((1 - speedFactor) * 100),
                     globalCongestionLevel: 50, // Mock
                     rushHour: false
                 },
                 nearbyZones: [], // TODO: optimize fetch
                 nearbyIncidents: incidents
             });
             
             // Apply decision (simple overrides)
             if (decision && decision.action === 'slow_down') {
                 speedFactor *= 0.7;
             } else if (decision && decision.action === 'speed_up') {
                 speedFactor = Math.min(1.2, speedFactor * 1.2);
             } else if (decision && decision.action === 'reroute') {
                 // Trigger re-routing in next tick maybe?
                 // For now, let's just log it. The main re-routing logic is handled at start of updateVehicle
             }
             
             // Log AI thought
             // console.log(`🧠 [${vehicle.name}] AI: ${decision.action} because ${decision.reasoning.substring(0, 50)}...p=${decision.priority}`);
             
             // Update DB with last AI decision timestamp
             // db.updateVehicleAIDecision(vehicle.id); 
         } catch (e) {
             console.error('AI decision failed', e);
         }
      }

      // Check intersection with traffic circles (colored dots)
      const trafficCircles = (globalThis as any).__trafficCircles || [];
      let trafficSpeedFactor = 1.0;
      let trafficSeverity = 'green';
      
      if (trafficCircles.length > 0) {
          const CIRCLE_RADIUS_KM = 0.1; // 100m radius per circle
          
          for (const circle of trafficCircles) {
              const R = 6371;
              const dLat = (circle.lat - vehicle.location_lat) * (Math.PI / 180);
              const dLng = (circle.lng - vehicle.location_lng) * (Math.PI / 180);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(vehicle.location_lat * (Math.PI/180)) * Math.cos(circle.lat * (Math.PI/180)) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distKm = R * c;
              
              if (distKm < CIRCLE_RADIUS_KM) {
                  // Vehicle is inside this traffic circle
                  if (circle.severity === 'red' && trafficSpeedFactor > 0.3) {
                      trafficSpeedFactor = 0.3; // Heavy traffic: 70% speed reduction
                      trafficSeverity = 'red';
                  } else if (circle.severity === 'yellow' && trafficSpeedFactor > 0.6) {
                      trafficSpeedFactor = 0.6; // Moderate traffic: 40% speed reduction
                      trafficSeverity = 'yellow';
                  }
              }
          }
      }
      
      // Calculate actual speed (with traffic circle slowdown)
      let actualSpeed = baseSpeed * speedFactor * trafficSpeedFactor;

      // Move vehicle along route
      // v21.4: 0.3s tick, 8x speed (realistic Bangalore traffic), 6 zones with 80-120 dots each, 60% red congestion
      const timeScale = 8; // Reduced from 20x to 8x for realistic city traffic
      const tickDurationHours = 0.3 / 3600;
      let distanceToMoveKm = actualSpeed * tickDurationHours * timeScale;
      const initialMoveDist = distanceToMoveKm; 

      // Initialize current position
      let currentLat = vehicle.location_lat;
      let currentLng = vehicle.location_lng;
      let newHeading = vehicle.heading;
      
      // Safety break for infinite loops with a max iteration count
      let iterations = 0;
      const MAX_ITERATIONS = 100;

      // Iterate through waypoints to consume distance
      while (distanceToMoveKm > 0 && currentIndex < points.length - 1 && iterations < MAX_ITERATIONS) {
        // console.log(`[DEBUG_LOOP] distMove=${distanceToMoveKm}, idx=${currentIndex}, pt=${points[currentIndex].lat},${points[currentIndex].lng} -> ${points[currentIndex+1].lat}`);
        iterations++;
        const next = points[currentIndex + 1];
        
        // Calculate distance to next waypoint in km (Haversine approximation)
        const R = 6371; // Radius of the earth in km
        const dLat = (next.lat - currentLat) * (Math.PI / 180);
        const dLng = (next.lng - currentLng) * (Math.PI / 180);
        
        // Haversine
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(currentLat * (Math.PI/180)) * Math.cos(next.lat * (Math.PI/180)) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distToNextKm = R * c;

        // console.log(`[DEBUG] V=${vehicle.id.slice(-4)} Move=${distanceToMoveKm.toFixed(4)} DistNext=${distToNextKm.toFixed(4)} Idx=${currentIndex} Lat=${currentLat.toFixed(5)}`);

        // If very close to next waypoint or invalid distance, skip to next
        if (distToNextKm <= 0.0001 || isNaN(distToNextKm)) {
          currentIndex++;
          continue;
        }

        if (distanceToMoveKm >= distToNextKm) {
          // We reach and pass this waypoint
          distanceToMoveKm -= distToNextKm;
          currentLat = next.lat;
          currentLng = next.lng;
          currentIndex++;
          
          // Calculate heading for next segment if available
          if (currentIndex < points.length - 1) {
             const nextnext = points[currentIndex + 1];
             const y = Math.sin((nextnext.lng - currentLng) * Math.PI/180) * Math.cos(nextnext.lat * Math.PI/180);
             const x = Math.cos(currentLat * Math.PI/180) * Math.sin(nextnext.lat * Math.PI/180) -
                       Math.sin(currentLat * Math.PI/180) * Math.cos(nextnext.lat * Math.PI/180) * Math.cos((nextnext.lng - currentLng) * Math.PI/180);
             newHeading = Math.atan2(y, x) * 180 / Math.PI;
          }
        } else {
          // We end up between current and next
          // Interpolate
          const fraction = distanceToMoveKm / distToNextKm; // fraction of segment to traverse
          
          // Debugging "Not moving shit"
          // If fraction is tiny (e.g. speed is low relative to segment), we barely move.
          // But if frontend LERP works, it should be fine.
          
          currentLat = currentLat + (next.lat - currentLat) * fraction;
          currentLng = currentLng + (next.lng - currentLng) * fraction;
          
          // Calculate heading for this segment
          const y = Math.sin((next.lng - currentLng) * Math.PI/180) * Math.cos(next.lat * Math.PI/180);
          const x = Math.cos(currentLat * Math.PI/180) * Math.sin(next.lat * Math.PI/180) -
                    Math.sin(currentLat * Math.PI/180) * Math.cos(next.lat * Math.PI/180) * Math.cos((next.lng - currentLng) * Math.PI/180);
          newHeading = Math.atan2(y, x) * 180 / Math.PI;
          
          // Correct negative heading
          newHeading = (newHeading + 360) % 360;
          
          distanceToMoveKm = 0;
        }
      }

      // Track total distance for fuel calc
      const totalMovedKm = initialMoveDist - distanceToMoveKm;
      
      routeData.currentIndex = currentIndex;

      // Update database location
      db.updateVehicleLocation(vehicle.id, currentLat, currentLng, actualSpeed, newHeading);
      
      // STUCK DETECTION Logic (after movement)
      // Enhanced: Red traffic circles trigger faster reroute
      if (routeData.lastLat !== undefined && routeData.lastLng !== undefined) {
          const moveDist = this.getDistance(currentLat, currentLng, routeData.lastLat, routeData.lastLng);
          // If moved less than 50 meters in a tick where we should have moved ~100m+
          if (moveDist < 0.0005) { // ~50m
              // Red traffic: count 3x faster toward stuck threshold
              const incrementFactor = trafficSeverity === 'red' ? 3 : 1;
              routeData.stuckCounter = (routeData.stuckCounter || 0) + incrementFactor;
              
              // User req: "Waits at same place for 5 seconds it reroutes"
              // 5 seconds / 0.3s tick = 16.6 ticks (normal)
              // In red traffic: 17/3 = ~6 ticks before reroute
              if (routeData.stuckCounter >= 17) {
                 console.log(`⚠️ [${vehicle.name}] STUCK for 5s at (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}) [Traffic: ${trafficSeverity}]. Forcing reroute...`);
                 
                 // Force Reroute by deleting active route
                 this.vehicleRoutes.delete(vehicle.id);
                 return;
              }
          } else {
              routeData.stuckCounter = 0;
          }
      }
      // Save current position for next tick's stuck detection
      routeData.lastLat = currentLat;
      routeData.lastLng = currentLng;
      
      // console.log(`[DEBUG_DB] Updated ${vehicle.id}: Lat=${currentLat.toFixed(5)}, Changed=${locRes.changes}`);
      
      // FUEL CONSUMPTION LOGIC (Massive Drain for Hackathon)
      // Base consumption: 20L/km (Extremely high for demo)
      let consumptionRate = 20.0; 
      if (actualSpeed < 20) consumptionRate = 30.0; // Higher when stuck
      
      let fuelConsumed = totalMovedKm * consumptionRate;
      
      // Major "AC/Idling" constant drain
      fuelConsumed += 0.5; 

      if (vehicle.fuel > 0) {
          const newFuel = Math.max(0, vehicle.fuel - fuelConsumed);
          
          if (newFuel < 20 && vehicle.fuel >= 20) {
             // console.warn(`⚠️ Vehicle ${vehicle.name} entered LOW FUEL state`);
          }
          
          // Panic threshold - only trigger if not already refueling
          if (newFuel < 5 && vehicle.status !== 'refueling' && vehicle.status !== 'idle') {
             console.log(`⛽ Vehicle ${vehicle.name} OUT OF FUEL - Marking for refuel`);
             // Don't change status here, let it refuel at next destination
          }

          db.updateVehicleFuel(vehicle.id, newFuel);
      }

      // REROUTING LOGIC (Red Zones)
      // Check if current position is in a highly congested zone (congestion > 80)
      if (Math.random() < 0.1) { // Check occasionally
         const zones = db.getZones();
         const inCongestedZone = zones.some((z: any) => {
             if (z.congestion_level < 80) return false;
             const d = this.getDistance(currentLat, currentLng, z.center_lat, z.center_lng);
             // Assume zone radius ~1km = 0.01 deg
             return d < 0.01;
         });

         if (inCongestedZone) {
             // console.log(`🚨 Vehicle ${vehicle.name} stuck in RED ZONE. Requesting AI Reroute...`);
             // Trigger AI Agent to find new route
             if (agent) {
                 await agent.makeDecision({
                     vehicle,
                     environment: { congestion: 90, weather: 'clear', rushHour: false, globalCongestionLevel: 90 },
                     nearbyZones: [],
                     nearbyIncidents: incidents
                 });
                 // The AI might assign 'reroute'. 
                 // For now, let's force a "Find Alternative" behavior in DB
                 // effectively resetting the route calculation on next tick
                 // [DISABLED] this.vehicleRoutes.delete(vehicle.id); 
             }
         }
      }

    } catch (error) {
      console.error(`❌ Error updating vehicle ${vehicle.id}:`, error);
    }
  }

  /**
   * Calculate distance between two points (in degrees, approximate)
   */
  private getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get simulation status
   */
  getStatus() {
    return {
      running: this.isRunning,
      activeRoutes: this.vehicleRoutes.size
    };
  }
}

// Singleton instance
let engineInstance: VehicleSimulationEngine | null = null;

export function getSimulationEngine(): VehicleSimulationEngine {
  if (globalForSim.simInstance) {
      // Hot-Reload Support: Check version
      if ((globalForSim.simInstance as any).version !== 21.5) {
           console.log(`♻️  Detecting old simulation engine (v${(globalForSim.simInstance as any).version || '?'}). Reloading to v21.5...`);
           try {
             globalForSim.simInstance.stop();
           } catch(e) { console.error("Error stopping old sim:", e); }
           globalForSim.simInstance = new VehicleSimulationEngine();
      }
      return globalForSim.simInstance;
  }
  
  globalForSim.simInstance = new VehicleSimulationEngine();
  engineInstance = globalForSim.simInstance;
  return engineInstance;
}

export function startSimulation() {
  const engine = getSimulationEngine();
  engine.start();
}

export function stopSimulation() {
  if (engineInstance) {
    engineInstance.stop();
  }
}
