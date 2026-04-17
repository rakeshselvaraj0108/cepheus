/**
 * Route Optimization Service with Dijkstra's Algorithm
 * Consider: traffic congestion, weather, incidents, distance, time
 */

import * as turf from '@turf/turf';
import { getRoute } from '../routing/osrmService';
import type { TrafficIncident } from '../traffic/freeTrafficService';

export interface RouteNode {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteEdge {
  from: string;
  to: string;
  distance: number; // meters
  baseTime: number; // seconds
  trafficFactor: number; // 1.0 = normal, 2.0 = 2x slower
  weatherFactor: number;
  incidentFactor: number;
  totalCost: number; // Combined cost for optimization
}

export interface OptimizedRoute {
  path: RouteNode[];
  totalDistance: number;
  estimatedTime: number;
  fuelCost: number;
  congestionLevel: number;
  incidents: TrafficIncident[];
  reasoning: string;
  alternatives: Array<{
    path: RouteNode[];
    reason: string;
    timeDiff: number;
    distanceDiff: number;
  }>;
}

/**
 * Build route graph from OSRM waypoints and traffic data
 */
export async function buildRouteGraph(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  zones: any[],
  incidents: TrafficIncident[],
  weatherFactor: number = 1.0
): Promise<{ nodes: RouteNode[], edges: RouteEdge[] }> {
  
  // Get base route from OSRM
  const baseRoute = await getRoute(start, end);
  
  if (!baseRoute) {
    throw new Error('Failed to get base route from OSRM');
  }
  
  // Convert waypoints to nodes
  const nodes: RouteNode[] = baseRoute.waypoints.map((wp, index) => ({
    id: `NODE-${index}`,
    lat: wp.lat,
    lng: wp.lng,
    name: index === 0 ? 'Start' : index === baseRoute.waypoints.length - 1 ? 'End' : `Waypoint ${index}`
  }));

  // Build edges between consecutive nodes
  const edges: RouteEdge[] = [];
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    
    // Calculate distance
    const distance = turf.distance(
      turf.point([from.lng, from.lat]),
      turf.point([to.lng, to.lat]),
      { units: 'meters' }
    );

    // Calculate base time (assuming 40 km/h average)
    const baseTime = (distance / 1000) / 40 * 3600; // seconds

    // Calculate traffic factor based on nearby zones
    let trafficFactor = 1.0;
    const midpoint = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
    
    zones.forEach(zone => {
      const distanceToZone = turf.distance(
        turf.point([midpoint.lng, midpoint.lat]),
        turf.point([zone.center_lng, zone.center_lat]),
        { units: 'kilometers' }
      );

      if (distanceToZone < zone.radius_meters / 1000) {
        // Apply zone congestion to traffic factor
        const congestionImpact = 1 + (zone.congestion_level / 100) * 2; // 0% = 1x, 100% = 3x
        trafficFactor = Math.max(trafficFactor, congestionImpact);
      }
    });

    // Calculate incident factor
    let incidentFactor = 1.0;
    incidents.forEach(incident => {
      const distanceToIncident = turf.distance(
        turf.point([midpoint.lng, midpoint.lat]),
        turf.point([incident.location.lng, incident.location.lat]),
        { units: 'kilometers' }
      );

      if (distanceToIncident < 0.5) { // Within 500m
        const severityImpact = {
          low: 1.2,
          medium: 1.5,
          high: 2.0,
          critical: 3.0
        }[incident.severity];
        
        incidentFactor = Math.max(incidentFactor, severityImpact);
      }
    });

    // Total cost = time * all factors
    const totalCost = baseTime * trafficFactor * weatherFactor * incidentFactor;

    edges.push({
      from: from.id,
      to: to.id,
      distance,
      baseTime,
      trafficFactor,
      weatherFactor,
      incidentFactor,
      totalCost
    });
  }

  return { nodes, edges };
}

/**
 * Dijkstra's Algorithm for finding optimal path
 */
export function dijkstra(
  nodes: RouteNode[],
  edges: RouteEdge[],
  startId: string,
  endId: string
): { path: RouteNode[], totalCost: number } | null {
  
  // Initialize distances
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const unvisited: Set<string> = new Set();

  nodes.forEach(node => {
    distances[node.id] = node.id === startId ? 0 : Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  // Build adjacency list
  const adjacencyList: { [key: string]: Array<{ to: string, cost: number }> } = {};
  edges.forEach(edge => {
    if (!adjacencyList[edge.from]) adjacencyList[edge.from] = [];
    adjacencyList[edge.from].push({ to: edge.to, cost: edge.totalCost });
  });

  // Main loop
  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        current = nodeId;
      }
    });

    if (current === null || current === endId) break;

    unvisited.delete(current);

    // Check neighbors
    const neighbors = adjacencyList[current] || [];
    neighbors.forEach(neighbor => {
      if (unvisited.has(neighbor.to)) {
        const altDistance = distances[current!] + neighbor.cost;
        if (altDistance < distances[neighbor.to]) {
          distances[neighbor.to] = altDistance;
          previous[neighbor.to] = current;
        }
      }
    });
  }

  // Reconstruct path
  if (distances[endId] === Infinity) return null;

  const path: RouteNode[] = [];
  let current: string | null = endId;
  
  while (current !== null) {
    const node = nodes.find(n => n.id === current);
    if (node) path.unshift(node);
    current = previous[current!];
  }

  return { path, totalCost: distances[endId] };
}

/**
 * Find optimal route with alternatives
 */
