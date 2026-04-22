'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
interface AnalyticsData {
  fleet: { total: number; active: number; idle: number; maintenance: number; byType: { truck: number; van: number; car: number } };
  fuel: { averageLevel: number; lowFuelCount: number; criticalFuelCount: number; totalConsumedPercent: number; totalCostINR: number; byVehicle: any[] };
  congestion: { average: number; redZones: number; yellowZones: number; greenZones: number; zones: { name: string; congestion: number; vehicleCount: number }[] };
  routes: { activeRoutes: number; totalDistanceKm: number; totalTimeMins: number };
  speed: { average: number; max: number; distribution: { stopped: number; slow: number; moderate: number; fast: number } };
  ai: { total: number; reroute: number; continue_action: number; slow_down: number; speed_up: number; refuel: number; avgConfidence?: number };
  incidents: { active: number; critical: number; byType: { accident: number; roadwork: number; weather: number; other: number } };
  impact: { co2SavedKg: number; timeSavedMinutes: number; estimatedKmSaved: number; fuelSavedLiters: number };
  fuelStations: { total: number; avgPrice: number };
  timestamp: string;
}

// --- ANIMATED COUNTER ---
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = displayed;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{displayed.toFixed(decimals)}{suffix}</span>;
}

// --- BAR ---
function Bar({ value, max, color, label, showValue = true }: { value: number; max: number; color: string; label: string; showValue?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-white/50 w-28 truncate text-right">{label}</span>
      <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full relative"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-full" />
        </motion.div>
        {showValue && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/70">
            {Math.round(value)}
          </span>
        )}
      </div>
    </div>
  );
}

// --- DONUT CHART (Pure CSS/SVG) ---
function DonutChart({ segments, size = 140 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="text-white/30 text-sm text-center">No data</div>;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashArray = circumference * pct;
          const dashOffset = circumference * accumulated;
          accumulated += pct;
          return (
            <circle
              key={i}
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={-dashOffset}
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 4px ${seg.color}40)` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-black text-white">{total}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}

// --- GLASS CARD ---
function GlassCard({ children, className = '', delay = 0, glow }: { children: React.ReactNode; className?: string; delay?: number; glow?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-5 overflow-hidden ${className}`}
      style={glow ? { boxShadow: `0 0 40px ${glow}15, inset 0 1px 0 ${glow}10` } : {}}
    >
      {children}
    </motion.div>
  );
}

