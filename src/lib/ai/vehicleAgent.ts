import axios from 'axios';
import type { Vehicle, TrafficZone } from '../types';
import { findOptimalRoute, type OptimizedRoute } from '../routing/routeOptimization';
import type { TrafficIncident } from '../traffic/freeTrafficService';

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'liquid/lfm-2.5-1.2b-thinking:free'; // LFM-2.5 free model for intelligent decision making

export interface DecisionContext {
  vehicle: Vehicle;
  destination?: { lat: number; lng: number };
  currentRoute?: OptimizedRoute;
  nearbyZones: TrafficZone[];
  nearbyIncidents: TrafficIncident[];
  environment: {
    weather: string;
    temperature?: number;
    congestion: number;
    globalCongestionLevel?: number;
    rushHour: boolean;
    weatherSpeedFactor?: number;
    visibilityMeters?: number;
  };
  fuelStations?: Array<{
    name: string;
    distance: number;
    lat: number;
    lng: number;
    price?: number;
  }>;
}

export interface AIDecision {
  action: 'continue' | 'reroute' | 'refuel' | 'slow_down' | 'speed_up' | 'rest_break';
  reasoning: string;
  newRoute?: { lat: number; lng: number };
  targetSpeed?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0.0 to 1.0
}

/**
 * AI Agent: Makes human-like driving decisions for a vehicle
 */
export class VehicleAgent {
  private vehicleId: string;
  private personality: 'aggressive' | 'cautious' | 'balanced' | 'efficient';
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 30000; // 30 seconds between decisions

  constructor(vehicleId: string, personality: 'aggressive' | 'cautious' | 'balanced' | 'efficient' = 'balanced') {
    this.vehicleId = vehicleId;
    this.personality = personality;
  }

