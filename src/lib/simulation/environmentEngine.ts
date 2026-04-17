/**
 * Environment Engine: Simulates weather, traffic, and time-of-day effects
 * Now with real-time weather integration from OpenWeatherMap
 */

import { fetchCurrentWeather, type WeatherData } from '../weather/weatherService';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'fog' | 'storm';

export interface EnvironmentState {
  // Weather
  condition: WeatherCondition;
  temperature: number; // Celsius
  visibilityMeters: number;
  windSpeed: number; // km/h
  
  // Time simulation
  simTime: Date;
  timeMultiplier: number; // 1.0 = real-time, 10.0 = 10x speed
  
  // Traffic state
  globalCongestionLevel: number; // 0-100
  rushHour: boolean;
  
  // Dynamic factors
  weatherSpeedFactor: number; // Multiplier for vehicle speeds (0.5 = half speed)
  congestionSpeedFactor: number; // Multiplier based on congestion
}

export class EnvironmentEngine {
  private state: EnvironmentState;
  private lastUpdate: number = Date.now();
  private weatherChangeInterval: number = 5 * 60 * 1000; // Change weather every 5 min
  private lastWeatherChange: number = Date.now();
  private useRealWeather: boolean = true; // Use real-time weather by default
  private lastRealWeatherFetch: number = 0;
  private realWeatherFetchInterval: number = 15 * 60 * 1000; // Fetch real weather every 15 min

  constructor(useRealWeather: boolean = true) {
    this.useRealWeather = useRealWeather;
    
    // Initialize with default Bangalore conditions
    this.state = {
      condition: 'clear',
      temperature: 28.5,
      visibilityMeters: 10000,
      windSpeed: 12,
      simTime: new Date(),
      timeMultiplier: 1.0,
      globalCongestionLevel: 30,
      rushHour: false,
      weatherSpeedFactor: 1.0,
      congestionSpeedFactor: 1.0
    };
    
    this.updateDerivedFactors();
    
    // Fetch real weather immediately if enabled
    if (this.useRealWeather) {
      this.fetchAndApplyRealWeather();
    }
  }
  
  /**
   * Fetch and apply real-time weather from OpenWeatherMap
   */
  private async fetchAndApplyRealWeather() {
    try {
      console.log('🌦️  Fetching real-time weather for Bangalore...');
      const weather: WeatherData = await fetchCurrentWeather();
      
      // Apply real weather to simulation state
      this.state.condition = weather.condition;
      this.state.temperature = weather.temperature;
      this.state.visibilityMeters = weather.visibility;
      this.state.windSpeed = weather.windSpeed;
      this.state.weatherSpeedFactor = weather.weatherSpeedFactor;
      
      console.log(`✅ Real weather applied: ${weather.condition}, ${weather.temperature}°C, ${weather.visibility}m visibility`);
      console.log(`   Speed factor: ${(weather.weatherSpeedFactor * 100).toFixed(0)}%`);
      
      this.lastRealWeatherFetch = Date.now();
      this.updateDerivedFactors();
    } catch (error) {
      console.error('❌ Failed to fetch real weather, using simulated:', error);
      // Fall back to simulated weather
      this.useRealWeather = false;
    }
  }

  /**
   * Update environment state (call every simulation tick)
   */
  update(): EnvironmentState {
    const now = Date.now();
    const deltaMs = now - this.lastUpdate;
    
    // Advance simulation time
    const simDelta = deltaMs * this.state.timeMultiplier;
    this.state.simTime = new Date(this.state.simTime.getTime() + simDelta);
    
    // Update rush hour status
    this.updateRushHour();
    
    // Update weather (real-time or simulated)
    if (this.useRealWeather) {
      // Fetch real weather every 15 minutes
      if (now - this.lastRealWeatherFetch > this.realWeatherFetchInterval) {
        this.fetchAndApplyRealWeather();
      }
    } else {
      // Use simulated weather changes
      if (now - this.lastWeatherChange > this.weatherChangeInterval) {
        this.updateWeather();
        this.lastWeatherChange = now;
      }
    }
    
    // Update congestion based on time of day and weather
    this.updateCongestion();
    
    // Update derived factors
    this.updateDerivedFactors();
    
    this.lastUpdate = now;
    return this.state;
  }

