import { supabase } from '@cliniqone/api';
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
 * Handle Apple Sign-In.
 * - On Capacitor WebView: opens OAuth in system browser, returns via deep link
 * - On plain browser: uses Supabase OAuth redirect
 * Returns true on success, false on cancellation/error.
 */
export async function handleAppleSignIn(): Promise<boolean> {
    // Pre-flight connectivity check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
    }

    // Capacitor WebView: deep-link redirect flow
    if (isCapacitorNative()) {
        return handleCapacitorAppleOAuth();
    }

    // Plain browser: standard redirect flow
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: window.location.origin,
                queryParams: { prompt: 'consent' },
            },
        });

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('[OAuth] Apple OAuth error:', error);
        return false;
    }
}

/**
 * Capacitor-specific Apple OAuth flow:
 * Same dual strategy as Google (deep link + browserFinished).
 */
async function handleCapacitorAppleOAuth(): Promise<boolean> {
    const Cap = (window as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Apple OAuth flow');

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: 'com.cliniqone.patient://callback',
                skipBrowserRedirect: true,
                queryParams: { prompt: 'consent' },
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
                    try { await Plugins.Browser?.close(); } catch {}

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
                    } catch {
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

            if (!Plugins?.App && !Plugins?.Browser) {
                safeResolve(false);
            }
        });
    } catch (error: any) {
        console.error('[OAuth] Capacitor Apple OAuth error:', error);
        return false;
    }
}