  /**
   * Make an AI decision with route optimization and situation imagination
   */
  async makeDecision(context: DecisionContext): Promise<AIDecision | null> {
    // Cooldown check
    const now = Date.now();
    if (now - this.lastDecisionTime < this.decisionCooldown) {
      return null;
    }

    try {
      // Step 1: Calculate optimal route using Dijkstra's algorithm
      if (context.destination && !context.currentRoute) {
        console.log(`🧮 ${this.vehicleId}: Computing optimal route...`);
        context.currentRoute = await findOptimalRoute(
          context.vehicle.location,
          context.destination,
          context.nearbyZones,
          context.nearbyIncidents,
          context.environment.weatherSpeedFactor || 1.0,
          context.vehicle.type
        );
        console.log(`✅ Route calculated: ${(context.currentRoute.totalDistance / 1000).toFixed(1)}km, ${Math.round(context.currentRoute.estimatedTime / 60)}min`);
      }

      // Step 2: Imagine the situation and make decision
      const prompt = this.buildSituationImaginationPrompt(context);

      // Step 3: Call GLM-4.5 AI model
      console.log(`🤖 ${this.vehicleId}: Consulting AI for decision...`);
      const response = await this.callAI(prompt, context);

      // Step 4: Parse decision
      const decision = this.parseDecision(response, context);

      this.lastDecisionTime = now;
      
      // Log detailed thinking
      console.log(`💭 ${this.vehicleId} AI Decision: ${decision.action}`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      return decision;
    } catch (error) {
      console.error(`❌ AI decision failed for ${this.vehicleId}:`, error);
      return this.makeFallbackDecision(context);
    }
  }

  /**
   * Build prompt that makes AI imagine being in the situation
   */
  private buildSituationImaginationPrompt(context: DecisionContext): string {
    const { vehicle, nearbyZones, nearbyIncidents, environment, currentRoute } = context;

    // Personality traits
    const personalityTraits = {
      aggressive: 'You are a bold, speed-focused driver who values time over caution. You take calculated risks.',
      cautious: 'You are a careful, safety-first driver who never rushes. You prioritize avoiding accidents.',
      balanced: 'You are a practical driver who balances speed, safety, and efficiency wisely.',
      efficient: 'You are a cost-conscious driver obsessed with fuel economy and route optimization.'
    };

    // Build detailed situation description
    const situation = `
🚛 YOU ARE THE DRIVER OF: ${vehicle.name} (${vehicle.type.toUpperCase()})
📍 Current Location: ${Number(vehicle.location?.lat || 0).toFixed(4)}°N, ${Number(vehicle.location?.lng || 0).toFixed(4)}°E
🎯 Your Destination: ${context.destination ? `${context.destination.lat.toFixed(4)}°N, ${context.destination.lng.toFixed(4)}°E` : 'Unknown'}
⛽ Fuel Level: ${Math.round(vehicle.fuel)}% (${vehicle.fuel < 20 ? '⚠️ LOW!' : vehicle.fuel < 50 ? '📉 Medium' : '✅ Good'})
⚡ Current Speed: ${vehicle.speed || 0} km/h
🧳 Cargo Weight: ${vehicle.cargoWeight || 0} kg / ${vehicle.cargoCapacity || 5000} kg capacity

🌦️ WEATHER & ENVIRONMENT:
- Weather Condition: ${environment.weather} ${(environment.weatherSpeedFactor || 1) < 0.7 ? '⚠️ (Hazardous)' : ''}
- Temperature: ${environment.temperature || 28}°C
- Visibility: ${environment.visibilityMeters || 10000}m
- Global Traffic Congestion: ${environment.globalCongestionLevel || environment.congestion}%
- Rush Hour: ${environment.rushHour ? '🔴 YES - Peak traffic time!' : '🟢 No'}
- Weather Speed Impact: ${((1 - (environment.weatherSpeedFactor || 1)) * 100).toFixed(0)}% slower

🛣️ YOUR CALCULATED ROUTE:
${currentRoute ? `
- Total Distance: ${(currentRoute.totalDistance / 1000).toFixed(2)} km
- Estimated Time: ${Math.round(currentRoute.estimatedTime / 60)} minutes
- Fuel Cost: ₹${currentRoute.fuelCost}
- Average Congestion: ${currentRoute.congestionLevel}%
- Incidents on Route: ${currentRoute.incidents.length}
- Optimization Reasoning: ${currentRoute.reasoning}
` : '❌ NO ROUTE CALCULATED YET'}

🚦 NEARBY TRAFFIC ZONES:
${nearbyZones.length > 0 ? nearbyZones.map(z => `
- ${z.name || z.area}: ${z.congestionLevel}% congestion, avg ${z.avgSpeed || 40} km/h, ${z.vehicleCount || 0} vehicles
`).join('') : '- No traffic zone data available'}

⚠️ ACTIVE INCIDENTS:
${nearbyIncidents.length > 0 ? nearbyIncidents.map((inc, i) => `
${i + 1}. ${inc.type.toUpperCase()} [${inc.severity}] - ${inc.description}
   Location: ${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}
   Delay: ${inc.delayMinutes || 0} minutes
`).join('') : '✅ No incidents reported'}

⛽ NEAREST FUEL STATIONS:
${context.fuelStations && context.fuelStations.length > 0 ? context.fuelStations.slice(0, 2).map(fs => `
- ${fs.name}: ${fs.distance.toFixed(1)}km away, ₹${fs.price || 105}/L
`).join('') : '- No fuel station data available'}

---

🧠 PERSONALITY: ${personalityTraits[this.personality]}

---

🤔 IMAGINE YOURSELF IN THIS SITUATION:

You are physically sitting in the driver's seat of this ${vehicle.type}, feeling the steering wheel in your hands. 
You can see the road ahead through the windshield, feel the vibration of the engine, hear the traffic around you.
The fuel gauge shows ${Math.round(vehicle.fuel)}%. The weather is ${environment.weather}. Traffic is ${(environment.globalCongestionLevel || environment.congestion) > 70 ? 'HEAVY' : (environment.globalCongestionLevel || environment.congestion) > 40 ? 'MODERATE' : 'LIGHT'}.

${vehicle.fuel < 20 ? '⚠️ Your fuel warning light is BLINKING. You feel anxious about running out of fuel.' : ''}
${nearbyIncidents.length > 0 ? `⚠️ You hear on the radio: "${nearbyIncidents[0].description}". This worries you.` : ''}
${environment.rushHour ? '🚨 The roads are PACKED with vehicles. Everyone is honking. You are stuck in bumper-to-bumper traffic.' : ''}
${environment.weather !== 'clear' ? `🌧️ Your windshield wipers are on. Visibility is reduced. You must drive more carefully.` : ''}

What do YOU, as the driver, decide to do RIGHT NOW?

AVAILABLE ACTIONS:
1. **continue** - Keep following current route, maintain speed
2. **reroute** - Recalculate route to avoid congestion/incidents (uses Dijkstra's algorithm)
3. **refuel** - Stop at nearest fuel station immediately
4. **slow_down** - Reduce speed due to conditions
5. **speed_up** - Increase speed if conditions allow  
6. **rest_break** - Stop to rest (if fatigued or required by law)

🎯 RESPOND IN THIS FORMAT:
ACTION: [chosen action]
REASONING: [Explain WHY you made this decision as if you're the driver. What did you see? What worried you? What made you choose this? Use first-person "I"]
TARGET_SPEED: [If speed change, specify km/h]
PRIORITY: [low/medium/high/critical]
CONFIDENCE: [0.0-1.0]

Think like a REAL HUMAN DRIVER in Bangalore traffic. Consider your personality, the dangers, the costs, and your gut feeling.
`;

    return situation;
  }

  /**
   * Call OpenRouter AI API
   */
  private async callAI(prompt: string, context: DecisionContext): Promise<string> {
    try {
      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert vehicle driver AI making real-time driving decisions in urban traffic.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // Reduced timeout
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      console.log(`🤖 AI Decision for ${this.vehicleId}:`, aiResponse.substring(0, 100) + '...');
      
      return aiResponse;
    } catch (error: any) {
      if (error.response?.status === 402 || 
          error.response?.status === 429 || 
          error.code === 'ECONNABORTED' ||
          error.response?.status === 401) { 
        console.warn(`⚠️ AI API Issue (${error.code || error.response?.status}), using fallback.`);
        return this.generateFallbackResponse(context);
      }
      
      console.error('❌ OpenRouter API error:', error.response?.data || error.message);
      // Even for other errors, fallback instead of crashing
      return this.generateFallbackResponse(context);
    }
  }

  /**
   * Generate a deterministic fallback response when AI is offline
   */
  private generateFallbackResponse(context: DecisionContext): string {
    const isEmergency = context.vehicle.fuel < 10;
    const inTraffic = (context.environment.globalCongestionLevel || 0) > 70;
    
    // Heuristic decision tree
    if (isEmergency) {
      return `ACTION: refuel\nREASONING: [FALLBACK] Fuel low. Finding station.\nTARGET_SPEED: 30\nPRIORITY: critical\nCONFIDENCE: 1.0`;
    }
    
    if (inTraffic) {
      return `ACTION: reroute\nREASONING: [FALLBACK] Heavy traffic. Seeking alternative.\nTARGET_SPEED: 35\nPRIORITY: medium\nCONFIDENCE: 0.85`;
    }

    return `ACTION: continue\nREASONING: [FALLBACK] Conditions normal. Proceeding.\nTARGET_SPEED: 60\nPRIORITY: low\nCONFIDENCE: 0.95`;
  }

  /**
   * Parse AI response into structured decision
   */
  private parseDecision(aiResponse: string, context: DecisionContext): AIDecision {
    // Extract action
    const actionMatch = aiResponse.match(/ACTION:\s*(\w+)/i);
    const action = actionMatch ? actionMatch[1].toLowerCase() : 'continue';

    // Extract reasoning
    const reasoningMatch = aiResponse.match(/REASONING:\s*(.+?)(?=TARGET_SPEED:|PRIORITY:|CONFIDENCE:|$)/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Continuing current route';

    // Extract target speed
    const speedMatch = aiResponse.match(/TARGET_SPEED:\s*(\d+)/i);
    const targetSpeed = speedMatch ? parseInt(speedMatch[1]) : undefined;

    // Extract priority
    const priorityMatch = aiResponse.match(/PRIORITY:\s*(\w+)/i);
    const priority = (priorityMatch ? priorityMatch[1].toLowerCase() : 'medium') as 'low' | 'medium' | 'high' | 'critical';

    // Extract confidence
    const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*([\d.]+)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.75;

    // Map action string to valid action type
    const validAction = this.mapAction(action);

    return {
      action: validAction,
      reasoning,
      targetSpeed,
      priority,
      confidence
    };
  }

  /**
   * Map AI response to valid action
   */
  private mapAction(action: string): AIDecision['action'] {
    const actionMap: { [key: string]: AIDecision['action'] } = {
      continue: 'continue',
      reroute: 'reroute',
      refuel: 'refuel',
      slow_down: 'slow_down',
      slowdown: 'slow_down',
      speed_up: 'speed_up',
      speedup: 'speed_up',
      rest_break: 'rest_break',
      rest: 'rest_break',
      break: 'rest_break'
    };

    return actionMap[action] || 'continue';
  }

  /**
   * Fallback decision when AI fails
   */
  private makeFallbackDecision(context: DecisionContext): AIDecision {
    const { vehicle, nearbyIncidents } = context;

    // Critical: Low fuel
    if (vehicle.fuel < 20) {
      return {
        action: 'refuel',
        reasoning: 'Fuel level critical, need to refuel immediately',
        priority: 'critical',
        confidence: 1.0
      };
    }

    // High: Nearby incident
    if (nearbyIncidents.length > 0) {
      const highSeverity = nearbyIncidents.some(i => i.severity === 'high' || (i.severity as any) === 'critical');
      if (highSeverity) {
        return {
          action: 'reroute',
          reasoning: 'High severity incident nearby, rerouting to avoid delay',
          priority: 'high',
          confidence: 0.9
        };
      }
    }

    // Default: Continue
    return {
      action: 'continue',
      reasoning: 'No issues detected, continuing current route',
      priority: 'low',
      confidence: 0.8
    };
  }

  /**
   * Adjust decision cooldown based on urgency
   */
  public setDecisionCooldown(ms: number) {
    this.decisionCooldown = ms;
  }

  /**
   * Get agent personality
   */
  public getPersonality() {
    return this.personality;
  }
}

/**
 * Create AI agent for a vehicle
 */
export function createVehicleAgent(vehicle: Vehicle): VehicleAgent {
  return new VehicleAgent(vehicle.id, (vehicle.aiPersonality || 'balanced') as 'aggressive' | 'cautious' | 'balanced' | 'efficient');
}

/**
 * Test AI API connection
 */
export async function testAIConnection(): Promise<boolean> {
  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [{ role: 'user', content: 'Hello, can you hear me?' }],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ AI API (OpenRouter + Qwen) is available');
    return true;
  } catch (error) {
    console.error('❌ AI API unavailable:', error);
    return false;
  }
}
