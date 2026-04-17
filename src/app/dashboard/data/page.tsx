'use client';
import { useState, useEffect } from 'react';
import { useTraffic } from '@/lib/TrafficContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
    ArrowLeft, 
    TrendingUp, 
    TrendingDown, 
    Truck, 
    Car, 
    Activity, 
    AlertTriangle,
    MapPin,
    Fuel,
    Zap,
    Clock,
    Filter,
    Download,
    RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type VehicleStatus = 'active' | 'idle' | 'maintenance';
type IncidentType = 'accident' | 'congestion' | 'roadwork';

export default function DataPage() {
    const router = useRouter();
    const { vehicles, zones, incidents, stats, isSimulating, syncData, lastSyncTime } = useTraffic();
    
    const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'fuel' | 'efficiency'>('name');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-refresh indicator
    const [timeSinceSync, setTimeSinceSync] = useState(0);

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

    // Export data
    const handleExport = () => {
        const exportData = {
            timestamp: new Date().toISOString(),
            vehicles,
            zones,
            incidents,
            stats
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trafficmaxxer-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Filter vehicles
    const filteredVehicles = vehicles
        .filter(v => filterStatus === 'all' || v.status === filterStatus)
        .filter(v => filterType === 'all' || v.type === filterType)
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'fuel') return b.fuel - a.fuel;
            if (sortBy === 'efficiency') return b.efficiency - a.efficiency;
            return 0;
        });

    // Get unique vehicle types
    const vehicleTypes = Array.from(new Set(vehicles.map(v => v.type)));

    // Calculate zone statistics
    const highCongestionZones = zones.filter(z => z.congestionLevel >= 70).length;
    const mediumCongestionZones = zones.filter(z => z.congestionLevel >= 40 && z.congestionLevel < 70).length;
    const lowCongestionZones = zones.filter(z => z.congestionLevel < 40).length;

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/dashboard')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Live Data Dashboard</h1>
                        <p className="text-sm text-[--foreground]/60">Real-time fleet and traffic monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-[--foreground]/60 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>Updated {timeSinceSync}s ago</span>
                        {isSimulating && (
                            <span className="flex items-center gap-1 text-green-400">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                LIVE
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
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleExport}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-[--foreground]/60">Total Vehicles</p>
                            <p className="text-3xl font-bold mt-2">{stats.totalVehicles}</p>
                            <p className="text-xs text-[--foreground]/40 mt-1">{stats.activeVehicles} active</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Truck className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">
                            {Math.round((stats.activeVehicles / stats.totalVehicles) * 100)}% Active
                        </span>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-[--foreground]/60">Avg Efficiency</p>
                            <p className="text-3xl font-bold mt-2">{stats.avgEfficiency}%</p>
                            <p className="text-xs text-[--foreground]/40 mt-1">Fleet performance</p>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <Zap className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {stats.avgEfficiency >= 80 ? (
                            <>
                                <TrendingUp className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Excellent</span>
                            </>
                        ) : (
                            <>
                                <TrendingDown className="w-3 h-3 text-orange-400" />
                                <span className="text-orange-400">Needs attention</span>
                            </>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-[--foreground]/60">Avg Congestion</p>
                            <p className="text-3xl font-bold mt-2">{stats.avgCongestion}%</p>
                            <p className="text-xs text-[--foreground]/40 mt-1">{zones.length} zones tracked</p>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                            <Activity className="w-6 h-6 text-orange-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {stats.avgCongestion >= 70 ? (
                            <>
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-red-400">High traffic</span>
                            </>
                        ) : (
                            <>
                                <TrendingDown className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Flowing well</span>
                            </>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-[--foreground]/60">Active Incidents</p>
                            <p className="text-3xl font-bold mt-2">{stats.totalIncidents}</p>
                            <p className="text-xs text-[--foreground]/40 mt-1">Require attention</p>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {stats.totalIncidents === 0 ? (
                            <span className="text-green-400">All clear</span>
                        ) : (
                            <span className="text-red-400">{stats.totalIncidents} active</span>
                        )}
                    </div>
                </Card>
            </div>

            {/* Filters & Vehicle List */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[--color-primary]" />
                        Fleet Vehicles ({filteredVehicles.length})
                    </h2>
                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-[--foreground]/60" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[--color-primary]"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="idle">Idle</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[--color-primary]"
                        >
                            <option value="all">All Types</option>
                            {vehicleTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[--color-primary]"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="fuel">Sort by Fuel</option>
                            <option value="efficiency">Sort by Efficiency</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredVehicles.map((vehicle, idx) => (
                        <motion.div
                            key={vehicle.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    {vehicle.type === 'truck' ? (
                                        <Truck className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <Car className="w-5 h-5 text-green-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{vehicle.name}</p>
                                    <p className="text-xs text-[--foreground]/40">{vehicle.number}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-[--foreground]/60">Status</p>
                                    <span className={`text-sm font-semibold capitalize ${
                                        vehicle.status === 'active' ? 'text-green-400' :
                                        vehicle.status === 'idle' ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>
                                        {vehicle.status}
                                    </span>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs text-[--foreground]/60">Fuel</p>
                                    <div className="flex items-center gap-2">
                                        <Fuel className={`w-3 h-3 ${
                                            vehicle.fuel > 50 ? 'text-green-400' :
                                            vehicle.fuel > 25 ? 'text-yellow-400' :
                                            'text-red-400'
                                        }`} />
                                        <span className="text-sm font-semibold">{vehicle.fuel}%</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs text-[--foreground]/60">Efficiency</p>
                                    <div className="flex items-center gap-2">
                                        <Zap className={`w-3 h-3 ${
                                            vehicle.efficiency >= 80 ? 'text-green-400' :
                                            vehicle.efficiency >= 60 ? 'text-yellow-400' :
                                            'text-red-400'
                                        }`} />
                                        <span className="text-sm font-semibold">{vehicle.efficiency}%</span>
                                    </div>
                                </div>

                                <div className="text-right min-w-[150px]">
                                    <p className="text-xs text-[--foreground]/60">Location</p>
                                    <p className="text-xs font-mono">
                                        {vehicle.location.lat.toFixed(4)}, {vehicle.location.lng.toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>

            {/* Traffic Zones & Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Zones */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[--color-primary]" />
                        Traffic Zones ({zones.length})
                    </h2>
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                High Congestion (≥70%)
                            </span>
                            <span className="font-semibold">{highCongestionZones}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                Medium Congestion (40-69%)
                            </span>
                            <span className="font-semibold">{mediumCongestionZones}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                Low Congestion (&lt;40%)
                            </span>
                            <span className="font-semibold">{lowCongestionZones}</span>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {zones.map((zone, idx) => (
                            <motion.div
                                key={zone.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-[--color-primary]" />
                                    <span className="font-medium">{zone.area}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all ${
                                                zone.congestionLevel >= 70 ? 'bg-red-500' :
                                                zone.congestionLevel >= 40 ? 'bg-yellow-500' :
                                                'bg-green-500'
                                            }`}
                                            style={{ width: `${zone.congestionLevel}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold min-w-[40px] text-right">
                                        {zone.congestionLevel}%
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Card>

                {/* Active Incidents */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Active Incidents ({incidents.length})
                    </h2>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {incidents.length === 0 ? (
                            <div className="text-center py-8 text-[--foreground]/40">
                                <p>No active incidents</p>
                                <p className="text-xs mt-2">All systems operating normally</p>
                            </div>
                        ) : (
                            incidents.map((incident, idx) => (
                                <motion.div
                                    key={incident.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-4 rounded-lg border ${
                                        incident.type === 'accident' ? 'bg-red-500/10 border-red-500/30' :
                                        incident.type === 'congestion' ? 'bg-orange-500/10 border-orange-500/30' :
                                        'bg-yellow-500/10 border-yellow-500/30'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded uppercase ${
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
                                </motion.div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