  /**
   * Check if current time is rush hour
   */
  private updateRushHour() {
    const hour = this.state.simTime.getHours();
    
    // Morning rush: 7-10 AM, Evening rush: 5-9 PM
    const morningRush = hour >= 7 && hour < 10;
    const eveningRush = hour >= 17 && hour < 21;
    
    this.state.rushHour = morningRush || eveningRush;
  }

  /**
   * Simulate weather changes
   */
  private updateWeather() {
    // Weather transition probabilities
    const transitions: { [key in WeatherCondition]: { [key in WeatherCondition]?: number } } = {
      clear: { clear: 0.7, cloudy: 0.25, rain: 0.05 },
      cloudy: { clear: 0.3, cloudy: 0.5, rain: 0.15, fog: 0.05 },
      rain: { rain: 0.5, heavy_rain: 0.2, cloudy: 0.25, clear: 0.05 },
      heavy_rain: { heavy_rain: 0.4, rain: 0.4, storm: 0.1, cloudy: 0.1 },
      fog: { fog: 0.5, cloudy: 0.4, clear: 0.1 },
      storm: { storm: 0.3, heavy_rain: 0.5, rain: 0.2 }
    };

    const currentWeather = this.state.condition;
    const possibilities = transitions[currentWeather];
    
    // Random weighted selection
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [weather, probability] of Object.entries(possibilities)) {
      cumulative += probability;
      if (rand <= cumulative) {
        this.state.condition = weather as WeatherCondition;
        break;
      }
    }

    // Update temperature based on weather
    this.updateTemperature();
    
    // Update visibility based on weather
    this.updateVisibility();
    
