'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react';

interface TrafficAlert {
  id: string;
  zoneName: string;
  severity: 'red' | 'yellow' | 'green';
  congestion: number;
  dotCount: number;
  timestamp: Date;
  message: string;
}

export default function TrafficNotifications() {
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for traffic updates from the map
    const checkTraffic = setInterval(() => {
      const congestionEvents = (window as any).__congestionEvents || [];
      
      // Get recent red alerts (last 2 minutes)
      const recentRedAlerts = congestionEvents
        .filter((e: any) => e.severity === 'red' && Date.now() - e.timestamp < 120000)
        .slice(-10); // Last 10
      
      recentRedAlerts.forEach((event: any) => {
        const existingAlert = alerts.find(a => a.id === event.id);
        
        if (!existingAlert) {
          const newAlert: TrafficAlert = {
            id: event.id,
            zoneName: event.zoneName,
            severity: 'red',
            congestion: event.congestion,
            dotCount: 0,
            timestamp: new Date(event.timestamp),
            message: `Heavy congestion detected in ${event.zoneName}`
          };
          
          setAlerts(prev => [newAlert, ...prev].slice(0, 20)); // Keep last 20
          
          // Auto-open notification panel
          setIsOpen(true);
          
          // Play notification sound (optional)
          try {
            new Audio('/notification.mp3').play().catch(() => {});
          } catch (e) {}
        }
      });
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(checkTraffic);
  }, [alerts]);

  const unreadCount = alerts.filter(a => Date.now() - a.timestamp.getTime() < 120000).length;

  return (
    <>
      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-gray-900/90 border border-cyan-500/40 rounded-lg p-3 hover:bg-gray-800 transition-colors"
        >
          <Bell className="w-5 h-5 text-cyan-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-gray-900/95 border border-cyan-500/40 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Traffic Alerts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No traffic alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {alerts.map(alert => {
                  const isRecent = Date.now() - alert.timestamp.getTime() < 120000;
                  const minutesAgo = Math.floor((Date.now() - alert.timestamp.getTime()) / 60000);
                  
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 hover:bg-gray-800/50 transition-colors ${isRecent ? 'bg-red-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${
                          alert.severity === 'red' ? 'text-red-500' : 
                          alert.severity === 'yellow' ? 'text-yellow-500' : 
                          'text-green-500'
                        }`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white text-sm">
                              {alert.zoneName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`}
                            </span>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <span className={`flex items-center gap-1 ${
                              alert.congestion > 80 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              <TrendingUp className="w-3 h-3" />
                              {alert.congestion}% congestion
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
