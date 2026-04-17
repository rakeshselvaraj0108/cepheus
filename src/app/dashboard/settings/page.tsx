'use client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTraffic } from '@/lib/TrafficContext';
import { Settings, Bell, Shield, Database, Moon, Zap, RefreshCw, Download, Trash } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function SettingsPage() {
    const { settings, updateSettings, isSimulating, toggleSimulation, vehicles, zones, incidents } = useTraffic();
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showSaveIndicator, setShowSaveIndicator] = useState(false);

    // Show "saved" indicator when settings change
    const handleSettingsUpdate = (updates: any) => {
        updateSettings(updates);
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
    };

    const handleExportLogs = () => {
        setIsExporting(true);
        try {
            // Create export data
            const exportData = {
                timestamp: new Date().toISOString(),
                settings,
                vehicles: vehicles.map(v => ({
                    id: v.id,
                    name: v.name,
                    type: v.type,
                    status: v.status,
                    fuel: v.fuel,
                    efficiency: v.efficiency,
                    location: v.currentLocation,
                })),
                zones: zones.map(z => ({
                    id: z.id,
                    area: z.area,
                    congestionLevel: z.congestionLevel,
                })),
                incidents: incidents.map(i => ({
                    id: i.id,
                    type: i.type,
                    location: i.location,
                    description: i.description,
                    timestamp: i.timestamp,
                })),
                stats: {
                    totalVehicles: vehicles.length,
                    activeVehicles: vehicles.filter(v => v.status === 'active').length,
                    totalZones: zones.length,
                    totalIncidents: incidents.length,
                }
            };

            // Convert to JSON and download
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `trafficmaxxer-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert('Export successful! Check your downloads folder.');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearCache = () => {
        if (!confirm('Are you sure you want to clear all cached data? This will reset chat history and settings to defaults.')) {
            return;
        }

        setIsClearing(true);
        try {
            // Clear all TrafficMaxxer data from localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('trafficmaxxer_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Reset settings to defaults
            updateSettings({
                notifications: true,
                congestionAlerts: true,
                incidentAlerts: true,
                alertThreshold: 80,
                darkMode: true,
                autoRefresh: true,
                refreshInterval: 0.3,
                mapStyle: 'dark',
            });

            alert('Cache cleared successfully! Refreshing page...');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Clear cache failed:', error);
            alert('Failed to clear cache. Please try again.');
        } finally {
            setIsClearing(false);
        }
    };

    const handleResetSettings = () => {
        if (!confirm('Are you sure you want to reset all settings to default values?')) {
            return;
        }

        updateSettings({
            notifications: true,
            congestionAlerts: true,
            incidentAlerts: true,
            alertThreshold: 80,
            darkMode: true,
            autoRefresh: true,
            refreshInterval: 0.3,
            mapStyle: 'dark',
        });

        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
        alert('Settings reset to defaults!');
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
                    <p className="text-[--foreground]/60">Manage platform preferences and integrations.</p>
                </div>
                {showSaveIndicator && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-2"
                    >
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Settings saved</span>
                    </motion.div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6 col-span-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[--color-primary]" /> General Preferences
                    </h2>

                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <RefreshCw className={`h-5 w-5 ${isSimulating ? 'text-green-400 animate-spin-slow' : 'text-gray-400'}`} />
                            </div>
                            <div>
                                <h3 className="font-bold">Live Simulation</h3>
                                <p className="text-sm text-[--foreground]/60">Toggle real-time traffic updates and vehicle movements.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isSimulating}
                                onChange={toggleSimulation}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <Bell className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-bold">Notifications</h3>
                                <p className="text-sm text-[--foreground]/60">Enable real-time alerts for incidents and congestion.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.notifications}
                                onChange={(e) => handleSettingsUpdate({ notifications: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-primary]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <Bell className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="font-bold">Congestion Alerts</h3>
                                <p className="text-sm text-[--foreground]/60">Get notified when traffic congestion exceeds threshold.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.congestionAlerts}
                                onChange={(e) => handleSettingsUpdate({ congestionAlerts: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-primary]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <Bell className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold">Incident Alerts</h3>
                                <p className="text-sm text-[--foreground]/60">Receive notifications for new traffic incidents.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.incidentAlerts}
                                onChange={(e) => handleSettingsUpdate({ incidentAlerts: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-primary]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <Moon className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold">Auto Refresh</h3>
                                <p className="text-sm text-[--foreground]/60">Automatically sync data from backend at set intervals.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.autoRefresh}
                                onChange={(e) => handleSettingsUpdate({ autoRefresh: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--color-primary]"></div>
                        </label>
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[--color-success]" /> Thresholds & Limits
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Congestion Alert Threshold</label>
                                <span className="text-sm font-mono text-[--color-primary]">{settings.alertThreshold}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="100"
                                value={settings.alertThreshold}
                                onChange={(e) => handleSettingsUpdate({ alertThreshold: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[--color-primary]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Refresh Rate</label>
                                <span className="text-sm font-mono text-[--color-primary]">{settings.refreshInterval}s</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                value={settings.refreshInterval}
                                onChange={(e) => handleSettingsUpdate({ refreshInterval: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[--color-primary]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Map Style</label>
                                <span className="text-sm font-mono text-[--color-primary] capitalize">{settings.mapStyle}</span>
                            </div>
                            <select
                                value={settings.mapStyle}
                                onChange={(e) => handleSettingsUpdate({ mapStyle: e.target.value as 'dark' | 'satellite' | 'street' })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[--color-primary] cursor-pointer"
                            >
                                <option value="dark">Dark Mode</option>
                                <option value="satellite">Satellite View</option>
                                <option value="street">Street Map</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" /> Data Management
                    </h2>
                    <p className="text-sm text-[--foreground]/60">
                        Connected to local MBTiles database: <span className="text-white font-mono">bangalore.mbtiles</span>
                    </p>
                    <div className="space-y-3">
                        <p className="text-xs text-[--foreground]/40">
                            Current storage: {vehicles.length} vehicles • {zones.length} zones • {incidents.length} incidents
                        </p>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="flex-1 gap-2"
                                onClick={handleExportLogs}
                                disabled={isExporting}
                            >
                                <Download className="w-4 h-4" />
                                {isExporting ? 'Exporting...' : 'Export Logs'}
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 gap-2"
                                onClick={handleClearCache}
                                disabled={isClearing}
                            >
                                <Trash className="w-4 h-4" />
                                {isClearing ? 'Clearing...' : 'Clear Cache'}
                            </Button>
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full gap-2 border-orange-500/30 hover:border-orange-500 text-orange-400"
                            onClick={handleResetSettings}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset Settings to Defaults
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
