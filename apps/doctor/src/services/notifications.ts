import { supabase } from '@cliniqone/api';

/**
 * Register device for push notifications via Expo Push / FCM / APNs.
 * Stores the push token in the `push_notification_tokens` table.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return null;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.checkPermissions();
        if (perm.receive !== 'granted') {
            const req = await PushNotifications.requestPermissions();
            if (req.receive !== 'granted') return null;
        }

        await PushNotifications.register();

        return new Promise((resolve) => {
            PushNotifications.addListener('registration', async (token) => {
                console.log('[DoctorPush] Push token:', token.value);

                // Upsert to push_notification_tokens
                const { error } = await supabase
                    .from('push_notification_tokens')
                    .upsert(
                        {
                            user_id: userId,
                            token: token.value,
                            platform: Capacitor.getPlatform(),
                            app: 'doctor',
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id,token' },
                    );

                if (error) console.error('[DoctorPush] Token upsert error:', error);
                resolve(token.value);
            });

            PushNotifications.addListener('registrationError', (err) => {
                console.error('[DoctorPush] Registration error:', err);
                resolve(null);
            });
        });
    } catch {
        return null;
    }
}

/**
 * Setup push notification tap handlers.
 * Routes the user to the relevant consultation when a notification is tapped.
 */
export async function setupPushListeners(navigate: (path: string) => void) {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification?.data;
            if (data?.consultation_id) {
                navigate(`/consultation/${data.consultation_id}`);
            } else {
                navigate('/tabs');
            }
        });
    } catch { /* not on native */ }
}
