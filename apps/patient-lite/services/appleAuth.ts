import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { signInWithApple, supabase } from '@cliniqone/api';
import { useAuthStore } from '../stores/authStore';

/**
 * Configure and execute Apple Sign-In.
 * - On web: uses Supabase OAuth redirect (opens Apple login in browser)
 * - On native iOS: uses expo-apple-authentication for native UI
 * - On Android: falls back to Supabase OAuth redirect
 * Returns true on success, false on cancellation/error.
 */
export async function handleAppleSignIn(): Promise<boolean> {
    // Web or Android: Use Supabase OAuth redirect flow
    if (Platform.OS === 'web' || Platform.OS === 'android') {
        try {
            const redirectTo = Platform.OS === 'web'
                ? (globalThis as any).window?.location?.origin
                : undefined; // Android deep link handled by Capacitor

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: { redirectTo },
            });

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('Apple OAuth error:', error);
            if (Platform.OS === 'web') {
                (globalThis as any).alert?.('Apple Sign-In failed: ' + (error?.message || 'Unknown error'));
            } else {
                Alert.alert('Sign-In Failed', error?.message || 'Apple Sign-In failed');
            }
            return false;
        }
    }

    // iOS native: Use expo-apple-authentication
    try {
        const AppleAuthentication = require('expo-apple-authentication');
        const Crypto = require('expo-crypto');

        // Generate nonce for security
        const rawNonce = Math.random().toString(36).substring(2, 15);
        const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce,
        );

        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
        });

        const idToken = credential.identityToken;
        if (!idToken) {
            throw new Error('No identity token received from Apple');
        }

        // Build display name from Apple's response (only provided on first sign-in)
        const displayName = credential.fullName
            ? [credential.fullName.givenName, credential.fullName.familyName]
                  .filter(Boolean)
                  .join(' ') || null
            : null;

        // Sign in with Supabase using the Apple ID token
        await signInWithApple(idToken, displayName, rawNonce);

        // Re-initialize auth store to pick up the new session
        await useAuthStore.getState().initialize();

        return true;
    } catch (error: any) {
        if (error?.code === 'ERR_REQUEST_CANCELED') {
            // User cancelled — not an error
            return false;
        }

        console.error('Apple Sign-In error:', error);
        Alert.alert('Sign-In Failed', error?.message || 'An unexpected error occurred. Please try again.');
        return false;
    }
}
