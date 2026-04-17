'use client';
import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, CloudFog, Sun, Wind } from 'lucide-react';

export function WeatherDisplay() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        const data = await res.json();
        if (data.success) {
          setWeather(data.weather);
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (loading || !weather) {
    return (
      <div className="flex items-center gap-2 text-white/60">
        <Cloud className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="h-5 w-5" />;
    if (c.includes('snow')) return <CloudSnow className="h-5 w-5" />;
    if (c.includes('fog') || c.includes('mist')) return <CloudFog className="h-5 w-5" />;
    if (c.includes('clear')) return <Sun className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  const getWeatherColor = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain')) return 'text-blue-400';
    if (c.includes('storm')) return 'text-purple-400';
    if (c.includes('clear') || c.includes('sun')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className={`${getWeatherColor(weather.condition)}`}>
        {getWeatherIcon(weather.condition)}
      </div>
      <div className="flex flex-col">
        <div className="text-white font-semibold text-sm">{weather.condition}</div>
        <div className="text-white/70 text-xs flex items-center gap-2">
          <span>{Math.round(weather.temperature)}°C</span>
          {weather.windSpeed && (
            <>
              <span>•</span>
              <Wind className="h-3 w-3" />
              <span>{Math.round(weather.windSpeed)} km/h</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
