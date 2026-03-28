import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { signInWithApple, supabase } from '@cliniqone/api';
import { useAuthStore } from '../stores/authStore';

/** Check if we're running inside a Capacitor WebView */
function isCapacitorNative(): boolean {
    return (
        typeof globalThis !== 'undefined' &&
        !!(globalThis as any).Capacitor &&
        (globalThis as any).Capacitor.isNativePlatform?.() === true
    );
}

/**
 * Configure and execute Apple Sign-In.
 * - On web (Capacitor): opens OAuth in system browser, returns via deep link
 * - On web (plain browser): uses Supabase OAuth redirect (opens Apple login in browser)
 * - On native iOS: uses expo-apple-authentication for native UI
 * - On Android (Capacitor): uses deep-link flow via system browser
 * Returns true on success, false on cancellation/error.
 */
export async function handleAppleSignIn(): Promise<boolean> {
    // Web or Android: Use Supabase OAuth redirect flow
    if (Platform.OS === 'web' || Platform.OS === 'android') {
        // Capacitor WebView: deep-link redirect flow (same pattern as Google)
        if (isCapacitorNative()) {
            return handleCapacitorAppleOAuth();
        }

        // Plain browser: standard redirect flow
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: (globalThis as any).window?.location?.origin,
                },
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

/**
 * Capacitor-specific Apple OAuth flow:
 * 1. Get the OAuth URL from Supabase (skipBrowserRedirect)
 * 2. Open in system browser via Capacitor Browser plugin
 * 3. Listen for deep-link callback with tokens
 * 4. Set the Supabase session manually
 */
async function handleCapacitorAppleOAuth(): Promise<boolean> {
    const Cap = (globalThis as any).Capacitor;
    const Plugins = Cap?.Plugins;

    try {
        // Get OAuth URL without auto-redirecting the WebView
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: 'com.cliniqone.patient.cap://callback',
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No OAuth URL received');

        // Open the OAuth URL in the system browser
        if (Plugins?.Browser) {
            await Plugins.Browser.open({ url: data.url });
        } else {
            (globalThis as any).window?.open?.(data.url, '_blank');
        }

        // Wait for the deep-link callback
        return new Promise<boolean>((resolve) => {
            // Safety timeout — don't hang forever
            const timeout = setTimeout(() => {
                cleanup();
                resolve(false);
            }, 120_000); // 2 minute timeout

            let listenerHandle: any = null;

            function cleanup() {
                clearTimeout(timeout);
                listenerHandle?.remove?.();
            }

            // Listen for the deep link return
            if (Plugins?.App) {
                listenerHandle = Plugins.App.addListener('appUrlOpen', async (event: { url: string }) => {
                    const url = event.url;
                    if (!url.includes('callback')) return;

                    cleanup();

                    // Close the browser
                    try { await Plugins.Browser?.close(); } catch (_) { /* ignore */ }

                    try {
                        // Extract tokens from hash fragment
                        // URL: com.cliniqone.patient.cap://callback#access_token=...&refresh_token=...
                        const hashPart = url.split('#')[1];
                        if (!hashPart) {
                            resolve(false);
                            return;
                        }

                        const params = new URLSearchParams(hashPart);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');

                        if (access_token && refresh_token) {
                            const { error: sessionError } = await supabase.auth.setSession({
                                access_token,
                                refresh_token,
                            });

                            if (sessionError) {
                                console.error('Session error:', sessionError);
                                resolve(false);
                                return;
                            }

                            // Re-initialize auth store
                            await useAuthStore.getState().initialize();
                            resolve(true);
                        } else {
                            console.error('Missing tokens in callback URL');
                            resolve(false);
                        }
                    } catch (err) {
                        console.error('Error processing Apple OAuth callback:', err);
                        resolve(false);
                    }
                });
            } else {
                // No App plugin — can't listen for deep links
                clearTimeout(timeout);
                console.error('Capacitor App plugin not available');
                resolve(false);
            }
        });
    } catch (error: any) {
        console.error('Capacitor Apple OAuth error:', error);
        (globalThis as any).alert?.('Apple Sign-In failed: ' + (error?.message || 'Unknown error'));
        return false;
    }
}
