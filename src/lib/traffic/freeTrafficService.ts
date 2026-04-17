/**
 * FREE UNLIMITED Real-Time Traffic Simulation System
 * 
 * Generates realistic Bangalore traffic patterns using:
 * - Time-of-day analysis (rush hour, off-peak)
 * - Weather correlation (rain = more incidents)
 * - Day-of-week patterns (weekday vs weekend)
 * - Road type analysis (highways vs local roads)
 * - Statistical incident generation
 * - Congestion wave simulation
 * 
 * NO API LIMITS - Completely free and unlimited
 */

import * as turf from '@turf/turf';

// Bangalore bounding box
const BANGALORE_BOUNDS = {
  minLat: 12.7342,
  maxLat: 13.1731,
  minLng: 77.3791,
  maxLng: 77.8827
};

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'roadwork' | 'congestion' | 'weather' | 'breakdown';
  description: string;
  location: { lat: number; lng: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  delayMinutes: number;
  affectedRoads: string[];
  startTime: Date;
}

export interface ZoneTrafficData {
  zoneId: string;
  zoneName: string;
  avgSpeed: number;
  congestionLevel: number;
  activeIncidents: number;
}

// Known Bangalore hotspots for realistic incident placement
const TRAFFIC_HOTSPOTS = [
  { name: 'Silk Board Junction', lat: 12.9166, lng: 77.6222, incidentProbability: 0.15 },
  { name: 'Outer Ring Road', lat: 12.9352, lng: 77.6245, incidentProbability: 0.12 },
  { name: 'Hosur Road', lat: 12.9298, lng: 77.6197, incidentProbability: 0.10 },
  { name: 'Whitefield Main Road', lat: 12.9698, lng: 77.7499, incidentProbability: 0.08 },
  { name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970, incidentProbability: 0.09 },
  { name: 'Bannerghatta Road', lat: 12.8892, lng: 77.5956, incidentProbability: 0.07 },
  { name: 'Tumkur Road', lat: 13.0299, lng: 77.5538, incidentProbability: 0.06 },
  { name: 'Electronic City', lat: 12.8458, lng: 77.6603, incidentProbability: 0.11 },
  { name: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974, incidentProbability: 0.10 },
  { name: 'Koramangala', lat: 12.9279, lng: 77.6271, incidentProbability: 0.08 },
  { name: 'Indiranagar', lat: 12.9716, lng: 77.6412, incidentProbability: 0.05 },
  { name: 'MG Road', lat: 12.9716, lng: 77.5946, incidentProbability: 0.04 }
];

// Active incidents storage - starts empty for clean demo
let activeIncidents: TrafficIncident[] = [];
let incidentIdCounter = 1;

/**
 * Generate realistic traffic incidents based on current conditions
 */
export async function fetchTrafficIncidents(
  weatherCondition?: string,
  hour?: number,
  dayOfWeek?: number
): Promise<TrafficIncident[]> {
  const currentHour = hour ?? new Date().getHours();
  const currentDay = dayOfWeek ?? new Date().getDay();
  const isWeekday = currentDay >= 1 && currentDay <= 5;
  const isRushHour = (currentHour >= 7 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 20);
  
  // Remove expired incidents (incidents last 15-60 minutes)
  const now = new Date();
  activeIncidents = activeIncidents.filter(incident => {
    const age = now.getTime() - incident.startTime.getTime();
    const maxAge = incident.severity === 'critical' ? 60 : incident.severity === 'high' ? 45 : 30;
    return age < maxAge * 60 * 1000;
  });
  
  // Calculate incident spawn probability
  let spawnProbability = 0.05; // Base 5% chance per check
  
  // Rush hour increases incidents
  if (isRushHour) spawnProbability *= 2.5;
  
  // Weekday increases incidents
  if (isWeekday) spawnProbability *= 1.5;
  
  // Weather effects
  if (weatherCondition === 'rain') spawnProbability *= 2.0;
  if (weatherCondition === 'heavy_rain') spawnProbability *= 3.5;
  if (weatherCondition === 'fog') spawnProbability *= 2.5;
  if (weatherCondition === 'storm') spawnProbability *= 4.0;
  
  // Spawn new incidents - DISABLED for hackathon demo to prevent spam
  // if (Math.random() < spawnProbability) {
  //   const newIncident = generateRealisticIncident(weatherCondition, isRushHour);
  //   activeIncidents.push(newIncident);
  //   console.log(`🚨 New incident: ${newIncident.type} at ${newIncident.affectedRoads[0]} (${newIncident.severity})`);
  // }
  
  return [...activeIncidents];
}

/**
 * Generate a single realistic incident
 */
