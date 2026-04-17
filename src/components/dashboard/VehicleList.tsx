'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTraffic } from '@/lib/TrafficContext';
import { Edit2, MapPin, Trash2, Truck, Plus, Fuel, Zap, Car, Box } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

export function VehicleList() {
    const { vehicles, addVehicle, removeVehicle, updateVehicleStatus, syncData } = useTraffic();
    const [filter, setFilter] = useState('all');
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const handleRefuel = async (id: string) => {
        try {
            const res = await fetch('/api/vehicles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId: id, action: 'refuel' })
            });
            const data = await res.json();
            if (data.success) {
                syncData(); // Refresh data to show new status
            }
        } catch (e) {
            console.error('Refuel failed', e);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        setLoadingIds(prev => new Set(prev).add(id));
        try {
            const action = (currentStatus === 'in-transit' || currentStatus === 'active') ? 'stop' : 'deploy';
            
            const res = await fetch('/api/vehicles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId: id, action })
            });
            
            const data = await res.json();
            if (data.success) {
                syncData();
            } else {
                console.error('Status toggle failed:', data.error);
                alert('Action failed: ' + data.error);
            }
        } catch (e) {
            console.error('Network error', e);
        } finally {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'car': return <Car className="h-5 w-5" />;
            case 'van': return <Box className="h-5 w-5" />;
            default: return <Truck className="h-5 w-5" />;
        }
    };

    const filteredVehicles = filter === 'all' ? vehicles : vehicles.filter(v => v.type === filter || v.status === filter);

    return (
        <div className="space-y-6">
            {/* Quick Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'active', 'idle', 'in-transit', 'refueling', 'maintenance', 'truck', 'car'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border transition-all ${filter === f ? 'bg-white text-black border-white' : 'bg-transparent text-[--foreground]/60 border-white/10 hover:border-white/30'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <AnimatePresence mode="popLayout">
                    {filteredVehicles.map((vehicle) => (
                        <motion.div
                            key={vehicle.id}
                            variants={item}
                            layout
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card className="h-full flex flex-col justify-between group bg-[--color-surface-100] border-white/5 hover:border-[--color-primary]/50 relative overflow-hidden glass-panel-hover">
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0 pointer-events-none" />

                                <div className="p-4 border-b border-white/5 flex items-start justify-between relative z-10">
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-[--color-primary] group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0)] group-hover:shadow-[0_0_20px_var(--color-primary)]">
                                            {getIcon(vehicle.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg group-hover:text-[--color-primary] transition-colors">{vehicle.name}</h3>
                                            <p className="text-xs font-mono text-[--foreground]/40">{vehicle.number}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={
                                            vehicle.status === 'active' || vehicle.status === 'in-transit' ? 'success' : 
                                            vehicle.status === 'idle' ? 'warning' : 
                                            vehicle.status === 'refueling' ? 'danger' : 'neutral'
                                        }>
                                            {vehicle.status}
                                        </Badge>
                                        <span className="text-xs font-mono text-[--foreground]/40">#{vehicle.id.split('-')[1]}</span>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4 flex-1 relative z-10">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-[--foreground]/40 block text-xs uppercase mb-1 flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel</span>
                                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${vehicle.fuel || 100}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className={`h-full rounded-full ${(vehicle.fuel || 100) > 20 ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[--foreground]/40 block text-xs uppercase mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Efficiency</span>
                                            <div className="text-lg font-bold font-mono">{Math.round(vehicle.efficiency || 100)}%</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-[--foreground]/60 bg-white/5 p-2 rounded-lg font-mono border border-white/5 group-hover:border-white/10 transition-colors">
                                        <MapPin className="h-3 w-3 text-[--color-accent]" />
                                        <span className="truncate">{vehicle.location.lat.toFixed(4)}, {vehicle.location.lng.toFixed(4)}</span>
                                    </div>
                                </div>

                                <div className="p-4 pt-0 flex items-center justify-between gap-2 mt-auto relative z-10">
                                    {(vehicle.status === 'refueling' || (vehicle.fuel || 0) < 20) ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRefuel(vehicle.id)}
                                            className="flex-1 text-xs h-8 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all animate-pulse"
                                        >
                                            <Fuel className="mr-2 h-3 w-3" /> Refuel Now
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleStatus(vehicle.id, vehicle.status)}
                                            disabled={loadingIds.has(vehicle.id)}
                                            className={`flex-1 text-xs h-8 border-white/10 hover:bg-white/5 hover:text-white transition-all ${loadingIds.has(vehicle.id) ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {loadingIds.has(vehicle.id) ? '...' : (vehicle.status === 'active' || vehicle.status === 'in-transit' ? 'Stop' : 'Deploy')}
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[--foreground]/40 hover:text-white hover:bg-white/10">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeVehicle(vehicle.id)}
                                        className="h-8 w-8 text-[--foreground]/40 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Add New Card - Link to Create Page */}
                <a href="/dashboard/vehicles/create" className="block">
                    <motion.div
                        whileHover={{ scale: 1.02, y: -8 }}
                        whileTap={{ scale: 0.98 }}
                        className="h-[280px] w-full rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 group bg-[--color-surface-100]/50 hover:bg-[--color-surface-100] transition-colors cursor-pointer"
                    >
                        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[--color-primary] group-hover:text-white transition-all duration-300 shadow-2xl">
                            <Plus className="h-8 w-8 text-[--foreground]/40 group-hover:text-white" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-[--foreground]/60 group-hover:text-white transition-colors">Create Vehicle</h3>
                            <p className="text-sm text-[--foreground]/40">Add with source & destination</p>
                        </div>
                    </motion.div>
                </a>
            </motion.div>
        </div>
    );
}
