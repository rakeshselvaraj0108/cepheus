'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface AnalyticsData {
  fleet: { total: number; active: number; idle: number; maintenance: number; byType: { truck: number; van: number; car: number } };
  fuel: { averageLevel: number; lowFuelCount: number; criticalFuelCount: number; totalCostINR: number; byVehicle: any[] };
  congestion: { average: number; redZones: number; yellowZones: number; greenZones: number; zones: { name: string; congestion: number; vehicleCount: number }[] };
  routes: { activeRoutes: number; totalDistanceKm: number; totalTimeMins: number };
  speed: { average: number; max: number; distribution: { stopped: number; slow: number; moderate: number; fast: number } };
  ai: { total: number; reroute: number; continue_action: number; slow_down: number; speed_up: number; refuel: number; avgConfidence?: number };
  incidents: { active: number; critical: number; byType: { accident: number; roadwork: number; weather: number; other: number } };
  impact: { co2SavedKg: number; timeSavedMinutes: number; estimatedKmSaved: number; fuelSavedLiters: number };
  fuelStations: { total: number; avgPrice: number };
  csvInsights: {
    datasetSize: number; currentTimeBlock: string; currentBlockRows: number;
    totalAreas: number; totalRoads: number;
    trafficVolume: { total: number; average: number };
    congestionBreakdown: { High: number; Medium: number; Low: number };
    avgTravelTimeIndex: number; avgCapacityUtilization: number;
    avgSignalCompliance: number; avgPublicTransportUsage: number;
    avgEnvironmentalImpact: number; avgPedestrianCount: number;
    topCongestedRoads: { road: string; volume: number; avgSpeed: number }[];
    areaAvgSpeeds: { area: string; avgSpeed: number }[];
    weatherDistribution: Record<string, number>;
    trafficSituations: Record<string, number>;
    historicalIncidentRate: number;
  };
  timestamp: string;
}

/* ── Animated counter ── */
function N({ value, suffix = '', prefix = '', dp = 0 }: { value: number; suffix?: string; prefix?: string; dp?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const s = n, e = value, dur = 700, t0 = Date.now();
    const id = setInterval(() => { const p = Math.min((Date.now() - t0) / dur, 1); setN(s + (e - s) * (1 - Math.pow(1 - p, 3))); if (p >= 1) clearInterval(id); }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <>{prefix}{n.toFixed(dp)}{suffix}</>;
}

/* ── Progress bar ── */
function Bar({ pct, color = '#3b82f6' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8 }}
        className="h-full rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}

/* ── Card ── */
function Card({ children, className = '', d = 0 }: { children: React.ReactNode; className?: string; d?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: d }}
      className={`rounded-xl border border-white/[0.06] bg-[#0d1117] p-5 ${className}`}>
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.12em] mb-4">{children}</h3>;
}

