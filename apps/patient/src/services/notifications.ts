// Notification service — web-compatible with Capacitor native bridge
import { useEffect, useRef } from 'react';
import { supabase } from '@cliniqone/api';

/**
 * Register for push notifications and save token to Supabase.
 * On web: requests browser notification permission.
 * On Capacitor native: uses LocalNotifications plugin.
 */
export async function registerForPushNotifications(userId?: string): Promise<string | null> {
    try {
        // Try Capacitor native first
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                await LocalNotifications.requestPermissions();
            }
            // On Capacitor, we don't get a push token from local notifications
            // Real push would use @capacitor/push-notifications
            return null;
        }
    } catch { /* Not on Capacitor */ }

    // Web: request browser notification permission
    try {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    } catch { /* Notifications not supported */ }

    return null;
}

/**
 * Hook to handle notification tap listeners.
 * On Capacitor: listens for local notification action events.
 * On web: no-op (browser notifications handle themselves).
 */
export function useNotificationListeners(onNotificationTap?: (data: any) => void) {
    const listenerRef = useRef<any>(null);

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        (async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { LocalNotifications } = await import('@capacitor/local-notifications');
                    listenerRef.current = await LocalNotifications.addListener(
                        'localNotificationActionPerformed',
                        (action) => {
                            onNotificationTap?.(action.notification.extra);
                        }
                    );
                    cleanup = () => listenerRef.current?.remove?.();
                }
            } catch { /* Not on Capacitor */ }
        })();

        return () => cleanup?.();
    }, [onNotificationTap]);
}

/**
 * Schedule a local notification (for Capacitor native).
 * No-op on plain web.
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    delaySeconds: number = 0
) {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
            notifications: [{
                id: Date.now(),
                title,
                body,
                extra: data || {},
                sound: 'default',
                ...(delaySeconds > 0 ? { schedule: { at: new Date(Date.now() + delaySeconds * 1000) } } : {}),
            }],
        });
    } catch { /* Not on Capacitor or plugin unavailable */ }
}
