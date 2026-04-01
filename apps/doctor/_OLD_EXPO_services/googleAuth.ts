import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@cliniqone/api';
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
 * Google Sign-In for Doctor app.
 * - On web (plain browser): Supabase OAuth redirect
 * - On web (Capacitor): deep-link flow via system browser
 * Returns true on success, false on cancellation/error.
 */
export async function handleGoogleSignIn(): Promise<boolean> {
    if (Platform.OS === 'web' || Platform.OS === 'android') {
        if (isCapacitorNative()) {
            return handleCapacitorGoogleOAuth();
        }

        // Plain browser
        try {
            console.log('[OAuth] Starting Google OAuth (web browser)...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: (globalThis as any).window?.location?.origin,
                    queryParams: { prompt: 'select_account' },
                },
            });

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('[OAuth] Google OAuth error:', error);
            if (Platform.OS === 'web') {
                (globalThis as any).alert?.('Google Sign-In failed: ' + (error?.message || 'Unknown error'));
            } else {
                Alert.alert('Sign-In Failed', error?.message || 'Google Sign-In failed');
            }
            return false;
        }
    }

    // iOS: fallback to web OAuth
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('[OAuth] Google Sign-In error:', error);
        Alert.alert('Sign-In Failed', error?.message || 'An unexpected error occurred.');
        return false;
    }
}

/**
 * Capacitor-specific Google OAuth flow (dual strategy):
 * A) Deep link listener (appUrlOpen)
 * B) browserFinished listener (fallback for Android Chrome Custom Tabs)
 */
async function handleCapacitorGoogleOAuth(): Promise<boolean> {
    const Cap = (globalThis as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Google OAuth (Doctor)');
    console.log('[OAuth] Browser plugin:', !!Plugins?.Browser);
    console.log('[OAuth] App plugin:', !!Plugins?.App);

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'com.cliniqone.doctor.cap://callback',
                skipBrowserRedirect: true,
                queryParams: { prompt: 'select_account' },
            },
        });

        if (error) {
            console.error('[OAuth] Error getting Google OAuth URL:', error);
            throw error;
        }
        if (!data?.url) throw new Error('No OAuth URL received');

        console.log('[OAuth] Got Google OAuth URL, opening browser...');

        if (Plugins?.Browser) {
            await Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
        } else {
            (globalThis as any).window?.open?.(data.url, '_blank');
        }

        return new Promise<boolean>((resolve) => {
            let resolved = false;
            const safeResolve = (value: boolean) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(value);
            };

            const timeout = setTimeout(() => {
                console.log('[OAuth] Timeout reached');
                safeResolve(false);
            }, 120_000);

            let deepLinkHandle: any = null;
            let browserFinishedHandle: any = null;

            function cleanup() {
                clearTimeout(timeout);
                deepLinkHandle?.remove?.();
                browserFinishedHandle?.remove?.();
            }

            // Strategy A: Deep link
            if (Plugins?.App) {
                deepLinkHandle = Plugins.App.addListener('appUrlOpen', async (event: { url: string }) => {
                    const url = event.url;
                    console.log('[OAuth] Deep link received:', url);
                    if (!url.includes('callback')) return;

                    try { await Plugins.Browser?.close(); } catch (_) {}

                    try {
                        const hashPart = url.split('#')[1];
                        if (!hashPart) { safeResolve(false); return; }

                        const params = new URLSearchParams(hashPart);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');

                        if (access_token && refresh_token) {
                            console.log('[OAuth] Setting session from deep link...');
                            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                            if (sessionError) { console.error('[OAuth] Session error:', sessionError); safeResolve(false); return; }
                            await useAuthStore.getState().initialize();
                            console.log('[OAuth] Session set via deep link!');
                            safeResolve(true);
                        } else {
                            safeResolve(false);
                        }
                    } catch (err) {
                        console.error('[OAuth] Deep link error:', err);
                        safeResolve(false);
                    }
                });
            }

            // Strategy B: Browser closed
            if (Plugins?.Browser) {
                browserFinishedHandle = Plugins.Browser.addListener('browserFinished', async () => {
                    console.log('[OAuth] Browser finished, checking session...');
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData?.session) {
                            console.log('[OAuth] Session found after browser close!');
                            await useAuthStore.getState().initialize();
                            safeResolve(true);
                        } else {
                            console.log('[OAuth] No session after browser close');
                            safeResolve(false);
                        }
                    } catch (err) {
                        console.error('[OAuth] Error checking session:', err);
                        safeResolve(false);
                    }
                });
            }

            if (!Plugins?.App && !Plugins?.Browser) {
                safeResolve(false);
            }
        });
    } catch (error: any) {
        console.error('[OAuth] Capacitor Google OAuth error:', error);
        (globalThis as any).alert?.('Google Sign-In failed: ' + (error?.message || 'Unknown error'));
        return false;
    }
}
