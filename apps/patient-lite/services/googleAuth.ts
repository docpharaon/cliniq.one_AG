import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { signInWithGoogle, supabase } from '@cliniqone/api';
import { ENV } from '@cliniqone/config';
import { useAuthStore } from '../stores/authStore';

/**
 * Configure and execute Google Sign-In.
 * - On web: uses Supabase OAuth redirect (opens Google login in browser)
 * - On native: uses @react-native-google-signin for native UI
 * Returns true on success, false on cancellation/error.
 */
export async function handleGoogleSignIn(): Promise<boolean> {
    // Web: Use Supabase OAuth redirect flow
    if (Platform.OS === 'web') {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;

            // OAuth redirect will navigate the browser away.
            // Supabase handles the callback automatically.
            // Return true — the page will reload with the session.
            return true;
        } catch (error: any) {
            console.error('Google OAuth error:', error);
            (globalThis as any).alert?.('Google Sign-In failed: ' + (error?.message || 'Unknown error'));
            return false;
        }
    }

    // Native: Use @react-native-google-signin
    try {
        const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');

        // Configure Google Sign-In
        GoogleSignin.configure({
            webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
        });

        // Check Play Services (Android only)
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Trigger Google Sign-In UI
        const response = await GoogleSignin.signIn();

        // Get ID token
        const idToken = response?.data?.idToken;
        if (!idToken) {
            throw new Error('No ID token received from Google');
        }

        // Sign in with Supabase using the Google ID token
        const displayName = response?.data?.user?.name || null;
        const data = await signInWithGoogle(idToken, displayName);

        // Re-initialize auth store to pick up the new session
        await useAuthStore.getState().initialize();

        return true;
    } catch (error: any) {
        const { statusCodes } = require('@react-native-google-signin/google-signin');

        if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
            return false;
        } else if (error?.code === statusCodes.IN_PROGRESS) {
            return false;
        } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            Alert.alert('Error', 'Google Play Services is not available on this device.');
            return false;
        } else {
            console.error('Google Sign-In error:', error);
            Alert.alert('Sign-In Failed', error?.message || 'An unexpected error occurred. Please try again.');
            return false;
        }
    }
}
