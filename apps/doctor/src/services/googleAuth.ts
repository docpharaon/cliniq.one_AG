import { supabase } from '@cliniqone/api';
import { useAuthStore } from '../stores/authStore';

/** Check if we're running inside a Capacitor WebView */
function isCapacitorNative(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Google Sign-In for Doctor app.
 * - Plain browser: Supabase OAuth redirect
 * - Capacitor: deep-link flow via system browser
 */
export async function handleGoogleSignIn(): Promise<boolean> {
    // Pre-flight connectivity check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
    }

    if (isCapacitorNative()) {
        return handleCapacitorGoogleOAuth();
    }

    // Plain browser
    try {
        console.log('[OAuth] Starting Google OAuth (web browser)...');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('[OAuth] Google OAuth error:', error);
        return false;
    }
}

async function handleCapacitorGoogleOAuth(): Promise<boolean> {
    const Cap = (window as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Google OAuth (Doctor)');

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'com.cliniqone.doctor.cap://callback',
                skipBrowserRedirect: true,
                queryParams: { prompt: 'select_account' },
            },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No OAuth URL received');

        if (Plugins?.Browser) {
            await Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
        } else {
            window.open(data.url, '_blank');
        }

        return new Promise<boolean>((resolve) => {
            let resolved = false;
            const safeResolve = (value: boolean) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(value);
            };

            const timeout = setTimeout(() => safeResolve(false), 120_000);
            let deepLinkHandle: any = null;
            let browserFinishedHandle: any = null;

            function cleanup() {
                clearTimeout(timeout);
                deepLinkHandle?.remove?.();
                browserFinishedHandle?.remove?.();
            }

            if (Plugins?.App) {
                deepLinkHandle = Plugins.App.addListener('appUrlOpen', async (event: { url: string }) => {
                    if (!event.url.includes('callback')) return;
                    try { await Plugins.Browser?.close(); } catch (_) {}

                    try {
                        const hashPart = event.url.split('#')[1];
                        if (!hashPart) { safeResolve(false); return; }

                        const params = new URLSearchParams(hashPart);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');

                        if (access_token && refresh_token) {
                            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                            if (sessionError) { safeResolve(false); return; }
                            await useAuthStore.getState().initialize();
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

            if (Plugins?.Browser) {
                browserFinishedHandle = Plugins.Browser.addListener('browserFinished', async () => {
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData?.session) {
                            await useAuthStore.getState().initialize();
                            safeResolve(true);
                        } else {
                            safeResolve(false);
                        }
                    } catch {
                        safeResolve(false);
                    }
                });
            }

            if (!Plugins?.App && !Plugins?.Browser) safeResolve(false);
        });
    } catch (error: any) {
        console.error('[OAuth] Capacitor Google OAuth error:', error);
        return false;
    }
}