/* ── Semicircle gauge ── */
function Gauge({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f59e0b' : '#22c55e';
  const r = 42, circ = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="w-24">
        <path d="M 8 54 A 42 42 0 0 1 92 54" fill="none" stroke="#ffffff06" strokeWidth="6" strokeLinecap="round" />
        <path d="M 8 54 A 42 42 0 0 1 92 54" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`} className="transition-all duration-1000" />
      </svg>
      <p className="text-lg font-semibold text-white -mt-3">{Math.round(value)}%</p>
      <p className="text-[10px] text-white/25 mt-0.5">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════ MAIN PAGE ═══════════════════════════════════ */
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/analytics');
      const j = await r.json();
      if (j.success) { setData(j); setTs(new Date().toLocaleTimeString()); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, [load]);

  if (loading || !data) return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const util = data.fleet.total > 0 ? Math.round((data.fleet.active / data.fleet.total) * 100) : 0;
  const csv = data.csvInsights;
  const totalSit = Object.values(csv.trafficSituations).reduce((s, v) => s + v, 0);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white/90 p-6 pb-16 overflow-y-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="text-xs text-white/30 mt-1">
            Live fleet data + <span className="text-blue-400">{csv.datasetSize.toLocaleString()}</span> rows of real Bangalore traffic data
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/15 text-blue-400 text-[10px] font-medium">
            {csv.currentTimeBlock} Block
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {ts}
        </div>
      </div>

      {/* ── Row 1: Top KPIs ── */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {[
          { l: 'Fleet Size', v: data.fleet.total, s: '', dp: 0, sub: `${data.fleet.active} in transit` },
          { l: 'Avg Speed', v: data.speed.average, s: ' km/h', dp: 1, sub: `Peak ${data.speed.max} km/h` },
          { l: 'Avg Fuel', v: data.fuel.averageLevel, s: '%', dp: 0, sub: `${data.fuel.lowFuelCount} low` },
          { l: 'Traffic Vol.', v: csv.trafficVolume.average, s: '', dp: 0, sub: `${csv.currentTimeBlock} avg` },
          { l: 'Travel Index', v: csv.avgTravelTimeIndex, s: 'x', dp: 2, sub: csv.avgTravelTimeIndex > 1.5 ? 'Heavy delay' : 'Normal' },
          { l: 'AI Decisions', v: data.ai.total, s: '', dp: 0, sub: `${data.ai.reroute} reroutes` },
        ].map((k, i) => (
          <Card key={i} d={i * 0.04}>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{k.l}</p>
            <p className="text-xl font-semibold text-white mt-1"><N value={k.v} suffix={k.s} dp={k.dp} /></p>
            <p className="text-[10px] text-white/20 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Row 2: Fleet · Zones · Fuel ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Fleet */}
        <Card d={0.25}>
          <Label>Fleet Composition</Label>
          <div className="space-y-3">
            {[
              { l: 'In Transit', n: data.fleet.active, p: util, c: '#3b82f6' },
              { l: 'Idle', n: data.fleet.idle, p: data.fleet.total > 0 ? (data.fleet.idle / data.fleet.total) * 100 : 0, c: '#6b7280' },
              { l: 'Maintenance', n: data.fleet.maintenance, p: data.fleet.total > 0 ? (data.fleet.maintenance / data.fleet.total) * 100 : 0, c: '#ef4444' },
            ].map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">{r.l}</span>
                  <span className="text-white/60 font-medium">{r.n} <span className="text-white/20">({Math.round(r.p)}%)</span></span>
                </div>
                <Bar pct={r.p} color={r.c} />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04] grid grid-cols-3 gap-2 text-center">
            {[{ n: data.fleet.byType.truck, l: 'Trucks' }, { n: data.fleet.byType.van, l: 'Vans' }, { n: data.fleet.byType.car, l: 'Cars' }].map((t, i) => (
              <div key={i}><p className="text-lg font-semibold text-white">{t.n}</p><p className="text-[10px] text-white/20">{t.l}</p></div>
            ))}
          </div>
        </Card>

        {/* Zone Congestion */}
        <Card d={0.3}>
          <Label>Traffic Zones (Live)</Label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { n: data.congestion.greenZones, l: 'Clear', c: 'text-emerald-400', bg: 'bg-emerald-500/[0.06] border-emerald-500/10' },
              { n: data.congestion.yellowZones, l: 'Moderate', c: 'text-amber-400', bg: 'bg-amber-500/[0.06] border-amber-500/10' },
              { n: data.congestion.redZones, l: 'Heavy', c: 'text-red-400', bg: 'bg-red-500/[0.06] border-red-500/10' },
            ].map((z, i) => (
              <div key={i} className={`rounded-lg border p-2 text-center ${z.bg}`}>
                <p className={`text-xl font-semibold ${z.c}`}>{z.n}</p>
                <p className="text-[9px] text-white/25 uppercase">{z.l}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>
            {data.congestion.zones.sort((a, b) => b.congestion - a.congestion).map((z, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-white/35 truncate max-w-[140px]">{z.name}</span>
                  <span className={`font-medium ${z.congestion >= 80 ? 'text-red-400' : z.congestion >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{z.congestion}%</span>
                </div>
                <Bar pct={z.congestion} color={z.congestion >= 80 ? '#ef4444' : z.congestion >= 50 ? '#f59e0b' : '#22c55e'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Fuel */}
        <Card d={0.35}>
          <Label>Fuel Economy</Label>
          <div className="flex justify-center mb-2"><Gauge value={data.fuel.averageLevel} label="Fleet Avg" /></div>
          <div className="space-y-2">
            {[
              { l: 'Low fuel alerts', v: String(data.fuel.lowFuelCount), c: 'text-amber-400' },
              { l: 'Critical (< 5%)', v: String(data.fuel.criticalFuelCount), c: 'text-red-400' },
              { l: 'Total fuel cost', v: `₹${data.fuel.totalCostINR.toLocaleString()}`, c: 'text-white/60' },
              { l: 'Fuel stations', v: String(data.fuelStations.total), c: 'text-white/40' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-white/30">{r.l}</span><span className={`font-medium ${r.c}`}>{r.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3: REAL CSV DATA — Bangalore Traffic Intelligence ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold text-white/70">Bangalore Traffic Intelligence</h2>
          <span className="text-[10px] text-white/20 ml-1">from {csv.datasetSize.toLocaleString()} data points · {csv.totalAreas} areas · {csv.totalRoads} roads</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Top Congested Roads */}
        <Card d={0.4} className="col-span-2">
          <Label>Busiest Roads — {csv.currentTimeBlock} Block</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Road', 'Volume', 'Avg Speed'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-white/20 font-medium uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.topCongestedRoads.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                    <td className="py-2 px-3 text-white/50 font-medium">{r.road}</td>
                    <td className="py-2 px-3 text-white/40">{r.volume.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className={`font-medium ${r.avgSpeed < 25 ? 'text-red-400' : r.avgSpeed < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {r.avgSpeed} km/h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Traffic Situation Breakdown */}
        <Card d={0.45}>
          <Label>Traffic Situation (Real CSV)</Label>
          <div className="space-y-2.5">
            {Object.entries(csv.trafficSituations).sort(([, a], [, b]) => (b as number) - (a as number)).map(([sit, count], i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-white/40">{sit}</span>
                  <span className="text-white/50 font-medium">{(count as number).toLocaleString()}</span>
                </div>
                <Bar pct={totalSit > 0 ? ((count as number) / totalSit) * 100 : 0} color={sit === 'High' ? '#ef4444' : sit === 'Medium' ? '#f59e0b' : '#22c55e'} />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <Label>Congestion Breakdown</Label>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-semibold text-red-400">{csv.congestionBreakdown.High}</p><p className="text-[9px] text-white/20">High</p></div>
              <div><p className="text-lg font-semibold text-amber-400">{csv.congestionBreakdown.Medium}</p><p className="text-[9px] text-white/20">Medium</p></div>
              <div><p className="text-lg font-semibold text-emerald-400">{csv.congestionBreakdown.Low}</p><p className="text-[9px] text-white/20">Low</p></div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 4: Area Speeds · Impact · City Metrics ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Area Average Speeds */}
        <Card d={0.5}>
          <Label>Area Avg Speed ({csv.currentTimeBlock})</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>
            {csv.areaAvgSpeeds.map((a, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-white/35">{a.area}</span>
                  <span className={`font-medium ${a.avgSpeed < 25 ? 'text-red-400' : a.avgSpeed < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{a.avgSpeed} km/h</span>
                </div>
                <Bar pct={(a.avgSpeed / 60) * 100} color={a.avgSpeed < 25 ? '#ef4444' : a.avgSpeed < 40 ? '#f59e0b' : '#22c55e'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Environmental Impact */}
        <Card d={0.55}>
          <Label>Environmental Impact</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: 'CO₂ Reduced', v: data.impact.co2SavedKg, u: ' kg' },
              { l: 'Time Saved', v: data.impact.timeSavedMinutes, u: ' min' },
              { l: 'Fuel Saved', v: data.impact.fuelSavedLiters, u: ' L' },
              { l: 'Distance Opt.', v: data.impact.estimatedKmSaved, u: ' km' },
            ].map((m, i) => (
              <div key={i} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{m.l}</p>
                <p className="text-lg font-semibold text-white"><N value={m.v} dp={1} suffix={m.u} /></p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-white/25">Env. Impact Index</span><span className="text-white/50 font-medium">{csv.avgEnvironmentalImpact}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/25">Incident Rate</span><span className="text-white/50 font-medium">{csv.historicalIncidentRate}/observation</span></div>
          </div>
        </Card>

        {/* City Infrastructure Metrics */}
        <Card d={0.6}>
          <Label>Bangalore City Metrics (CSV)</Label>
          <div className="space-y-3">
            {[
              { l: 'Road Capacity Used', v: csv.avgCapacityUtilization, max: 100, c: csv.avgCapacityUtilization > 80 ? '#ef4444' : '#3b82f6' },
              { l: 'Signal Compliance', v: csv.avgSignalCompliance, max: 100, c: csv.avgSignalCompliance > 70 ? '#22c55e' : '#f59e0b' },
              { l: 'Public Transport Usage', v: csv.avgPublicTransportUsage, max: 100, c: '#8b5cf6' },
            ].map((m, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white/35">{m.l}</span>
                  <span className="text-white/50 font-medium">{m.v}%</span>
                </div>
                <Bar pct={m.v} color={m.c} />
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-white/25">Avg Pedestrians</span><span className="text-white/50">{csv.avgPedestrianCount}/zone</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/25">Active Incidents</span><span className="text-red-400 font-medium">{data.incidents.active}</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/25">Weather</span><span className="text-white/50">{Object.keys(csv.weatherDistribution).join(', ') || 'N/A'}</span></div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 5: Vehicle Fuel Table ── */}
      {data.fuel.byVehicle.length > 0 && (
        <Card d={0.7}>
          <Label>Vehicle Fuel Breakdown</Label>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Vehicle', 'Type', 'Fuel Used (L)', 'Cost (₹)'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-white/20 font-medium uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.fuel.byVehicle.map((v, i) => (
                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="py-2 px-3 text-white/50 font-medium">{v.name || v.id}</td>
                  <td className="py-2 px-3 text-white/30 capitalize">{v.type}</td>
                  <td className="py-2 px-3 text-white/40">{v.litersUsed.toFixed(1)}</td>
                  <td className="py-2 px-3 text-white/50 font-medium">₹{Math.round(v.cost).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-center text-[10px] text-white/10 mt-8">
        All fleet metrics from live SQLite DB · Traffic data from {csv.datasetSize.toLocaleString()}-row Bangalore dataset · Refreshes every 10s
      </p>
    </div>
  );
}
