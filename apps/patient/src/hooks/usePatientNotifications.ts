import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../stores/authStore';

export interface PatientNotification {
    id: string;
    patient_id: string;
    type: 'assigned' | 'report_ready' | 'message' | 'system' | 'info';
    title: string;
    message: string;
    consultation_id: string | null;
    read: boolean;
    created_at: string;
}

/**
 * Hook for patient notifications with Supabase Realtime subscription.
 * Returns notifications list, unread count, and actions (mark read, refresh).
 */
export function usePatientNotifications() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<PatientNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('patient_notifications')
                .select('*')
                .eq('patient_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            }
        } catch (err) {
            console.warn('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!user?.id) return;

        fetchNotifications();

        const channel = supabase
            .channel(`patient_notifs_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'patient_notifications',
                    filter: `patient_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as PatientNotification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, fetchNotifications]);

    // Mark single notification as read
    const markAsRead = useCallback(async (notifId: string) => {
        await supabase
            .from('patient_notifications')
            .update({ read: true })
            .eq('id', notifId);

        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;
        await supabase
            .from('patient_notifications')
            .update({ read: true })
            .eq('patient_id', user.id)
            .eq('read', false);

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, [user?.id]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
}
