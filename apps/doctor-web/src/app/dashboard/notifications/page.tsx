'use client';

import Header from '@/components/Header';
import { Bell, Check, Clock, AlertTriangle, Info, Loader2, CheckCircle2, Coins, Eye } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import {
    fetchDoctorNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '@/lib/actions';
import Link from 'next/link';

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    consultation_id: string | null;
    read: boolean;
    created_at: string;
};

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    urgent: { icon: AlertTriangle, color: 'text-error', bg: 'bg-error-faded' },
    assignment: { icon: Info, color: 'text-info', bg: 'bg-info-faded' },
    completion: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success-faded' },
    payment: { icon: Coins, color: 'text-gold', bg: 'bg-gold-faded' },
    system: { icon: Bell, color: 'text-accent', bg: 'bg-accent-faded' },
    info: { icon: Info, color: 'text-info', bg: 'bg-info-faded' },
};

function formatTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [doctorId, setDoctorId] = useState('');
    const [markingAll, setMarkingAll] = useState(false);

    const loadNotifications = useCallback(async (docId: string) => {
        try {
            const data = await fetchDoctorNotifications(docId);
            setNotifications(data as Notification[]);
        } catch (err) {
            console.error('Load notifications error:', err);
        }
    }, []);

    useEffect(() => {
        async function init() {
            const supabase = createBrowserSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (doctor) {
                setDoctorId(doctor.id);
                await loadNotifications(doctor.id);
            }
            setLoading(false);
        }
        init();
    }, [loadNotifications]);

    async function handleMarkRead(notifId: string) {
        // Optimistically update
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, read: true } : n),
        );
        await markNotificationRead(notifId);
    }

    async function handleMarkAllRead() {
        if (!doctorId) return;
        setMarkingAll(true);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await markAllNotificationsRead(doctorId);
        setMarkingAll(false);
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <Header title="Notifications" subtitle="Stay updated with your latest activity" />

            <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-4 md:space-y-6">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <Bell className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Notifications</h2>
                            <p className="text-sm text-text-muted">{unreadCount} unread</p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            className="flex items-center gap-1.5 text-sm text-accent hover:underline disabled:opacity-50"
                        >
                            {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Mark all read
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-text-muted">
                        <Bell className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-sm">No notifications yet</p>
                        <p className="text-xs mt-1">Notifications will appear here when you receive new assignments, payments, etc.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(notif => {
                            const config = typeConfig[notif.type] || typeConfig.info;
                            const Icon = config.icon;
                            return (
                                <div
                                    key={notif.id}
                                    className={`flex items-start gap-4 px-5 py-4 rounded-2xl transition-all ${notif.read
                                        ? 'bg-bg-card border border-border'
                                        : 'glass border-accent/30'
                                        }`}
                                    onClick={() => !notif.read && handleMarkRead(notif.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <Icon className={`w-5 h-5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-text-primary">{notif.title}</h4>
                                            {!notif.read && (
                                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
                                            )}
                                        </div>
                                        <p className="text-sm text-text-secondary mt-0.5">{notif.message}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 text-xs text-text-muted">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(notif.created_at)}
                                            </div>
                                            {notif.consultation_id && (
                                                <Link
                                                    href={`/dashboard/consultation/${notif.consultation_id}`}
                                                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <Eye className="w-3 h-3" /> View case
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
