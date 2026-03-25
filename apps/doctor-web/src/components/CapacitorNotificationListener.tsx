'use client';

import { useEffect } from 'react';

/**
 * CapacitorNotificationListener
 * 
 * Runs inside the Capacitor WebView on Android APK.
 * Listens for new doctor_notifications via polling and fires native
 * local notifications using the Capacitor LocalNotifications plugin.
 * 
 * In browser (non-Capacitor), this component is a no-op.
 */
export default function CapacitorNotificationListener({ doctorId }: { doctorId?: string }) {
    useEffect(() => {
        const isCapacitor = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
        if (!isCapacitor || !doctorId) return;

        let lastCheckTime = new Date().toISOString();
        let intervalId: ReturnType<typeof setInterval>;

        async function checkForNewNotifications() {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');

                const res = await fetch('/api/doctor-notifications/recent?since=' + encodeURIComponent(lastCheckTime) + '&doctorId=' + encodeURIComponent(doctorId!));
                if (!res.ok) return;
                const notifications = await res.json();

                if (notifications.length > 0) {
                    const perm = await LocalNotifications.checkPermissions();
                    if (perm.display !== 'granted') {
                        await LocalNotifications.requestPermissions();
                    }

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
                console.warn('[CapacitorNotificationListener:doctor]', err);
            }
        }

        intervalId = setInterval(checkForNewNotifications, 30000);
        const timeout = setTimeout(checkForNewNotifications, 5000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeout);
        };
    }, [doctorId]);

    return null;
}