// --- MAIN PAGE ---
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Analytics fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Refresh every 8s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#080B12] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const fleetUtil = data.fleet.total > 0 ? Math.round((data.fleet.active / data.fleet.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080B12] text-white p-6 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            📊 Analytics & <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">Real-time fleet intelligence • All data from live database</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
          <span className="text-white/30 text-xs">Updated {lastUpdated}</span>
        </div>
      </div>

      {/* ROW 1: Impact KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'CO₂ Saved', value: data.impact.co2SavedKg, suffix: ' kg', icon: '🌍', color: '#22c55e', desc: 'Via AI rerouting' },
          { label: 'Time Saved', value: data.impact.timeSavedMinutes, suffix: ' min', icon: '⏱️', color: '#3b82f6', desc: 'Smart routing' },
          { label: 'Fuel Saved', value: data.impact.fuelSavedLiters, suffix: ' L', icon: '⛽', color: '#f59e0b', desc: 'Optimized paths' },
          { label: 'Km Optimized', value: data.impact.estimatedKmSaved, suffix: ' km', icon: '🛣️', color: '#8b5cf6', desc: 'Distance reduced' },
        ].map((kpi, i) => (
          <GlassCard key={i} delay={i * 0.1} glow={kpi.color}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
                <p className="text-3xl font-black mt-1" style={{ color: kpi.color }}>
                  <AnimatedNumber value={kpi.value} suffix={kpi.suffix} decimals={1} />
                </p>
                <p className="text-white/25 text-[10px] mt-1">{kpi.desc}</p>
              </div>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ROW 2: Fleet + Congestion + Fuel */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Fleet Status */}
        <GlassCard delay={0.4} glow="#3b82f6">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Fleet Status
          </h3>
          <div className="flex items-center gap-6">
            <DonutChart segments={[
              { value: data.fleet.active, color: '#22c55e', label: 'Active' },
              { value: data.fleet.idle, color: '#6b7280', label: 'Idle' },
              { value: data.fleet.maintenance, color: '#ef4444', label: 'Maintenance' },
            ]} />
            <div className="flex-1 space-y-2">
              {[
                { label: 'In Transit', value: data.fleet.active, color: '#22c55e' },
                { label: 'Idle', value: data.fleet.idle, color: '#6b7280' },
                { label: 'Maintenance', value: data.fleet.maintenance, color: '#ef4444' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-white/50 flex-1">{item.label}</span>
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">Fleet Utilization</span>
                  <span className="font-bold text-cyan-400">{fleetUtil}%</span>
                </div>
              </div>
            </div>
          </div>
          {/* Vehicle types */}
          <div className="mt-4 pt-3 border-t border-white/5 flex gap-4">
            {[
              { icon: '🚛', label: 'Trucks', count: data.fleet.byType.truck },
              { icon: '🚐', label: 'Vans', count: data.fleet.byType.van },
              { icon: '🚗', label: 'Cars', count: data.fleet.byType.car },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-white/40">
                <span>{t.icon}</span> {t.count} {t.label}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Zone Congestion */}
        <GlassCard delay={0.5} glow="#ef4444">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Zone Congestion
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-center px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 flex-1">
              <p className="text-2xl font-black text-red-400">{data.congestion.redZones}</p>
              <p className="text-[10px] text-red-400/60 uppercase">Red</p>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex-1">
              <p className="text-2xl font-black text-yellow-400">{data.congestion.yellowZones}</p>
              <p className="text-[10px] text-yellow-400/60 uppercase">Yellow</p>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 flex-1">
              <p className="text-2xl font-black text-green-400">{data.congestion.greenZones}</p>
              <p className="text-[10px] text-green-400/60 uppercase">Green</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
            {data.congestion.zones
              .sort((a, b) => b.congestion - a.congestion)
              .map((zone, i) => (
                <Bar
                  key={i}
                  value={zone.congestion}
                  max={100}
                  color={zone.congestion >= 80 ? '#ef4444' : zone.congestion >= 50 ? '#f59e0b' : '#22c55e'}
                  label={zone.name}
                />
              ))}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-center">
            <span className="text-white/30 text-xs">Avg Congestion: </span>
            <span className="text-lg font-black" style={{ color: data.congestion.average >= 70 ? '#ef4444' : data.congestion.average >= 40 ? '#f59e0b' : '#22c55e' }}>
              {data.congestion.average}%
            </span>
          </div>
        </GlassCard>

        {/* Fuel Economy */}
        <GlassCard delay={0.6} glow="#f59e0b">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Fuel Economy
          </h3>
          {/* Big fuel gauge */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#ffffff08" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke={data.fuel.averageLevel > 50 ? '#22c55e' : data.fuel.averageLevel > 20 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(data.fuel.averageLevel / 100) * 314} 314`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black">{Math.round(data.fuel.averageLevel)}%</span>
                <span className="text-[10px] text-white/30">AVG FUEL</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">⚠️ Low Fuel Vehicles</span>
              <span className="font-bold text-amber-400">{data.fuel.lowFuelCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">🚨 Critical Fuel</span>
              <span className="font-bold text-red-400">{data.fuel.criticalFuelCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">💰 Total Fuel Cost</span>
              <span className="font-bold text-white">₹<AnimatedNumber value={data.fuel.totalCostINR} decimals={0} /></span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">⛽ Stations Available</span>
              <span className="font-bold text-green-400">{data.fuelStations.total}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ROW 3: AI Decisions + Speed + Incidents */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* AI Decision Intelligence */}
        <GlassCard delay={0.7} glow="#8b5cf6">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> AI Decision Intelligence
          </h3>
          <div className="text-center mb-4">
            <p className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              <AnimatedNumber value={data.ai.total} decimals={0} />
            </p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Total AI Decisions Made</p>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Reroute', value: data.ai.reroute, color: '#ef4444', icon: '🔄' },
              { label: 'Continue', value: data.ai.continue_action, color: '#22c55e', icon: '▶️' },
              { label: 'Slow Down', value: data.ai.slow_down, color: '#f59e0b', icon: '🐢' },
              { label: 'Speed Up', value: data.ai.speed_up, color: '#3b82f6', icon: '🏎️' },
              { label: 'Refuel', value: data.ai.refuel, color: '#a855f7', icon: '⛽' },
            ].map((d, i) => (
              <Bar key={i} value={d.value} max={Math.max(data.ai.total, 1)} color={d.color} label={`${d.icon} ${d.label}`} />
            ))}
          </div>
          {data.ai.avgConfidence ? (
            <div className="mt-3 pt-2 border-t border-white/5 text-center">
              <span className="text-white/30 text-xs">Avg Confidence: </span>
              <span className="text-sm font-bold text-purple-400">{(data.ai.avgConfidence as number * 100).toFixed(0)}%</span>
            </div>
          ) : null}
        </GlassCard>

        {/* Speed Distribution */}
        <GlassCard delay={0.8} glow="#06b6d4">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Speed Analytics
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
              <p className="text-2xl font-black text-cyan-400"><AnimatedNumber value={data.speed.average} decimals={1} /></p>
              <p className="text-[10px] text-white/30">AVG km/h</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-2xl font-black text-blue-400"><AnimatedNumber value={data.speed.max} decimals={1} /></p>
              <p className="text-[10px] text-white/30">MAX km/h</p>
            </div>
          </div>
          <div className="space-y-2">
            <Bar value={data.speed.distribution.stopped} max={data.fleet.total || 1} color="#6b7280" label="🛑 Stopped" />
            <Bar value={data.speed.distribution.slow} max={data.fleet.total || 1} color="#ef4444" label="🐌 Slow (<20)" />
            <Bar value={data.speed.distribution.moderate} max={data.fleet.total || 1} color="#f59e0b" label="🚗 Moderate" />
            <Bar value={data.speed.distribution.fast} max={data.fleet.total || 1} color="#22c55e" label="🏎️ Fast (>50)" />
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Active Routes</span>
              <span className="font-bold text-cyan-400">{data.routes.activeRoutes}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-white/30">Total Distance</span>
              <span className="font-bold text-white">{data.routes.totalDistanceKm} km</span>
            </div>
          </div>
        </GlassCard>

        {/* Incidents */}
        <GlassCard delay={0.9} glow="#ef4444">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> Live Incidents
          </h3>
          <div className="flex items-center gap-6 mb-4">
            <DonutChart
              size={110}
              segments={[
                { value: data.incidents.byType.accident, color: '#ef4444', label: 'Accident' },
                { value: data.incidents.byType.roadwork, color: '#f59e0b', label: 'Roadwork' },
                { value: data.incidents.byType.weather, color: '#3b82f6', label: 'Weather' },
                { value: data.incidents.byType.other, color: '#8b5cf6', label: 'Other' },
              ]}
            />
            <div className="flex-1 space-y-2">
              {[
                { icon: '💥', label: 'Accidents', value: data.incidents.byType.accident, color: '#ef4444' },
                { icon: '🚧', label: 'Roadwork', value: data.incidents.byType.roadwork, color: '#f59e0b' },
                { icon: '🌧️', label: 'Weather', value: data.incidents.byType.weather, color: '#3b82f6' },
                { icon: '⚠️', label: 'Other', value: data.incidents.byType.other, color: '#8b5cf6' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span>{item.icon}</span>
                  <span className="text-white/50 flex-1">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
            <p className="text-xs text-red-400/60 uppercase tracking-wider">Critical Incidents</p>
            <p className="text-3xl font-black text-red-400">{data.incidents.critical}</p>
          </div>
        </GlassCard>
      </div>

      {/* ROW 4: Per-Vehicle Fuel Breakdown */}
      {data.fuel.byVehicle.length > 0 && (
        <GlassCard delay={1.0} glow="#f59e0b" className="mb-6">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Per-Vehicle Fuel Consumption
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.fuel.byVehicle.map((v, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span>{v.type === 'truck' ? '🚛' : v.type === 'van' ? '🚐' : '🚗'}</span>
                  <span className="text-xs font-medium text-white/70 truncate">{v.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">{v.litersUsed.toFixed(1)}L used</span>
                  <span className="font-bold text-amber-400">₹{Math.round(v.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Footer */}
      <div className="text-center text-white/15 text-xs mt-8">
        <p>Powered by Trafficmaxxers AI Engine • Real-time data from SQLite Database • All metrics computed from live fleet state</p>
      </div>
    </div>
  );
}
