'use client';
import { useRouter } from 'next/navigation';
import { useTraffic } from '@/lib/TrafficContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
    Truck, 
    Activity, 
    AlertTriangle, 
    TrendingUp, 
    TrendingDown, 
    Fuel,
    Zap,
    MapPin,
    Clock,
    ArrowRight,
    RefreshCw,
    Car,
    Box
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
    const router = useRouter();
    const { vehicles, zones, incidents, stats, isSimulating, syncData, lastSyncTime } = useTraffic();
    const [timeSinceSync, setTimeSinceSync] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Time since last sync
    useEffect(() => {
        const interval = setInterval(() => {
            if (lastSyncTime) {
                const seconds = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
                setTimeSinceSync(seconds);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastSyncTime]);

    // Manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await syncData();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Get status counts
    const activeVehicles = vehicles.filter(v => v.status === 'active' || v.status ===  'in-transit').length;
    const idleVehicles = vehicles.filter(v => v.status === 'idle').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

    // Get vehicle type counts
    const trucks = vehicles.filter(v => v.type === 'truck').length;
    const cars = vehicles.filter(v => v.type === 'car').length;
    const vans = vehicles.filter(v => v.type === 'van').length;

    // Get average fuel
    const avgFuel = vehicles.length > 0 
        ? Math.round(vehicles.reduce((sum, v) => sum + v.fuel, 0) / vehicles.length) 
        : 0;

    // Get congestion zones
    const highCongestionZones = zones.filter(z => z.congestionLevel >= 70).length;
    const mediumCongestionZones = zones.filter(z => z.congestionLevel >= 40 && z.congestionLevel < 70).length;
    const lowCongestionZones = zones.filter(z => z.congestionLevel < 40).length;

    // Add trend indicators to zones (simulate based on congestion level)
    const zonesWithTrend = zones.map(zone => {
        const rand = Math.random();
        let trend: 'up' | 'down' | 'stable';
        
        if (zone.congestionLevel >= 70) {
            trend = rand > 0.3 ? 'up' : (rand > 0.15 ? 'stable' : 'down');
        } else if (zone.congestionLevel >= 40) {
            trend = rand > 0.5 ? 'stable' : (rand > 0.25 ? 'up' : 'down');
        } else {
            trend = rand > 0.3 ? 'down' : (rand > 0.15 ? 'stable' : 'up');
        }
        
        return { ...zone, trend };
    });

    // Get recent incidents
    const recentIncidents = incidents.slice(0, 5);

    // Get low fuel vehicles
    const lowFuelVehicles = vehicles.filter(v => v.fuel < 30).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                        <Activity className="h-10 w-10 text-[--color-primary]" />
                        System Overview
                    </h1>
                    <p className="text-[--foreground]/60 mt-2">Real-time fleet monitoring and traffic management</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-[--foreground]/60 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Updated {timeSinceSync}s ago</span>
                        {isSimulating && (
                            <span className="flex items-center gap-2 text-green-400 ml-3">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                LIVE SIMULATION
                            </span>
                        )}
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-[--foreground]/60 mb-2">Total Fleet</p>
                                <p className="text-4xl font-bold mb-1">{stats.totalVehicles}</p>
                                <p className="text-xs text-[--foreground]/40">{activeVehicles} active • {idleVehicles} idle</p>
                            </div>
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <Truck className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-semibold">
                                {Math.round((activeVehicles / stats.totalVehicles) * 100)}% Operational
                            </span>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:border-green-500/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-[--foreground]/60 mb-2">Fleet Efficiency</p>
                                <p className="text-4xl font-bold mb-1">{stats.avgEfficiency}%</p>
                                <p className="text-xs text-[--foreground]/40">Average performance</p>
                            </div>
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <Zap className="w-6 h-6 text-green-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            {stats.avgEfficiency >= 80 ? (
                                <>
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-semibold">Excellent Performance</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4 text-orange-400" />
                                    <span className="text-orange-400 font-semibold">Needs Optimization</span>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:border-orange-500/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-[--foreground]/60 mb-2">Traffic Congestion</p>
                                <p className="text-4xl font-bold mb-1">{stats.avgCongestion}%</p>
                                <p className="text-xs text-[--foreground]/40">{zones.length} zones monitored</p>
                            </div>
                            <div className="p-3 bg-orange-500/20 rounded-lg">
                                <Activity className="w-6 h-6 text-orange-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            {stats.avgCongestion >= 70 ? (
                                <>
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-400 font-semibold">Heavy Traffic</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-semibold">Traffic Flowing</span>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-[--foreground]/60 mb-2">Active Incidents</p>
                                <p className="text-4xl font-bold mb-1">{stats.totalIncidents}</p>
                                <p className="text-xs text-[--foreground]/40">Requiring attention</p>
                            </div>
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            {stats.totalIncidents === 0 ? (
                                <span className="text-green-400 font-semibold">All Clear</span>
                            ) : (
                                <span className="text-red-400 font-semibold">{stats.totalIncidents} Active</span>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Fleet Composition & Fuel Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[--color-primary]" />
                        Fleet Composition
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Truck className="w-5 h-5 text-blue-400" />
                                <span className="font-medium">Heavy Trucks</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-32 bg-white/10 rounded-full h-2">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${(trucks / stats.totalVehicles) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="font-bold text-lg min-w-[40px] text-right">{trucks}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Car className="w-5 h-5 text-green-400" />
                                <span className="font-medium">Cars</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-32 bg-white/10 rounded-full h-2">
                                    <div 
                                        className="h-full bg-green-500 rounded-full transition-all"
                                        style={{ width: `${(cars / stats.totalVehicles) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="font-bold text-lg min-w-[40px] text-right">{cars}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Box className="w-5 h-5 text-purple-400" />
                                <span className="font-medium">Vans</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-32 bg-white/10 rounded-full h-2">
                                    <div 
                                        className="h-full bg-purple-500 rounded-full transition-all"
                                        style={{ width: `${(vans / stats.totalVehicles) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="font-bold text-lg min-w-[40px] text-right">{vans}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-green-400">{activeVehicles}</p>
                                    <p className="text-xs text-[--foreground]/60">Active</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-yellow-400">{idleVehicles}</p>
                                    <p className="text-xs text-[--foreground]/60">Idle</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-400">{maintenanceVehicles}</p>
                                    <p className="text-xs text-[--foreground]/60">Maintenance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Fuel className="w-5 h-5 text-[--color-primary]" />
                        Fuel Status
                    </h2>
                    <div className="space-y-4">
                        <div className="text-center py-6 bg-white/5 rounded-lg">
                            <p className="text-5xl font-bold mb-2">{avgFuel}%</p>
                            <p className="text-sm text-[--foreground]/60">Average Fleet Fuel Level</p>
                        </div>

                        {lowFuelVehicles > 0 && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    <p className="font-bold text-red-400">Low Fuel Alert</p>
                                </div>
                                <p className="text-sm text-[--foreground]/60">
                                    {lowFuelVehicles} vehicle{lowFuelVehicles > 1 ? 's' : ''} below 30% fuel
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                    High (≥60%)
                                </span>
                                <span className="font-semibold">
                                    {vehicles.filter(v => v.fuel >= 60).length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                    Medium (30-59%)
                                </span>
                                <span className="font-semibold">
                                    {vehicles.filter(v => v.fuel >= 30 && v.fuel < 60).length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                    Low (&lt;30%)
                                </span>
                                <span className="font-semibold">{lowFuelVehicles}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Traffic Zones & Recent Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <div className="p-2 bg-[--color-primary]/20 rounded-lg">
                                <MapPin className="w-5 h-5 text-[--color-primary]" />
                            </div>
                            Traffic Zones
                        </h2>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/dashboard/map')}
                            className="gap-2 hover:bg-[--color-primary] hover:text-white transition-all"
                        >
                            View Map
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Congestion Summary Cards */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative overflow-hidden group"
                        >
                            <div className="text-center p-4 bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-xl border-2 border-red-500/30 hover:border-red-500/50 transition-all cursor-pointer hover:scale-105 transform duration-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-3xl font-black text-red-400 mb-1 relative z-10">{highCongestionZones}</p>
                                <p className="text-xs font-bold text-red-300 uppercase tracking-wider relative z-10">High</p>
                                <p className="text-[10px] text-[--foreground]/40 mt-1 relative z-10">≥70% congested</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative overflow-hidden group"
                        >
                            <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all cursor-pointer hover:scale-105 transform duration-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-3xl font-black text-yellow-400 mb-1 relative z-10">{mediumCongestionZones}</p>
                                <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider relative z-10">Medium</p>
                                <p className="text-[10px] text-[--foreground]/40 mt-1 relative z-10">40-69% congested</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="relative overflow-hidden group"
                        >
                            <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl border-2 border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer hover:scale-105 transform duration-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-3xl font-black text-green-400 mb-1 relative z-10">{lowCongestionZones}</p>
                                <p className="text-xs font-bold text-green-300 uppercase tracking-wider relative z-10">Low</p>
                                <p className="text-[10px] text-[--foreground]/40 mt-1 relative z-10">&lt;40% congested</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Zone List with Enhanced UI */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {zonesWithTrend.slice(0, 8).map((zone, idx) => (
                            <motion.div
                                key={zone.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative"
                            >
                                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                    zone.congestionLevel >= 70 
                                        ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/50 hover:from-red-500/15 hover:to-red-500/10' 
                                        : zone.congestionLevel >= 40 
                                        ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 hover:from-yellow-500/15 hover:to-yellow-500/10' 
                                        : 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30 hover:border-green-500/50 hover:from-green-500/15 hover:to-green-500/10'
                                }`}>
                                    {/* Zone Info */}
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`p-2 rounded-lg ${
                                            zone.congestionLevel >= 70 ? 'bg-red-500/20' :
                                            zone.congestionLevel >= 40 ? 'bg-yellow-500/20' :
                                            'bg-green-500/20'
                                        }`}>
                                            <MapPin className={`w-4 h-4 ${
                                                zone.congestionLevel >= 70 ? 'text-red-400' :
                                                zone.congestionLevel >= 40 ? 'text-yellow-400' :
                                                'text-green-400'
                                            }`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm mb-0.5">{zone.area}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 max-w-[160px] bg-black/20 rounded-full h-2 overflow-hidden border border-white/10">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${zone.congestionLevel}%` }}
                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                        className={`h-full rounded-full ${
                                                            zone.congestionLevel >= 70 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                                                            zone.congestionLevel >= 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                                            'bg-gradient-to-r from-green-600 to-green-400'
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Congestion Percentage & Trend */}
                                    <div className="flex items-center gap-3">
                                        {/* Trend Indicator */}
                                        <div className={`flex items-center gap-1 ${
                                            zone.trend === 'up' ? 'text-red-400' :
                                            zone.trend === 'down' ? 'text-green-400' :
                                            'text-gray-400'
                                        }`}>
                                            {zone.trend === 'up' ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : zone.trend === 'down' ? (
                                                <TrendingDown className="w-4 h-4" />
                                            ) : (
                                                <Activity className="w-4 h-4" />
                                            )}
                                        </div>

                                        {/* Percentage Badge */}
                                        <div className={`px-3 py-1.5 rounded-lg font-black text-sm min-w-[55px] text-center ${
                                            zone.congestionLevel >= 70 
                                                ? 'bg-red-500/30 text-red-300 border-2 border-red-500/50' 
                                                : zone.congestionLevel >= 40 
                                                ? 'bg-yellow-500/30 text-yellow-300 border-2 border-yellow-500/50' 
                                                : 'bg-green-500/30 text-green-300 border-2 border-green-500/50'
                                        }`}>
                                            {zone.congestionLevel}%
                                        </div>
                                    </div>

                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                        style={{
                                            background: zone.congestionLevel >= 70 
                                                ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1), transparent)' 
                                                : zone.congestionLevel >= 40 
                                                ? 'radial-gradient(circle at center, rgba(234, 179, 8, 0.1), transparent)' 
                                                : 'radial-gradient(circle at center, rgba(34, 197, 94, 0.1), transparent)'
                                        }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* View All Link */}
                    {zones.length > 8 && (
                        <div className="mt-4 text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard/data')}
                                className="text-[--color-primary] hover:text-[--color-primary] hover:bg-[--color-primary]/10"
                            >
                                View all {zones.length} zones
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Recent Incidents
                        </h2>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/dashboard/data')}
                            className="gap-2"
                        >
                            View All
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {recentIncidents.length === 0 ? (
                        <div className="text-center py-12 text-[--foreground]/40">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No active incidents</p>
                            <p className="text-xs mt-1">All systems operating normally</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[248px] overflow-y-auto">
                            {recentIncidents.map((incident) => (
                                <div 
                                    key={incident.id}
                                    className={`p-3 rounded-lg border ${
                                        incident.type === 'accident' ? 'bg-red-500/10 border-red-500/30' :
                                        incident.type === 'congestion' ? 'bg-orange-500/10 border-orange-500/30' :
                                        'bg-yellow-500/10 border-yellow-500/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                            incident.type === 'accident' ? 'bg-red-500/20 text-red-400' :
                                            incident.type === 'congestion' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {incident.type}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded uppercase ${
                                            incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                            incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {incident.severity}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium mb-1">{incident.description}</p>
                                    <p className="text-xs text-[--foreground]/60 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Quick Access Actions */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Quick Access</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                        variant="outline" 
                        className="h-24 flex-col gap-2"
                        onClick={() => router.push('/dashboard/vehicles')}
                    >
                        <Truck className="w-6 h-6" />
                        <span>Fleet Management</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-24 flex-col gap-2"
                        onClick={() => router.push('/dashboard/map')}
                    >
                        <MapPin className="w-6 h-6" />
                        <span>Live Map</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-24 flex-col gap-2"
                        onClick={() => router.push('/dashboard/agent')}
                    >
                        <Activity className="w-6 h-6" />
                        <span>AI Agent</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-24 flex-col gap-2"
                        onClick={() => router.push('/dashboard/data')}
                    >
                        <Activity className="w-6 h-6" />
                        <span>Data Dashboard</span>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
