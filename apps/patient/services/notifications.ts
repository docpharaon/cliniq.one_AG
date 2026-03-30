import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@cliniqone/api';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Saves the token to Supabase user profile for backend delivery.
 */
export async function registerForPushNotifications(userId?: string): Promise<string | null> {
    if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // Auto-detects from app.json
    });
    const pushToken = tokenData.data;

    // Android: set notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1A8A9E',
        });

        await Notifications.setNotificationChannelAsync('consultations', {
            name: 'Consultations',
            description: 'Doctor responses and consultation updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1A8A9E',
        });
    }

    // Save to Supabase
    if (userId) {
        try {
            await supabase
                .from('users')
                .update({ push_token: pushToken, push_enabled: true })
                .eq('id', userId);
        } catch (err) {
            console.error('Failed to save push token:', err);
        }
    }

    return pushToken;
}

/**
 * Hook to handle push notification listeners.
 * Handles both foreground notifications and tap-to-open navigation.
 */
export function useNotificationListeners(onNotificationTap?: (data: any) => void) {
    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    useEffect(() => {
        // Foreground notification received
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Notification received:', notification.request.content.title);
        });

        // User tapped notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (onNotificationTap) {
                onNotificationTap(data);
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [onNotificationTap]);
}

/**
 * Schedule a local notification (for testing or reminders).
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    delaySeconds: number = 0
) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data || {},
            sound: true,
        },
        trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });
}