    console.log(`🌦️ Weather changed to: ${this.state.condition} (${this.state.temperature}°C)`);
  }

  /**
   * Update temperature based on weather and time
   */
  private updateTemperature() {
    const hour = this.state.simTime.getHours();
    
    // Bangalore temperature range: 22-35°C
    const baseTemp = 28;
    const hourAdjustment = Math.sin((hour - 6) * Math.PI / 12) * 5; // Peak at 2-3 PM
    
    const weatherAdjustment = {
      clear: 2,
      cloudy: 0,
      rain: -3,
      heavy_rain: -5,
      fog: -2,
      storm: -6
    };

    this.state.temperature = baseTemp + hourAdjustment + weatherAdjustment[this.state.condition];
    this.state.temperature = Math.max(22, Math.min(38, this.state.temperature)); // Clamp
  }

  /**
   * Update visibility based on weather
   */
  private updateVisibility() {
    const visibilityMap = {
      clear: 15000,
      cloudy: 12000,
      rain: 5000,
      heavy_rain: 2000,
      fog: 500,
      storm: 1000
    };

    this.state.visibilityMeters = visibilityMap[this.state.condition];
  }

  /**
   * Update congestion based on rush hour and weather
   */
  private updateCongestion() {
    let baseCongestion = 30; // Normal congestion
    
    // Rush hour increases congestion
    if (this.state.rushHour) {
      baseCongestion += 40;
    }
    
    // Bad weather increases congestion
    const weatherCongestion = {
      clear: 0,
      cloudy: 5,
      rain: 15,
      heavy_rain: 25,
      fog: 20,
      storm: 30
    };

    baseCongestion += weatherCongestion[this.state.condition];
    
    // Add some randomness
    baseCongestion += (Math.random() - 0.5) * 10;
    
    // Clamp between 0 and 100
    this.state.globalCongestionLevel = Math.max(0, Math.min(100, baseCongestion));
  }

  /**
   * Update derived speed factors based on conditions
   */
  private updateDerivedFactors() {
    // Weather affects speed
    // If using real weather, keep the factor from API
    // If simulated, calculate from condition
    if (!this.useRealWeather) {
      const weatherFactors = {
        clear: 1.0,
        cloudy: 0.95,
        rain: 0.75,
        heavy_rain: 0.5,
        fog: 0.6,
        storm: 0.4
      };

      this.state.weatherSpeedFactor = weatherFactors[this.state.condition];
    }
    // else: weatherSpeedFactor already set by real weather API
    
    // Congestion affects speed (exponential decay)
    // 0% congestion = 1.0x, 50% = 0.6x, 100% = 0.2x
    this.state.congestionSpeedFactor = Math.max(0.2, 1.0 - (this.state.globalCongestionLevel / 150));
  }

  /**
   * Get current environment state
   */
  getState(): EnvironmentState {
    return { ...this.state };
  }

  /**
   * Get combined speed factor (weather × congestion)
   */
  getSpeedFactor(): number {
    return this.state.weatherSpeedFactor * this.state.congestionSpeedFactor;
  }

  /**
   * Override weather (for testing)
   */
  setWeather(condition: WeatherCondition) {
    this.state.condition = condition;
    this.updateTemperature();
    this.updateVisibility();
    this.updateDerivedFactors();
  }
  
  /**
   * Toggle between real-time and simulated weather
   */
  setWeatherMode(useRealWeather: boolean) {
    this.useRealWeather = useRealWeather;
    console.log(`🌦️  Weather mode: ${useRealWeather ? 'REAL-TIME' : 'SIMULATED'}`);
    
    if (useRealWeather) {
      this.fetchAndApplyRealWeather();
    }
  }
  
  /**
   * Get current weather mode
   */
  getWeatherMode(): 'real' | 'simulated' {
    return this.useRealWeather ? 'real' : 'simulated';
  }

  /**
   * Set time multiplier (speed up/slow down simulation)
   */
  setTimeMultiplier(multiplier: number) {
    this.state.timeMultiplier = Math.max(0.1, Math.min(100, multiplier));
  }

  /**
   * Force rush hour state
   */
  setRushHour(enabled: boolean) {
    this.state.rushHour = enabled;
    this.updateCongestion();
  }

  /**
   * Get human-readable weather description
   */
  getWeatherDescription(): string {
    const descriptions = {
      clear: '☀️ Clear skies, excellent visibility',
      cloudy: '⛅ Partly cloudy, good conditions',
      rain: '🌧️ Light rain, reduced visibility',
      heavy_rain: '⛈️ Heavy rainfall, poor visibility',
      fog: '🌫️ Dense fog, very low visibility',
      storm: '⚡ Thunderstorm, dangerous conditions'
    };

    return descriptions[this.state.condition];
  }

  /**
   * Get time-of-day description
   */
  getTimeDescription(): string {
    const hour = this.state.simTime.getHours();
    
    if (hour >= 5 && hour < 12) return '🌅 Morning';
    if (hour >= 12 && hour < 17) return '☀️ Afternoon';
    if (hour >= 17 && hour < 21) return '🌆 Evening';
    return '🌙 Night';
  }

  /**
   * Simulate a random incident based on current conditions
   */
  shouldSpawnIncident(): { spawn: boolean; type?: string; severity?: string } {
    // Base incident probability: 0.1% per tick
    let probability = 0.001;
    
    // Bad weather increases incident probability
    if (this.state.condition === 'heavy_rain') probability *= 3;
    if (this.state.condition === 'storm') probability *= 5;
    if (this.state.condition === 'fog') probability *= 2;
    
    // Rush hour increases incident probability
    if (this.state.rushHour) probability *= 2;
    
    // High congestion increases incident probability
    if (this.state.globalCongestionLevel > 70) probability *= 1.5;

    if (Math.random() < probability) {
      // Determine incident type
      const types = ['accident', 'breakdown', 'congestion'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Determine severity
      const severities = ['low', 'medium', 'high'];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      return { spawn: true, type, severity };
    }

    return { spawn: false };
  }
}

// Singleton instance
let environmentEngine: EnvironmentEngine | null = null;

export function getEnvironmentEngine(): EnvironmentEngine {
  if (!environmentEngine) {
    environmentEngine = new EnvironmentEngine();
  }
  return environmentEngine;
}
