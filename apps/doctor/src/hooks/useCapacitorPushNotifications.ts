import { useEffect, useRef } from 'react';
import { useDoctorNotifications } from './useDoctorNotifications';
import type { DoctorNotification } from './useDoctorNotifications';

/**
 * Wraps `useDoctorNotifications` with local push notification scheduling
 * via Capacitor LocalNotifications when on native platforms.
 *
 * On web this is a passthrough — returns the raw notification data without
 * attempting to fire device-level notifications.
 */
export function useCapacitorPushNotifications() {
    const hook = useDoctorNotifications();
    const prevCountRef = useRef(hook.notifications.length);

    useEffect(() => {
        const currentCount = hook.notifications.length;
        if (currentCount > prevCountRef.current && prevCountRef.current > 0) {
            // New notification arrived — fire local push on native
            const newest = hook.notifications[0];
            if (newest && !newest.read) {
                scheduleLocalPush(newest);
            }
        }
        prevCountRef.current = currentCount;
    }, [hook.notifications]);

    return hook;
}

async function scheduleLocalPush(notif: DoctorNotification) {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { LocalNotifications } = await import('@capacitor/local-notifications');

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display !== 'granted') return;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: Math.floor(Math.random() * 100000),
                    title: notif.title,
                    body: notif.body,
                    schedule: { at: new Date(Date.now() + 100) },
                    extra: { notificationId: notif.id, type: notif.type },
                },
            ],
        });
    } catch {
        // Not on native or LocalNotifications not available
    }
}