function generateRealisticIncident(
  weatherCondition?: string,
  isRushHour: boolean = false
): TrafficIncident {
  // Select hotspot based on probability weights
  const totalWeight = TRAFFIC_HOTSPOTS.reduce((sum, spot) => sum + spot.incidentProbability, 0);
  let random = Math.random() * totalWeight;
  let selectedHotspot = TRAFFIC_HOTSPOTS[0];
  
  for (const hotspot of TRAFFIC_HOTSPOTS) {
    random -= hotspot.incidentProbability;
    if (random <= 0) {
      selectedHotspot = hotspot;
      break;
    }
  }
  
  // Add some randomness to exact location (within 500m)
  const randomOffset = 0.005; // ~500m
  const location = {
    lat: selectedHotspot.lat + (Math.random() - 0.5) * randomOffset,
    lng: selectedHotspot.lng + (Math.random() - 0.5) * randomOffset
  };
  
  // Determine incident type based on conditions
  let type: TrafficIncident['type'];
  let description: string;
  let severity: TrafficIncident['severity'];
  let delayMinutes: number;
  
  const typeRoll = Math.random();
  
  if (weatherCondition === 'heavy_rain' || weatherCondition === 'storm') {
    // Weather-related incidents more common in bad weather
    if (typeRoll < 0.35) {
      type = 'accident';
      description = 'Vehicle collision due to slippery roads';
      severity = Math.random() < 0.3 ? 'critical' : Math.random() < 0.6 ? 'high' : 'medium';
    } else if (typeRoll < 0.55) {
      type = 'weather';
      description = 'Waterlogging causing road blockage';
      severity = Math.random() < 0.4 ? 'high' : 'medium';
    } else if (typeRoll < 0.75) {
      type = 'breakdown';
      description = 'Vehicle breakdown in heavy rain';
      severity = Math.random() < 0.7 ? 'low' : 'medium';
    } else {
      type = 'congestion';
      description = 'Slow-moving traffic due to weather conditions';
      severity = 'medium';
    }
  } else if (isRushHour) {
    // Rush hour patterns
    if (typeRoll < 0.4) {
      type = 'congestion';
      description = 'Heavy rush hour traffic buildup';
      severity = Math.random() < 0.2 ? 'high' : 'medium';
    } else if (typeRoll < 0.65) {
      type = 'accident';
      description = 'Minor vehicle collision causing lane blockage';
      severity = Math.random() < 0.5 ? 'medium' : 'low';
    } else if (typeRoll < 0.85) {
      type = 'breakdown';
      description = 'Vehicle breakdown blocking lane';
      severity = 'low';
    } else {
      type = 'roadwork';
      description = 'Ongoing road maintenance reducing lanes';
      severity = 'medium';
    }
  } else {
    // Normal conditions
    if (typeRoll < 0.35) {
      type = 'accident';
      description = 'Traffic accident reported';
      severity = Math.random() < 0.1 ? 'critical' : Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low';
    } else if (typeRoll < 0.55) {
      type = 'breakdown';
      description = 'Vehicle breakdown on roadside';
      severity = Math.random() < 0.3 ? 'medium' : 'low';
    } else if (typeRoll < 0.75) {
      type = 'roadwork';
      description = 'Road construction work in progress';
      severity = Math.random() < 0.2 ? 'high' : 'medium';
    } else {
      type = 'congestion';
      description = 'Slow traffic flow reported';
      severity = Math.random() < 0.4 ? 'medium' : 'low';
    }
  }
  
  // Calculate delay based on severity
  delayMinutes = severity === 'critical' ? 25 + Math.random() * 20 :
                 severity === 'high' ? 15 + Math.random() * 15 :
                 severity === 'medium' ? 8 + Math.random() * 10 :
                 3 + Math.random() * 7;
  
  return {
    id: `INC-${incidentIdCounter++}-${Date.now()}`,
    type,
    description,
    location,
    severity,
    delayMinutes: Math.round(delayMinutes),
    affectedRoads: [selectedHotspot.name],
    startTime: new Date()
  };
}

/**
 * Update zone traffic data based on time, weather, and incidents
 */
