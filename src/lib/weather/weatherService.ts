/**
 * Weather Data Integration Service
 * Fetches real-time weather from OpenWeatherMap API for Bangalore
 */

import axios from 'axios';

// OpenWeatherMap API (free tier: 60 calls/minute, 1M calls/month)
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY';
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Bangalore coordinates
const BANGALORE_LAT = 12.9716;
const BANGALORE_LNG = 77.5946;

export interface WeatherData {
  condition: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'fog' | 'storm';
  temperature: number; // Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  visibility: number; // meters
  pressure: number; // hPa
  description: string;
  icon: string;
  timestamp: Date;
  weatherSpeedFactor: number; // Impact on vehicle speed (0.3-1.0)
}

/**
 * Fetch current weather for Bangalore
 */
export async function fetchCurrentWeather(): Promise<WeatherData> {
  try {
    const response = await axios.get(
      `${WEATHER_BASE_URL}/weather`,
      {
        params: {
          lat: BANGALORE_LAT,
          lon: BANGALORE_LNG,
          appid: WEATHER_API_KEY,
          units: 'metric'
        },
        timeout: 10000
      }
    );

    const data = response.data;

    // Map OpenWeatherMap conditions to our conditions
    const condition = mapWeatherCondition(data.weather[0].main, data.weather[0].id);
    const weatherSpeedFactor = calculateSpeedFactor(condition, data.wind.speed, data.visibility);

    const weatherData: WeatherData = {
      condition,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed * 3.6, // Convert m/s to km/h
      visibility: data.visibility || 10000,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date(),
      weatherSpeedFactor
    };

    console.log(`✅ Weather: ${condition}, ${weatherData.temperature}°C, visibility ${weatherData.visibility}m`);
    console.log(`   Speed factor: ${(weatherSpeedFactor * 100).toFixed(0)}% of normal`);

    return weatherData;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ OpenWeatherMap API error:', error.response?.data || error.message);
    } else {
      console.error('❌ Weather fetch failed:', error);
    }
    
    // Return default weather for development
    return getDefaultWeather();
  }
}

/**
 * Fetch weather forecast for next 24 hours
 */
export async function fetchWeatherForecast(): Promise<WeatherData[]> {
  try {
    const response = await axios.get(
      `${WEATHER_BASE_URL}/forecast`,
      {
        params: {
          lat: BANGALORE_LAT,
          lon: BANGALORE_LNG,
          appid: WEATHER_API_KEY,
          units: 'metric',
          cnt: 8 // Next 24 hours (3-hour intervals)
        },
        timeout: 10000
      }
    );

    const forecasts: WeatherData[] = response.data.list.map((item: any) => {
      const condition = mapWeatherCondition(item.weather[0].main, item.weather[0].id);
      const weatherSpeedFactor = calculateSpeedFactor(condition, item.wind.speed, item.visibility);

      return {
        condition,
        temperature: item.main.temp,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed * 3.6,
        visibility: item.visibility || 10000,
        pressure: item.main.pressure,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        timestamp: new Date(item.dt * 1000),
        weatherSpeedFactor
      };
    });

    console.log(`✅ Fetched ${forecasts.length} weather forecast entries`);
    return forecasts;

  } catch (error) {
    console.error('❌ Weather forecast fetch failed:', error);
    return [getDefaultWeather()];
  }
}

/**
 * Map OpenWeatherMap conditions to our simplified conditions
 */
function mapWeatherCondition(main: string, id: number): WeatherData['condition'] {
  // Thunderstorm (200-232)
  if (id >= 200 && id < 300) return 'storm';
  
  // Drizzle (300-321) or Light Rain (500-504)
  if ((id >= 300 && id < 400) || (id >= 500 && id <= 504)) return 'rain';
  
  // Heavy Rain (520-531)
  if (id >= 520 && id < 600) return 'heavy_rain';
  
  // Snow (600-622) - treat as heavy rain
  if (id >= 600 && id < 700) return 'heavy_rain';
  
  // Atmosphere (fog, mist, haze)
  if (id >= 700 && id < 800) return 'fog';
  
  // Clouds
  if (main === 'Clouds') return 'cloudy';
  
  // Clear
  return 'clear';
}

/**
 * Calculate speed factor based on weather conditions
 */
function calculateSpeedFactor(
  condition: WeatherData['condition'],
  windSpeedMs: number,
  visibility: number
): number {
  let factor = 1.0;

  // Base condition impact
  const conditionImpact = {
    clear: 1.0,
    cloudy: 0.95,
    rain: 0.75,
    heavy_rain: 0.5,
    fog: 0.6,
    storm: 0.3
  }[condition];

  factor *= conditionImpact;

  // Wind impact (high wind is dangerous)
  const windSpeedKmh = windSpeedMs * 3.6;
  if (windSpeedKmh > 50) factor *= 0.8; // Strong wind
  else if (windSpeedKmh > 30) factor *= 0.9; // Moderate wind

  // Visibility impact
  if (visibility < 1000) factor *= 0.4; // Very poor visibility
  else if (visibility < 3000) factor *= 0.7; // Poor visibility
  else if (visibility < 5000) factor *= 0.85; // Moderate visibility

  return Math.max(0.3, Math.min(1.0, factor)); // Clamp between 0.3 and 1.0
}

/**
 * Get default weather (for development/fallback)
 */
function getDefaultWeather(): WeatherData {
  return {
    condition: 'clear',
    temperature: 28.5,
    humidity: 60,
    windSpeed: 15,
    visibility: 10000,
    pressure: 1013,
    description: 'Clear sky',
    icon: '01d',
    timestamp: new Date(),
    weatherSpeedFactor: 1.0
  };
}

/**
 * Weather data polling service
 */
export class WeatherPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 15 * 60 * 1000; // 15 minutes

  start(callback: (weather: WeatherData) => void) {
    console.log('🌦️  Starting weather poller...');
    
    // Initial fetch
    this.fetchAndNotify(callback);

    // Poll every 15 minutes
    this.intervalId = setInterval(() => {
      this.fetchAndNotify(callback);
    }, this.pollInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Weather poller stopped');
    }
  }

  private async fetchAndNotify(callback: (weather: WeatherData) => void) {
    try {
      const weather = await fetchCurrentWeather();
      callback(weather);
    } catch (error) {
      console.error('❌ Weather poll failed:', error);
    }
  }
}

/**
 * Get weather emoji for display
 */
export function getWeatherEmoji(condition: WeatherData['condition']): string {
  const emojiMap = {
    clear: '☀️',
    cloudy: '⛅',
    rain: '🌧️',
    heavy_rain: '⛈️',
    fog: '🌫️',
    storm: '⚡'
  };
  return emojiMap[condition];
}

/**
 * Get weather description suitable for AI prompts
 */
export function getWeatherDescription(weather: WeatherData): string {
  const impacts: string[] = [];

  if (weather.weatherSpeedFactor < 0.5) impacts.push('HAZARDOUS driving conditions');
  else if (weather.weatherSpeedFactor < 0.7) impacts.push('difficult driving');
  else if (weather.weatherSpeedFactor < 0.9) impacts.push('moderate impact on driving');

  if (weather.visibility < 1000) impacts.push('VERY LOW visibility');
  else if (weather.visibility < 3000) impacts.push('poor visibility');

  if (weather.windSpeed > 50) impacts.push('DANGEROUS winds');
  else if (weather.windSpeed > 30) impacts.push('strong winds');

  if (impacts.length === 0) {
    return `${weather.description}, excellent driving conditions`;
  }

  return `${weather.description} - ${impacts.join(', ')}`;
}