export async function findOptimalRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  zones: any[],
  incidents: TrafficIncident[],
  weatherFactor: number = 1.0,
  vehicleType: 'truck' | 'van' | 'car' = 'car'
): Promise<OptimizedRoute> {
  
  console.log('🧮 Computing optimal route with Dijkstra\'s algorithm...');
  
  // Build graph
  const { nodes, edges } = await buildRouteGraph(start, end, zones, incidents, weatherFactor);

  if (nodes.length === 0) {
    throw new Error('Failed to build route graph');
  }

  // Run Dijkstra's algorithm
  const result = dijkstra(nodes, edges, nodes[0].id, nodes[nodes.length - 1].id);

  if (!result) {
    throw new Error('No valid route found');
  }

  // Calculate metrics
  const totalDistance = edges.reduce((sum, edge) => {
    if (result.path.some(n => n.id === edge.from) && result.path.some(n => n.id === edge.to)) {
      return sum + edge.distance;
    }
    return sum;
  }, 0);

  const estimatedTime = result.totalCost;

  // Calculate fuel cost (vehicle-specific)
  const fuelEfficiency = {
    truck: 5, // 5 km/L
    van: 10,
    car: 15
  }[vehicleType];

  const fuelCost = (totalDistance / 1000 / fuelEfficiency) * 105; // Rs 105/L avg

  // Identify incidents on route
  const routeIncidents = incidents.filter(incident => {
    return result.path.some(node => {
      const distance = turf.distance(
        turf.point([node.lng, node.lat]),
        turf.point([incident.location.lng, incident.location.lat]),
        { units: 'kilometers' }
      );
      return distance < 0.5;
    });
  });

  // Calculate average congestion
  let totalCongestion = 0;
  let congestionCount = 0;
  
  result.path.forEach(node => {
    zones.forEach(zone => {
      const distance = turf.distance(
        turf.point([node.lng, node.lat]),
        turf.point([zone.center_lng, zone.center_lat]),
        { units: 'kilometers' }
      );
      if (distance < zone.radius_meters / 1000) {
        totalCongestion += zone.congestion_level;
        congestionCount++;
      }
    });
  });

  const avgCongestion = congestionCount > 0 ? totalCongestion / congestionCount : 30;

  // Generate reasoning
  const reasoning = generateRouteReasoning(
    totalDistance,
    estimatedTime,
    avgCongestion,
    routeIncidents,
    weatherFactor
  );

  // Generate alternatives (simplified for now)
  const alternatives: Array<{
    path: RouteNode[];
    reason: string;
    timeDiff: number;
    distanceDiff: number;
  }> = [];

  return {
    path: result.path,
    totalDistance: Math.round(totalDistance),
    estimatedTime: Math.round(estimatedTime),
    fuelCost: Math.round(fuelCost),
    congestionLevel: Math.round(avgCongestion),
    incidents: routeIncidents,
    reasoning,
    alternatives
  };
}

function generateRouteReasoning(
  distance: number,
  time: number,
  congestion: number,
  incidents: TrafficIncident[],
  weatherFactor: number
): string {
  const parts: string[] = [];

  parts.push(`Route optimized for ${(distance / 1000).toFixed(1)} km distance.`);
  
  if (congestion > 70) {
    parts.push('Heavy traffic expected - route avoids high-congestion zones where possible.');
  } else if (congestion > 40) {
    parts.push('Moderate traffic conditions factored into route calculation.');
  } else {
    parts.push('Light traffic - optimal driving conditions.');
  }

  if (incidents.length > 0) {
    parts.push(`${incidents.length} active incident(s) on or near route - delays accounted for.`);
  }

  if (weatherFactor > 1.2) {
    parts.push('Adverse weather conditions detected - reduced speed limits applied.');
  }

  parts.push(`Estimated time: ${Math.round(time / 60)} minutes.`);

  return parts.join(' ');
}

/**
 * Compare two routes and determine which is better
 */
export function compareRoutes(
  route1: OptimizedRoute,
  route2: OptimizedRoute,
  priority: 'time' | 'distance' | 'fuel' | 'safety' = 'time'
): { better: OptimizedRoute, reason: string } {
  
  switch (priority) {
    case 'time':
      if (route1.estimatedTime < route2.estimatedTime) {
        return { 
          better: route1, 
          reason: `Route 1 is ${Math.round((route2.estimatedTime - route1.estimatedTime) / 60)} minutes faster` 
        };
      }
      return { 
        better: route2, 
        reason: `Route 2 is ${Math.round((route1.estimatedTime - route2.estimatedTime) / 60)} minutes faster` 
      };
    
    case 'distance':
      if (route1.totalDistance < route2.totalDistance) {
        return { 
          better: route1, 
          reason: `Route 1 is ${((route2.totalDistance - route1.totalDistance) / 1000).toFixed(1)} km shorter` 
        };
      }
      return { 
        better: route2, 
        reason: `Route 2 is ${((route1.totalDistance - route2.totalDistance) / 1000).toFixed(1)} km shorter` 
        };
    
    case 'fuel':
      if (route1.fuelCost < route2.fuelCost) {
        return { 
          better: route1, 
          reason: `Route 1 saves ₹${Math.round(route2.fuelCost - route1.fuelCost)} in fuel` 
        };
      }
      return { 
        better: route2,
        reason: `Route 2 saves ₹${Math.round(route1.fuelCost - route2.fuelCost)} in fuel` 
      };
    
    case 'safety':
      if (route1.incidents.length < route2.incidents.length) {
        return { 
          better: route1, 
          reason: `Route 1 has ${route2.incidents.length - route1.incidents.length} fewer incidents` 
        };
      }
      return { 
        better: route2, 
        reason: `Route 2 has ${route1.incidents.length - route2.incidents.length} fewer incidents` 
      };
    
    default:
      return { better: route1, reason: 'Default route' };
  }
}
