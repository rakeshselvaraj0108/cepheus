'use client';

import { useEffect, useState } from 'react';
import { useTraffic } from '@/lib/TrafficContext';

export default function SimulationController() {
  const { vehicles } = useTraffic();
  const [serverStats, setServerStats] = useState<{ running: boolean, activeRoutes: number } | null>(null);

  // Poll for SERVER simulation status instead of running client physics
  useEffect(() => {
    const checkServerStatus = async () => {
         try {
             // We can check simulation status via a new endpoint or just infer it
             // For now, let's just count active vehicles from context
             // In V3, the server handles everything. We just watch.
             setServerStats({
                 running: true, // Assumed if we are getting updates
                 activeRoutes: vehicles.filter(v => v.status === 'in-transit').length
             });
         } catch(e) {}
    };

    const interval = setInterval(checkServerStatus, 5000);
    checkServerStatus();
    return () => clearInterval(interval);
  }, [vehicles]); // Only re-run if vehicle list changes

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 border border-cyan-500/40 p-3 rounded-lg text-xs text-cyan-300 font-mono shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 font-semibold">SERVER CONTROLLED</span>
        </span>
      </div>
      <div className="text-[10px] text-cyan-400/70 space-y-0.5 mt-2 border-t border-cyan-500/20 pt-2">
          <div>Active Vehicles: {serverStats?.activeRoutes || 0}</div>
          <div>Mode: 8x Speed | 300ms Tick (v21.5)</div>
      </div>
    </div>
  );
}