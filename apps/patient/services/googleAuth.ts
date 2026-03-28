import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { signInWithGoogle, supabase } from '@cliniqone/api';
import { ENV } from '@cliniqone/config';
import { useAuthStore } from '../stores/authStore';

/** Check if we're running inside a Capacitor WebView */
function isCapacitorNative(): boolean {
    return (
        typeof window !== 'undefined' &&
        !!(window as any).Capacitor &&
        (window as any).Capacitor.isNativePlatform?.() === true
    );
}

/**
 * Configure and execute Google Sign-In.
 * - On web (Capacitor): opens OAuth in system browser, returns via deep link
 * - On web (plain browser): uses Supabase OAuth redirect
 * - On native: uses @react-native-google-signin for native UI
 * Returns true on success, false on cancellation/error.
 */
export async function handleGoogleSignIn(): Promise<boolean> {
    // Web: Use Supabase OAuth
    if (Platform.OS === 'web') {
        // --- Capacitor WebView: deep-link redirect flow ---
        if (isCapacitorNative()) {
            return handleCapacitorGoogleOAuth();
        }

        // --- Plain browser: standard redirect flow ---
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

/**
 * Capacitor-specific Google OAuth flow:
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
async function handleCapacitorGoogleOAuth(): Promise<boolean> {
    const Cap = (window as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Google OAuth flow');
    console.log('[OAuth] Capacitor detected:', !!Cap);
    console.log('[OAuth] Browser plugin:', !!Plugins?.Browser);
    console.log('[OAuth] App plugin:', !!Plugins?.App);

    try {
        // Use the PKCE flow: redirect the browser to the Supabase OAuth URL
        // After Google auth, Supabase will redirect to our redirectTo URL
        // with tokens in the hash fragment.
        //
        // On Android Chrome Custom Tabs, custom schemes often don't work.
        // So we redirect to the Supabase site URL which will include tokens
        // in the hash. When the user closes the browser, we check for session.
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'com.cliniqone.patient.cap://callback',
                skipBrowserRedirect: true,
            },
        });

        if (error) {
            console.error('[OAuth] Error getting OAuth URL:', error);
            throw error;
        }
        if (!data?.url) throw new Error('No OAuth URL received');

        console.log('[OAuth] Got OAuth URL, opening browser...');
        console.log('[OAuth] URL:', data.url.substring(0, 100) + '...');

        // Open the OAuth URL in the system browser
        if (Plugins?.Browser) {
            await Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
        } else {
            window.open(data.url, '_blank');
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
                            // Don't resolve false here — user might have just
                            // swiped away the browser and will retry
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
        console.error('[OAuth] Capacitor Google OAuth error:', error);
        (globalThis as any).alert?.('Google Sign-In failed: ' + (error?.message || 'Unknown error'));
        return false;
    }
}
