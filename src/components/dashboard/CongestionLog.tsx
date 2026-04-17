'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Clock, TrendingUp } from 'lucide-react';

interface CongestionEvent {
  id: string;
  zoneName: string;
  congestion: number;
  severity: 'red' | 'yellow' | 'green';
  timestamp: number;
  location: { lat: number; lng: number };
}

export default function CongestionLog() {
  const [events, setEvents] = useState<CongestionEvent[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    heaviestZone: '',
    avgCongestion: 0
  });

  useEffect(() => {
    const updateEvents = setInterval(() => {
      const congestionEvents = (window as any).__congestionEvents || [];
      
      // Get events from last 5 minutes
      const recentEvents = congestionEvents.filter((e: CongestionEvent) => 
        Date.now() - e.timestamp < 5 * 60 * 1000
      );
      
      setEvents(recentEvents.reverse()); // Most recent first
      
      // Calculate stats
      if (recentEvents.length > 0) {
        const zoneCounts = recentEvents.reduce((acc: any, e: CongestionEvent) => {
          acc[e.zoneName] = (acc[e.zoneName] || 0) + 1;
          return acc;
        }, {});
        
        const heaviest = Object.entries(zoneCounts).reduce((a: any, b: any) => 
          a[1] > b[1] ? a : b
        );
        
        const avgCong = recentEvents.reduce((sum: number, e: CongestionEvent) => 
          sum + e.congestion, 0) / recentEvents.length;
        
        setStats({
          totalEvents: recentEvents.length,
          heaviestZone: heaviest[0],
          avgCongestion: Math.round(avgCong)
        });
      }
    }, 1000); // Update every second
    
    return () => clearInterval(updateEvents);
  }, []);

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="bg-gray-900/90 border border-cyan-500/40 rounded-lg p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Live Congestion Log
        </h3>
        <span className="text-xs text-gray-500">Last 5 minutes</span>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Events</div>
          <div className="text-xl font-bold text-red-400">{stats.totalEvents}</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Avg Congestion</div>
          <div className="text-xl font-bold text-yellow-400">{stats.avgCongestion}%</div>
        </div>
        <div className="bg-orange-900/20 border border-orange-500/30 rounded p-2">
          <div className="text-xs text-gray-400 mb-1 truncate">Hotspot</div>
          <div className="text-sm font-bold text-orange-400 truncate" title={stats.heaviestZone}>
            {stats.heaviestZone || 'N/A'}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No congestion events logged</p>
          </div>
        ) : (
          events.slice(0, 20).map((event) => (
            <div
              key={event.id}
              className="bg-gray-800/50 border border-red-500/20 rounded p-3 hover:border-red-500/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    event.severity === 'red' ? 'bg-red-500 animate-pulse' :
                    event.severity === 'yellow' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className="font-semibold text-white text-sm">
                    {event.zoneName}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(event.timestamp)}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-red-400" />
                  <span className="text-red-400 font-semibold">{event.congestion}%</span> congestion
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800 text-center text-xs text-gray-500">
          Showing {Math.min(events.length, 20)} of {events.length} events
        </div>
      )}
    </div>
  );
}
