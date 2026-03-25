'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, X } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    consultation_id: string | null;
    read: boolean;
    created_at: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const typeConfig: Record<string, { emoji: string; color: string }> = {
    assignment: { emoji: '📋', color: 'text-blue' },
    completion: { emoji: '✅', color: 'text-success' },
    payment: { emoji: '💰', color: 'text-gold' },
    urgent: { emoji: '🚨', color: 'text-error' },
    system: { emoji: '⚙️', color: 'text-text-secondary' },
    info: { emoji: 'ℹ️', color: 'text-info' },
};

export default function NotificationBell({ doctorId }: { doctorId?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createBrowserSupabase();

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!doctorId) return;
        const { data } = await supabase
            .from('doctor_notifications')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
    }, [doctorId, supabase]);

    // Initial fetch + realtime subscription
    useEffect(() => {
        if (!doctorId) return;
        fetchNotifications();

        const channel = supabase
            .channel('doctor-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'doctor_notifications',
                    filter: `doctor_id=eq.${doctorId}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [doctorId, fetchNotifications, supabase]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Mark single as read
    const markRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase
            .from('doctor_notifications')
            .update({ read: true })
            .eq('id', id);
    };

    // Mark all as read
    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        if (doctorId) {
            await supabase
                .from('doctor_notifications')
                .update({ read: true })
                .eq('doctor_id', doctorId)
                .eq('read', false);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell button */}
            <button
                id="notification-bell"
                onClick={() => setOpen(o => !o)}
                className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-4.5 h-4.5 md:w-5 md:h-5 text-text-secondary" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 w-4 h-4 md:w-[18px] md:h-[18px] bg-error rounded-full text-[10px] md:text-[11px] font-bold text-white flex items-center justify-center animate-scale-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-xl border overflow-hidden animate-slide-down z-50"
                    style={{
                        background: 'rgba(15, 35, 40, 0.98)',
                        backdropFilter: 'blur(24px)',
                        borderColor: 'rgba(98, 214, 197, 0.2)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-accent hover:text-accent-light transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-accent-faded transition-colors"
                                data-small-touch
                            >
                                <X className="w-3.5 h-3.5 text-text-muted" />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-sm text-text-muted">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(n => {
                                const config = typeConfig[n.type] || typeConfig.info;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            if (!n.read) markRead(n.id);
                                            if (n.consultation_id) {
                                                window.location.href = `/dashboard/consultation/${n.consultation_id}`;
                                                setOpen(false);
                                            }
                                        }}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-accent-faded/50 transition-colors ${
                                            !n.read ? 'bg-accent-faded/20' : ''
                                        }`}
                                    >
                                        <span className="text-lg flex-shrink-0 mt-0.5" data-small-touch>
                                            {config.emoji}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-medium truncate ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && (
                                                    <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-1">
                                                {timeAgo(n.created_at)}
                                            </p>
                                        </div>
                                        {n.consultation_id && (
                                            <ExternalLink className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-border text-center">
                            <a
                                href="/dashboard/notifications"
                                className="text-xs text-accent hover:text-accent-light transition-colors"
                            >
                                View all notifications →
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
