'use client';

import { useEffect } from 'react';

/**
 * CapacitorNotificationListener
 * 
 * Runs inside the Capacitor WebView on Android APK.
 * Listens for new admin_notifications via polling and fires native
 * local notifications using the Capacitor LocalNotifications plugin.
 * 
 * In browser (non-Capacitor), this component is a no-op.
 */
export default function CapacitorNotificationListener() {
    useEffect(() => {
        // Only run inside Capacitor native shell
        const isCapacitor = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
        if (!isCapacitor) return;

        let lastCheckTime = new Date().toISOString();
        let intervalId: ReturnType<typeof setInterval>;

        async function checkForNewNotifications() {
            try {
                // Dynamic import to avoid SSR issues
                const { LocalNotifications } = await import('@capacitor/local-notifications');

                // Fetch unread admin notifications created after last check
                const res = await fetch('/api/admin-notifications/recent?since=' + encodeURIComponent(lastCheckTime));
                if (!res.ok) return;
                const notifications = await res.json();

                if (notifications.length > 0) {
                    // Request permission if needed
                    const perm = await LocalNotifications.checkPermissions();
                    if (perm.display !== 'granted') {
                        await LocalNotifications.requestPermissions();
                    }

                    // Fire local notifications
                    await LocalNotifications.schedule({
                        notifications: notifications.map((n: { id: string; title: string; message: string }, i: number) => ({
                            id: Date.now() + i,
                            title: n.title,
                            body: n.message,
                            smallIcon: 'ic_notification',
                            largeIcon: 'ic_launcher',
                            sound: 'default',
                        })),
                    });

                    lastCheckTime = new Date().toISOString();
                }
            } catch (err) {
                console.warn('[CapacitorNotificationListener]', err);
            }
        }

        // Poll every 30 seconds
        intervalId = setInterval(checkForNewNotifications, 30000);

        // Initial check after 5s delay (let app settle)
        const timeout = setTimeout(checkForNewNotifications, 5000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeout);
        };
    }, []);

    return null; // Render nothing
}
