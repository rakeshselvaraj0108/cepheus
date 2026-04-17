import axios from 'axios';
import * as turf from '@turf/turf';

// OSRM API base URL (free public instance)
// For production, consider self-hosting OSRM or using a paid service
const OSRM_BASE_URL = 'https://router.project-osrm.org';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  distance: number; // Distance from start in meters
  duration: number; // Duration from start in seconds
  instruction?: string; // Optional turn-by-turn instruction
}

export interface Route {
  waypoints: RouteWaypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  geometry: any; // GeoJSON LineString
  segments?: {
    speed: number;
    distance: number;
    duration: number;
  }[];
}

export interface OSRMRouteOptions {
  alternatives?: boolean; // Get alternative routes
  steps?: boolean; // Get turn-by-turn navigation
  overview?: 'full' | 'simplified' | 'false'; // Geometry detail level
}

/**
 * Get a route between two points using OSRM
 */
export async function getRoute(
  start: Coordinate,
  end: Coordinate,
  options: OSRMRouteOptions = {}
): Promise<Route | null> {
  try {
    const {
      alternatives = false,
      steps = false,
      overview = 'full'
    } = options;

    // Format: lng,lat;lng,lat (OSRM uses lng,lat order!)
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}`;
    const params = {
      alternatives: alternatives ? 'true' : 'false',
      steps: steps ? 'true' : 'false',
      overview,
      geometries: 'geojson',
      annotations: 'speed', // Get speed data for segments
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
      console.error('❌ OSRM routing failed:', response.data);
      return null;
    }

    const route = response.data.routes[0];
    
    // Extract waypoints from geometry
    const waypoints: RouteWaypoint[] = route.geometry.coordinates.map((coord: number[], index: number) => {
      // Calculate cumulative distance and duration
      let cumulativeDistance = 0;
      let cumulativeDuration = 0;

      if (index > 0) {
        const prevCoord = route.geometry.coordinates[index - 1];
        const point1 = turf.point(prevCoord);
        const point2 = turf.point(coord);
        const segmentDistance = turf.distance(point1, point2, { units: 'meters' });
        
        // Estimate duration based on distance and average speed (40 km/h in city)
        const avgSpeed = 40 / 3.6; // m/s
        cumulativeDistance += segmentDistance;
        cumulativeDuration += segmentDistance / avgSpeed;
      }

      return {
        lng: coord[0],
        lat: coord[1],
        distance: cumulativeDistance,
        duration: cumulativeDuration
      };
    });

    // Extract segments speed data if available
    let segments: any[] = [];
    if (route.legs && route.legs[0]?.annotation?.speed) {
       // OSRM returns annotations node-to-node. For N coordinates, there are N-1 segments.
       const speeds = route.legs[0].annotation.speed;
       const dists = route.legs[0].annotation.distance || [];
       const durats = route.legs[0].annotation.duration || [];
       
       segments = speeds.map((speed: number, idx: number) => ({
         speed: speed * 3.6, // Convert m/s to km/h (OSM uses m/s usually, check docs: "speed" is usually m/s)
         distance: dists[idx] || 0,
         duration: durats[idx] || 0
       }));
    }

    return {
      waypoints,
      totalDistance: route.distance, // meters
      totalDuration: route.duration, // seconds
      geometry: route.geometry,
      segments
    };
  } catch (error: any) {
    console.error('❌ OSRM API error:', error.message);
    
    // Fallback: Return straight-line route
    console.log('⚠️ Using fallback straight-line route');
    return getStraightLineRoute(start, end);
  }
}

/**
 * Get multiple alternative routes
 */
export async function getRouteAlternatives(
  start: Coordinate,
  end: Coordinate
): Promise<Route[]> {
  try {
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}`;
    const params = {
      alternatives: 'true',
      overview: 'full',
      geometries: 'geojson'
    };

    const response = await axios.get(url, { params, timeout: 20000 });

    if (response.data.code !== 'Ok' || !response.data.routes) {
      return [];
    }

    return response.data.routes.map((route: any) => ({
      waypoints: route.geometry.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
        distance: 0,
        duration: 0
      })),
      totalDistance: route.distance,
      totalDuration: route.duration,
      geometry: route.geometry
    }));
  } catch (error: any) {
    // Only log warning for timeouts or common connectivity issues to avoid spamming console
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn(`⚠️ OSRM route alternative calc timed out (${error.message}). Skipping.`);
    } else {
      console.error('❌ Failed to get route alternatives:', error.message);
    }
    return [];
  }
}

/**
 * Get nearest road point to snap a coordinate to the road network
 */
export async function snapToRoad(coord: Coordinate): Promise<Coordinate | null> {
  try {
    const url = `${OSRM_BASE_URL}/nearest/v1/driving/${coord.lng},${coord.lat}`;
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data.code !== 'Ok' || !response.data.waypoints || response.data.waypoints.length === 0) {
      return null;
    }

    const snapped = response.data.waypoints[0].location;
    return {
      lng: snapped[0],
      lat: snapped[1]
    };
  } catch (error) {
    console.error('❌ Failed to snap to road:', error);
    return coord; // Return original if snapping fails
  }
}

