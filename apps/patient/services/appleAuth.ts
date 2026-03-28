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
                    queryParams: { prompt: 'consent' },
                },
            });

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('[OAuth] Apple OAuth error:', error);
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

        console.error('[OAuth] Apple Sign-In error:', error);
        Alert.alert('Sign-In Failed', error?.message || 'An unexpected error occurred. Please try again.');
        return false;
    }
}

/**
 * Capacitor-specific Apple OAuth flow:
 * 1. Get the OAuth URL from Supabase (skipBrowserRedirect)
 * 2. Open in system browser via Capacitor Browser plugin
 * 3. Listen for deep-link callback OR browserFinished event
 * 4. Set the Supabase session manually
 *
 * Chrome Custom Tabs on Android cannot redirect to custom URL schemes
 * (com.cliniqone.patient.cap://), so we use a dual strategy:
 *   A) Deep link listener (works if OS handles the custom scheme)
 *   B) browserFinished listener — when user returns from browser,
 *      check if Supabase session was set via the PKCE/cookie flow
 */
async function handleCapacitorAppleOAuth(): Promise<boolean> {
    const Cap = (globalThis as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Apple OAuth flow');
    console.log('[OAuth] Capacitor detected:', !!Cap);
    console.log('[OAuth] Browser plugin:', !!Plugins?.Browser);
    console.log('[OAuth] App plugin:', !!Plugins?.App);

    try {
        // Get OAuth URL without auto-redirecting the WebView
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: 'com.cliniqone.patient.cap://callback',
                skipBrowserRedirect: true,
                queryParams: { prompt: 'consent' },
            },
        });

        if (error) {
            console.error('[OAuth] Error getting Apple OAuth URL:', error);
            throw error;
        }
        if (!data?.url) throw new Error('No OAuth URL received');

        console.log('[OAuth] Got Apple OAuth URL, opening browser...');
        console.log('[OAuth] URL:', data.url.substring(0, 100) + '...');

        // Open the OAuth URL in the system browser
        if (Plugins?.Browser) {
            await Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
        } else {
            (globalThis as any).window?.open?.(data.url, '_blank');
        }

        // Wait for auth to complete via one of two mechanisms
        return new Promise<boolean>((resolve) => {
            let resolved = false;
            const safeResolve = (value: boolean) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(value);
            };

            // Safety timeout — don't hang forever
            const timeout = setTimeout(() => {
                console.log('[OAuth] Timeout reached, resolving false');
                safeResolve(false);
            }, 120_000);

            let deepLinkHandle: any = null;
            let browserFinishedHandle: any = null;

            function cleanup() {
                clearTimeout(timeout);
                deepLinkHandle?.remove?.();
                browserFinishedHandle?.remove?.();
            }

            // Strategy A: Listen for deep link return
            if (Plugins?.App) {
                deepLinkHandle = Plugins.App.addListener('appUrlOpen', async (event: { url: string }) => {
                    const url = event.url;
                    console.log('[OAuth] Deep link received:', url);
                    if (!url.includes('callback')) return;

                    // Close the browser
                    try { await Plugins.Browser?.close(); } catch (_) { /* ignore */ }

                    try {
                        const hashPart = url.split('#')[1];
                        if (!hashPart) {
                            console.error('[OAuth] No hash fragment in callback URL');
                            safeResolve(false);
                            return;
                        }

                        const params = new URLSearchParams(hashPart);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');

                        if (access_token && refresh_token) {
                            console.log('[OAuth] Tokens found in deep link, setting session...');
                            const { error: sessionError } = await supabase.auth.setSession({
                                access_token,
                                refresh_token,
                            });

                            if (sessionError) {
                                console.error('[OAuth] Session error:', sessionError);
                                safeResolve(false);
                                return;
                            }

                            await useAuthStore.getState().initialize();
                            console.log('[OAuth] Session set successfully via deep link');
                            safeResolve(true);
                        } else {
                            console.error('[OAuth] Missing tokens in callback URL');
                            safeResolve(false);
                        }
                    } catch (err) {
                        console.error('[OAuth] Error processing deep link:', err);
                        safeResolve(false);
                    }
                });
            }

            // Strategy B: Listen for browser close (for when deep links don't work)
            // When user completes OAuth and browser closes, check Supabase session
            if (Plugins?.Browser) {
                browserFinishedHandle = Plugins.Browser.addListener('browserFinished', async () => {
                    console.log('[OAuth] Browser finished/closed, checking for session...');

                    // Short delay to allow any pending redirects
                    await new Promise(r => setTimeout(r, 1000));

                    try {
                        // Check if the session was somehow established
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData?.session) {
                            console.log('[OAuth] Session found after browser close!');
                            await useAuthStore.getState().initialize();
                            safeResolve(true);
                        } else {
                            console.log('[OAuth] No session found after browser close');
                            safeResolve(false);
                        }
                    } catch (err) {
                        console.error('[OAuth] Error checking session after browser close:', err);
                        safeResolve(false);
                    }
                });
            }

            // If neither plugin available, resolve immediately
            if (!Plugins?.App && !Plugins?.Browser) {
                console.error('[OAuth] Neither App nor Browser plugin available');
                safeResolve(false);
            }
        });
    } catch (error: any) {
        console.error('[OAuth] Capacitor Apple OAuth error:', error);
        (globalThis as any).alert?.('Apple Sign-In failed: ' + (error?.message || 'Unknown error'));
        return false;
    }
}
