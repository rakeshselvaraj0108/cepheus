'use client';
import { RealTrafficMap as TrafficMap } from '@/components/visualization/RealTrafficMap';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WeatherDisplay } from '@/components/dashboard/WeatherDisplay';
import TrafficNotifications from '@/components/dashboard/TrafficNotifications';
import { useTraffic } from '@/lib/TrafficContext';
import { Truck, Car, AlertTriangle, Layers, Navigation } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapPage() {
    const { stats, isSimulating } = useTraffic();
    const [vehicleFilter, setVehicleFilter] = useState<'all' | 'truck' | 'car' | 'van'>('all');
    const [showIncidents, setShowIncidents] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="h-[calc(100vh-140px)] flex gap-4 relative">
            {/* Traffic Notifications */}
            <TrafficNotifications />

            {/* Map Container */}
            <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative shadow-2xl bg-black">
                <div className="absolute inset-0">
                    <div className="h-full w-full [&>div]:h-full">
                        <TrafficMap vehicleFilter={vehicleFilter} showIncidents={showIncidents} />
                    </div>
                </div>

                {/* Floating Map Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 items-end">
                    {/* Weather Display */}
                    <WeatherDisplay />
                    
                    <div className="flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${vehicleFilter === 'all' ? 'bg-[--color-primary] text-white hover:bg-[--color-primary]/90' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            onClick={() => setVehicleFilter('all')}
                            title="All Vehicles"
                        >
                            <Layers className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${vehicleFilter === 'truck' ? 'bg-[--color-primary] text-white hover:bg-[--color-primary]/90' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            onClick={() => setVehicleFilter('truck')}
                            title="Heavy Trucks"
                        >
                            <Truck className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${vehicleFilter === 'car' ? 'bg-[--color-primary] text-white hover:bg-[--color-primary]/90' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            onClick={() => setVehicleFilter('car')}
                            title="Response Units"
                        >
                            <Car className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowIncidents(!showIncidents)}
                        className={`shadow-lg backdrop-blur-md transition-all gap-2 text-xs font-bold ${showIncidents ? 'bg-red-500 hover:bg-red-600 text-white border-red-400' : 'bg-black/60 hover:bg-black/80 text-white/60 border-white/10 border'}`}
                    >
                        <AlertTriangle className={`h-3 w-3 ${showIncidents ? 'animate-pulse' : ''}`} />
                        {showIncidents ? 'INCIDENTS ON' : 'INCIDENTS OFF'}
                    </Button>
                </div>
            </div>

            {/* Sidebar Toggle (Mobile) */}
            <Button
                variant="outline"
                size="sm"
                className="absolute left-4 top-4 z-20 md:hidden bg-black/50 backdrop-blur"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                {isSidebarOpen ? 'Hide' : 'Info'}
            </Button>

            {/* Interactive Sidebar Info Panel */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0, x: 20 }}
                        animate={{ width: 320, opacity: 1, x: 0 }}
                        exit={{ width: 0, opacity: 0, x: 20 }}
                        className="hidden md:flex flex-col gap-4"
                    >
                        <Card className="h-full p-5 bg-[--color-surface-100]/90 backdrop-blur-xl border-white/10 space-y-6 overflow-y-auto">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2 text-[--color-primary]">
                                    <Navigation className="h-5 w-5" />
                                    Live Operations
                                </h2>
                                <p className="text-xs text-[--foreground]/60 mt-2 leading-relaxed">
                                    Real-time tracking of <span className="text-white font-mono font-bold">{stats.totalVehicles} units</span> across Bangalore sector. Map data powered by local vector tiles.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[--color-primary]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="text-[10px] font-bold tracking-wider text-[--foreground]/40 uppercase mb-1">Active Units</div>
                                    <div className="text-3xl font-mono font-bold text-white tracking-tight">{stats.activeVehicles}</div>
                                </div>
                                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="text-[10px] font-bold tracking-wider text-red-300 uppercase mb-1">Incidents</div>
                                    <div className="text-3xl font-mono font-bold text-red-400 tracking-tight">{stats.totalIncidents}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-xs font-bold uppercase text-[--foreground]/40 px-1">Quick Filters</div>

                                <button
                                    onClick={() => setVehicleFilter('all')}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all border ${vehicleFilter === 'all' ? 'bg-[--color-primary]/10 text-white border-[--color-primary]/50 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' : 'bg-transparent text-[--foreground]/60 border-transparent hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="flex items-center gap-3 font-medium"><Layers className="h-4 w-4" /> All Units</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">{stats.totalVehicles}</span>
                                </button>

                                <button
                                    onClick={() => setVehicleFilter('truck')}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all border ${vehicleFilter === 'truck' ? 'bg-[--color-primary]/10 text-white border-[--color-primary]/50 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' : 'bg-transparent text-[--foreground]/60 border-transparent hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="flex items-center gap-3 font-medium"><Truck className="h-4 w-4" /> Logistics</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">Sim</span>
                                </button>

                                <button
                                    onClick={() => setVehicleFilter('car')}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all border ${vehicleFilter === 'car' ? 'bg-[--color-primary]/10 text-white border-[--color-primary]/50 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' : 'bg-transparent text-[--foreground]/60 border-transparent hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="flex items-center gap-3 font-medium"><Car className="h-4 w-4" /> Response</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">Sim</span>
                                </button>
                            </div>

                            <div className="pt-6 mt-auto border-t border-white/10 space-y-4">
                                <div className="text-xs font-bold uppercase text-[--foreground]/40 px-1">System Diagnostics</div>
                                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[--foreground]/60 font-medium">Simulation</span>
                                        <span className={`flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider ${isSimulating ? 'text-green-400' : 'text-yellow-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                            {isSimulating ? 'ONLINE' : 'PAUSED'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[--foreground]/60 font-medium">Data Feed</span>
                                        <span className="text-[10px] font-mono tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">MBTILES</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[--foreground]/60 font-medium">Center</span>
                                        <span className="text-[10px] font-mono text-[--foreground]/40">12.9716° N</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
