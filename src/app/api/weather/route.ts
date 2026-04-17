/**
 * Weather API endpoint - Returns current weather for Bangalore
 */

import { NextResponse } from 'next/server';
import { fetchCurrentWeather, fetchWeatherForecast, getWeatherEmoji, getWeatherDescription } from '@/lib/weather/weatherService';

/**
 * GET /api/weather
 * Returns current weather conditions for Bangalore
 */
export async function GET() {
  try {
    const weather = await fetchCurrentWeather();
    
    return NextResponse.json({
      success: true,
      weather: {
        condition: weather.condition,
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        visibility: weather.visibility,
        pressure: weather.pressure,
        description: weather.description,
        icon: weather.icon,
        timestamp: weather.timestamp,
        weatherSpeedFactor: weather.weatherSpeedFactor,
        emoji: getWeatherEmoji(weather.condition),
        fullDescription: getWeatherDescription(weather)
      }
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch weather data' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/weather/forecast
 * Returns 24-hour forecast for Bangalore
 */
export async function POST() {
  try {
    const forecast = await fetchWeatherForecast();
    
    return NextResponse.json({
      success: true,
      count: forecast.length,
      forecast: forecast.map(w => ({
        condition: w.condition,
        temperature: w.temperature,
        humidity: w.humidity,
        windSpeed: w.windSpeed,
        visibility: w.visibility,
        description: w.description,
        timestamp: w.timestamp,
        weatherSpeedFactor: w.weatherSpeedFactor,
        emoji: getWeatherEmoji(w.condition)
      }))
    });
  } catch (error) {
    console.error('Weather forecast API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch weather forecast' 
      },
      { status: 500 }
    );
  }
}
