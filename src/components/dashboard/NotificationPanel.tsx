'use client';
import { useTraffic } from '@/lib/TrafficContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, CheckCircle, Info, AlertCircle, Trash2, CheckCheck } from 'lucide-react';
import { useState, useEffect } from 'react';

export function NotificationPanel() {
    const { notifications, dismissNotification, clearNotifications } = useTraffic();
    const [isOpen, setIsOpen] = useState(false);
    const [latestNotification, setLatestNotification] = useState<string | null>(null);
    const unreadCount = notifications.length;

    // Show toast for new notifications
    useEffect(() => {
        if (notifications.length > 0) {
            const newest = notifications[0];
            // Only show toast if it's very recent (less than 1s old) to avoid spam on page load
            if (new Date().getTime() - new Date(newest.timestamp).getTime() < 1000) {
                setLatestNotification(newest.id);
                const timer = setTimeout(() => setLatestNotification(null), 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [notifications]);

    const iconMap = {
        info: <Info className="w-4 h-4 text-blue-400" />,
        warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
        danger: <AlertCircle className="w-4 h-4 text-red-400" />,
        success: <CheckCircle className="w-4 h-4 text-green-400" />,
    };

    const bgMap = {
        info: 'border-blue-500/20 bg-blue-500/5',
        warning: 'border-yellow-500/20 bg-yellow-500/5',
        danger: 'border-red-500/20 bg-red-500/5',
        success: 'border-green-500/20 bg-green-500/5',
    };

    return (
        <>
            {/* Toast Notification (The "Interactive Bar") */}
            <AnimatePresence>
                {latestNotification && notifications.find(n => n.id === latestNotification) && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: -150 }} // Start from top center-ish
                        animate={{ opacity: 1, y: 20, x: -150 }}
                        exit={{ opacity: 0, y: -50, x: -150 }}
                        className="fixed top-4 left-1/2 z-[100] transform -translate-x-1/2"
                    >
                        {(() => {
                            const n = notifications.find(n => n.id === latestNotification)!;
                            return (
                                <div className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl backdrop-blur-md border ${
                                    n.type === 'danger' ? 'bg-red-500/20 border-red-500/50 text-red-100' :
                                    n.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100' :
                                    n.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-100' :
                                    'bg-blue-500/20 border-blue-500/50 text-blue-100'
                                }`}>
                                    <div className={`p-1 rounded-full ${n.type === 'danger' ? 'bg-red-500' : n.type === 'warning' ? 'bg-yellow-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                        {n.type === 'danger' ? <AlertCircle className="w-4 h-4 text-black" /> : 
                                         n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-black" /> :
                                         n.type === 'success' ? <CheckCircle className="w-4 h-4 text-black" /> :
                                         <Info className="w-4 h-4 text-black" />}
                                    </div>
                                    <span className="font-medium text-sm whitespace-nowrap">{n.message}</span>
                                    <button 
                                        onClick={() => setLatestNotification(null)}
                                        className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed top-6 right-8 z-50">
                {/* Bell Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative p-3 rounded-xl backdrop-blur-md border transition-all duration-200 ${
                        isOpen 
                            ? 'bg-[--color-primary] border-[--color-primary] text-white shadow-[0_0_20px_rgba(255,69,0,0.4)]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-[--foreground]'
                    }`}
                >
                    <Bell className={`w-6 h-6 ${unreadCount > 0 && !isOpen ? 'animate-bell-shake' : ''}`} />
                    
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse border-2 border-[#0B0E14] text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </motion.button>

                {/* Dropdown Panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-16 w-[380px] max-h-[500px] flex flex-col bg-[#0f1219]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-[--color-primary]" />
                                    <span className="font-bold text-sm">Notifications</span>
                                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-[--foreground]/60">
                                        {unreadCount}
                                    </span>
                                </div>
                                {notifications.length > 0 && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={clearNotifications}
                                            className="p-1.5 text-[--foreground]/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Clear All"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-1.5 text-[--foreground]/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-[--foreground]/40">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Bell className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="font-medium">All caught up!</p>
                                        <p className="text-xs mt-1 opacity-60">No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {notifications.map((n, idx) => (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`p-4 flex gap-4 items-start group relative transition-all duration-200
                                                    ${n.type === 'danger' ? 'bg-red-500/5 hover:bg-red-500/10' :
                                                      n.type === 'warning' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' :
                                                      'hover:bg-white/5'}`}
                                            >
                                                {/* Status Indicator Bar */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                    n.type === 'danger' ? 'bg-red-500' : 
                                                    n.type === 'warning' ? 'bg-yellow-500' :
                                                    n.type === 'success' ? 'bg-green-500' :
                                                    'bg-blue-500'
                                                }`} />

                                                <div className="mt-1">{iconMap[n.type]}</div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium leading-snug">{n.message}</p>
                                                    <p className="text-[11px] text-[--foreground]/40 font-mono mt-1.5 flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-white/30" />
                                                        {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        dismissNotification(n.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[--foreground]/30 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t border-white/10 bg-white/5 text-center">
                                    <button 
                                        onClick={clearNotifications}
                                        className="text-xs text-[--color-primary] hover:text-[--color-primary]/80 font-medium flex items-center justify-center gap-1 w-full"
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