/**
 * Fallback: Generate straight-line route when OSRM is unavailable
 */
function getStraightLineRoute(start: Coordinate, end: Coordinate): Route {
  const line = turf.lineString([
    [start.lng, start.lat],
    [end.lng, end.lat]
  ]);

  const distance = turf.length(line, { units: 'meters' });
  const avgSpeed = 40 / 3.6; // 40 km/h in m/s
  const duration = distance / avgSpeed;

  // Create intermediate waypoints (every ~500m)
  const numWaypoints = Math.max(2, Math.floor(distance / 500));
  const waypoints: RouteWaypoint[] = [];

  for (let i = 0; i <= numWaypoints; i++) {
    const fraction = i / numWaypoints;
    const point = turf.along(line, distance * fraction / 1000, { units: 'kilometers' });
    
    waypoints.push({
      lng: point.geometry.coordinates[0],
      lat: point.geometry.coordinates[1],
      distance: distance * fraction,
      duration: duration * fraction
    });
  }

  return {
    waypoints,
    totalDistance: distance,
    totalDuration: duration,
    geometry: line.geometry
  };
}

/**
 * Calculate estimated travel time based on current traffic conditions
 */
export function calculateDynamicDuration(
  route: Route,
  congestionFactor: number = 1.0, // 1.0 = normal, 2.0 = twice as slow
  weatherFactor: number = 1.0 // 1.0 = clear, 1.5 = rainy
): number {
  return route.totalDuration * congestionFactor * weatherFactor;
}

/**
 * Interpolate position along route given progress (0 to 1)
 */
export function getPositionOnRoute(route: Route, progress: number): Coordinate {
  // Clamp progress between 0 and 1
  progress = Math.max(0, Math.min(1, progress));

  const targetDistance = route.totalDistance * progress;

  // Find the two waypoints that bracket the target distance
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const wp1 = route.waypoints[i];
    const wp2 = route.waypoints[i + 1];

    if (wp2.distance >= targetDistance) {
      // Interpolate between wp1 and wp2
      const segmentDistance = wp2.distance - wp1.distance;
      const segmentProgress = (targetDistance - wp1.distance) / segmentDistance;

      return {
        lat: wp1.lat + (wp2.lat - wp1.lat) * segmentProgress,
        lng: wp1.lng + (wp2.lng - wp1.lng) * segmentProgress
      };
    }
  }

  // Return last waypoint if we're at the end
  const lastWaypoint = route.waypoints[route.waypoints.length - 1];
  return { lat: lastWaypoint.lat, lng: lastWaypoint.lng };
}

/**
 * Calculate heading/bearing between two coordinates
 */
export function calculateHeading(from: Coordinate, to: Coordinate): number {
  const point1 = turf.point([from.lng, from.lat]);
  const point2 = turf.point([to.lng, to.lat]);
  const bearing = turf.bearing(point1, point2);
  
  // Convert to 0-360 range
  return (bearing + 360) % 360;
}

/**
 * Get all waypoint coordinates for rendering on map
 */
export function getRouteCoordinates(route: Route): Coordinate[] {
  return route.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
}

/**
 * Check if OSRM service is available
 */
export async function testOSRMConnection(): Promise<boolean> {
  try {
    const testCoord: Coordinate = { lat: 12.9716, lng: 77.5946 }; // Bangalore
    const snapped = await snapToRoad(testCoord);
    console.log('✅ OSRM service is available');
    return !!snapped;
  } catch (error) {
    console.error('❌ OSRM service unavailable:', error);
    return false;
  }
}

/**
 * Estimate fuel consumption for a route
 * Returns fuel consumed in percentage
 */
export function estimateFuelConsumption(
  route: Route,
  vehicleType: 'truck' | 'car' | 'van',
  cargoWeight: number = 0 // kg
): number {
  // Fuel efficiency (km per liter)
  const baseEfficiency = {
    truck: 4,  // 4 km/L
    van: 8,    // 8 km/L
    car: 15    // 15 km/L
  };

  const efficiency = baseEfficiency[vehicleType];
  const distanceKm = route.totalDistance / 1000;
  
  // Adjust for cargo weight (heavier = more fuel)
  const weightFactor = 1 + (cargoWeight / 10000); // Every 10 tons adds 100% more fuel
  
  const fuelLiters = (distanceKm / efficiency) * weightFactor;
  
  // Assuming tank capacity
  const tankCapacity = {
    truck: 400,  // 400L
    van: 60,     // 60L
    car: 45      // 45L
  };

  const fuelPercentage = (fuelLiters / tankCapacity[vehicleType]) * 100;
  
  return Math.min(100, fuelPercentage); // Cap at 100%
}
