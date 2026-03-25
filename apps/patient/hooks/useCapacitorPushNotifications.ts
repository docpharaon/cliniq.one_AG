import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { usePatientNotifications, PatientNotification } from './usePatientNotifications';

/**
 * useCapacitorPushNotifications
 * 
 * Extends usePatientNotifications by firing native local push notifications
 * when new notifications arrive via Supabase Realtime, but ONLY when running
 * inside a Capacitor WebView (Android APK).
 * 
 * On Expo native / web browser, this is a passthrough to usePatientNotifications.
 */
export function useCapacitorPushNotifications() {
    const result = usePatientNotifications();
    const prevCountRef = useRef(result.notifications.length);
    const isCapacitor = useRef(false);

    useEffect(() => {
        // Detect Capacitor environment (works in both web and RN contexts)
        try {
            const g = globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
            if (g.Capacitor?.isNativePlatform?.()) {
                isCapacitor.current = true;
            }
        } catch { /* not in a web context */ }
    }, []);

    useEffect(() => {
        if (!isCapacitor.current) return;
        if (Platform.OS === 'web') {
            // Only fire push on Capacitor WebView (web platform inside native shell)
            const newNotifications = result.notifications.slice(0, result.notifications.length - prevCountRef.current);
            prevCountRef.current = result.notifications.length;

            if (newNotifications.length > 0) {
                fireLocalPush(newNotifications);
            }
        }
    }, [result.notifications]);

    return result;
}

async function fireLocalPush(notifications: PatientNotification[]) {
    try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
        }

        await LocalNotifications.schedule({
            notifications: notifications.map((n, i) => ({
                id: Date.now() + i,
                title: n.title,
                body: n.message,
                smallIcon: 'ic_notification',
                largeIcon: 'ic_launcher',
                sound: 'default',
            })),
        });
    } catch (err) {
        console.warn('[useCapacitorPush]', err);
    }
}
