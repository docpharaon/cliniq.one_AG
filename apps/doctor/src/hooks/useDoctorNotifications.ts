import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, safeFetch } from '@cliniqone/api';
import { useAuthStore } from '../stores/authStore';

export interface DoctorNotification {
    id: string;
    user_id: string;
    type: 'assigned' | 'report_ready' | 'message' | 'system' | 'info';
    title: string;
    body: string;
    data?: Record<string, unknown>;
    read: boolean;
    created_at: string;
}

interface UseDoctorNotificationsReturn {
    notifications: DoctorNotification[];
    unreadCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

/**
 * Hook for real-time doctor notifications with Supabase Realtime subscription.
 *
 * Subscribes to `postgres_changes` INSERT events on the `doctor_notifications`
 * table filtered by the current doctor's user_id, mirroring the patient app's
 * `usePatientNotifications` pattern.
 */
export function useDoctorNotifications(): UseDoctorNotificationsReturn {
    const session = useAuthStore((s) => s.session);
    const userId = session?.user?.id;

    const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Fetch all notifications
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const { data } = await safeFetch(
                () =>
                    supabase
                        .from('doctor_notifications')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(50),
                { timeout: 8000, label: 'fetchDoctorNotifications' },
            );
            if (data) setNotifications(data as DoctorNotification[]);
        } catch (err) {
            console.error('[DoctorNotifications] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Subscribe to realtime INSERTs
    useEffect(() => {
        if (!userId) return;
        fetchNotifications();

        const channel = supabase
            .channel(`doctor_notifications_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'doctor_notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new as DoctorNotification;
                    console.log('[DoctorNotifications] New notification:', newNotif.type, newNotif.title);
                    setNotifications((prev) => [newNotif, ...prev]);
                },
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId, fetchNotifications]);

    // Mark single notification as read
    const markAsRead = useCallback(
        async (id: string) => {
            if (!userId) return;
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
            );
            try {
                await supabase
                    .from('doctor_notifications')
                    .update({ read: true })
                    .eq('id', id)
                    .eq('user_id', userId);
            } catch { /* optimistic — already updated UI */ }
        },
        [userId],
    );

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await supabase
                .from('doctor_notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);
        } catch { /* optimistic */ }
    }, [userId]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
        notifications,
        unreadCount,
        loading,
        refresh: fetchNotifications,
        markAsRead,
        markAllAsRead,
    };
}