export async function updateZoneTrafficData(
  zones: any[],
  weatherCondition?: string,
  hour?: number
): Promise<ZoneTrafficData[]> {
  const currentHour = hour ?? new Date().getHours();
  const isRushHour = (currentHour >= 7 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 20);
  const isNight = currentHour >= 22 || currentHour <= 5;
  
  const incidents = await fetchTrafficIncidents(weatherCondition, hour);
  
  return zones.map(zone => {
    // Base speed: 40 km/h
    let avgSpeed = 40;
    let congestionLevel = 20; // Base congestion
    
    // Time-of-day effects
    if (isRushHour) {
      avgSpeed *= 0.5; // 50% slower
      congestionLevel += 40;
    } else if (isNight) {
      avgSpeed *= 1.3; // 30% faster at night
      congestionLevel -= 10;
    }
    
    // Weather effects
    if (weatherCondition === 'rain') {
      avgSpeed *= 0.8;
      congestionLevel += 15;
    } else if (weatherCondition === 'heavy_rain') {
      avgSpeed *= 0.5;
      congestionLevel += 30;
    } else if (weatherCondition === 'fog') {
      avgSpeed *= 0.6;
      congestionLevel += 25;
    } else if (weatherCondition === 'storm') {
      avgSpeed *= 0.4;
      congestionLevel += 40;
    }
    
    // Zone-specific characteristics
    const zoneName = zone.zone_name || zone.zoneName;
    if (zoneName?.includes('Silk Board') || zoneName?.includes('Outer Ring')) {
      congestionLevel += 15; // Always more congested
      avgSpeed *= 0.85;
    } else if (zoneName?.includes('Electronic City') || zoneName?.includes('Whitefield')) {
      if (isRushHour) {
        congestionLevel += 20; // Tech hubs are worse during rush
        avgSpeed *= 0.7;
      }
    }
    
    // Check incidents near this zone
    const zoneCenter = {
      lat: zone.center_lat || zone.centerLat,
      lng: zone.center_lng || zone.centerLng
    };
    const zoneRadius = (zone.radius_km || zone.radiusKm || 2) * 1000; // Convert to meters
    
    const nearbyIncidents = incidents.filter(incident => {
      const distance = turf.distance(
        turf.point([zoneCenter.lng, zoneCenter.lat]),
        turf.point([incident.location.lng, incident.location.lat]),
        { units: 'meters' }
      );
      return distance <= zoneRadius;
    });
    
    // Apply incident effects
    nearbyIncidents.forEach(incident => {
      const impact = {
        critical: { speed: 0.4, congestion: 35 },
        high: { speed: 0.6, congestion: 25 },
        medium: { speed: 0.75, congestion: 15 },
        low: { speed: 0.9, congestion: 8 }
      }[incident.severity];
      
      avgSpeed *= impact.speed;
      congestionLevel += impact.congestion;
    });
    
    // Clamp values
    avgSpeed = Math.max(5, Math.min(80, avgSpeed));
    congestionLevel = Math.max(0, Math.min(100, congestionLevel));
    
    return {
      zoneId: zone.zone_id || zone.zoneId,
      zoneName,
      avgSpeed: Math.round(avgSpeed),
      congestionLevel: Math.round(congestionLevel),
      activeIncidents: nearbyIncidents.length
    };
  });
}

/**
 * Get traffic flow description for AI agents
 */
export function getTrafficFlowDescription(congestionLevel: number, avgSpeed: number): string {
  if (congestionLevel >= 80) return '🚨 SEVERE traffic jam - bumper to bumper, barely moving';
  if (congestionLevel >= 60) return '🔴 HEAVY congestion - stop-and-go traffic, frequent honking';
  if (congestionLevel >= 40) return '🟠 MODERATE traffic - slower than usual, some delays';
  if (congestionLevel >= 20) return '🟡 LIGHT traffic - minor slowdowns, mostly flowing';
  return '🟢 FREE flow - clear roads, excellent conditions';
}

/**
 * Traffic polling service - FREE UNLIMITED
 */
export class TrafficDataPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number;
  
  constructor(intervalMinutes: number = 5) {
    this.pollInterval = intervalMinutes * 60 * 1000;
  }
  
  start(
    callback: (data: { incidents: TrafficIncident[]; zoneData: ZoneTrafficData[] }) => void,
    zones: any[],
    getWeatherCondition: () => string = () => 'clear'
  ) {
    console.log(`🚦 Starting FREE UNLIMITED traffic poller (${this.pollInterval / 60000} min intervals)...`);
    
    // Initial update
    this.updateAndNotify(callback, zones, getWeatherCondition);
    
    // Poll at intervals
    this.intervalId = setInterval(() => {
      this.updateAndNotify(callback, zones, getWeatherCondition);
    }, this.pollInterval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Traffic poller stopped');
    }
  }
  
  private async updateAndNotify(
    callback: (data: { incidents: TrafficIncident[]; zoneData: ZoneTrafficData[] }) => void,
    zones: any[],
    getWeatherCondition: () => string
  ) {
    try {
      const weatherCondition = getWeatherCondition();
      const incidents = await fetchTrafficIncidents(weatherCondition);
      const zoneData = await updateZoneTrafficData(zones, weatherCondition);
      
      console.log(`✅ Traffic updated: ${incidents.length} active incidents, avg congestion: ${Math.round(zoneData.reduce((sum, z) => sum + z.congestionLevel, 0) / zoneData.length)}%`);
      
      callback({ incidents, zoneData });
    } catch (error) {
      console.error('❌ Traffic poll failed:', error);
    }
  }
}

/**
 * Export for AI agents - get current traffic summary
 */
export function getTrafficSummary(): {
  totalIncidents: number;
  criticalIncidents: number;
  avgCongestion: string;
} {
  const critical = activeIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const avgCongestion = activeIncidents.length === 0 ? 'normal' :
                        activeIncidents.length <= 2 ? 'light' :
                        activeIncidents.length <= 5 ? 'moderate' :
                        'heavy';
  
  return {
    totalIncidents: activeIncidents.length,
    criticalIncidents: critical,
    avgCongestion
  };
}

console.log('✅ FREE UNLIMITED Traffic Simulation System loaded - No API limits!');
