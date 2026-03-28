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
 * Apple Sign-In for Doctor app.
 * Returns true on success, false on cancellation/error.
 */
export async function handleAppleSignIn(): Promise<boolean> {
    if (Platform.OS === 'web' || Platform.OS === 'android') {
        if (isCapacitorNative()) {
            return handleCapacitorAppleOAuth();
        }

        // Plain browser
        try {
            console.log('[OAuth] Starting Apple OAuth (web browser)...');
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

    // iOS native
    try {
        const AppleAuthentication = require('expo-apple-authentication');
        const Crypto = require('expo-crypto');

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
        if (!idToken) throw new Error('No identity token received');

        const displayName = credential.fullName
            ? [credential.fullName.givenName, credential.fullName.familyName]
                  .filter(Boolean).join(' ') || null
            : null;

        const { signInWithApple } = require('@cliniqone/api');
        await signInWithApple(idToken, displayName, rawNonce);
        await useAuthStore.getState().initialize();
        return true;
    } catch (error: any) {
        if (error?.code === 'ERR_REQUEST_CANCELED') return false;
        console.error('[OAuth] Apple Sign-In error:', error);
        Alert.alert('Sign-In Failed', error?.message || 'An unexpected error occurred.');
        return false;
    }
}

/**
 * Capacitor-specific Apple OAuth (dual strategy).
 */
async function handleCapacitorAppleOAuth(): Promise<boolean> {
    const Cap = (globalThis as any).Capacitor;
    const Plugins = Cap?.Plugins;

    console.log('[OAuth] Starting Capacitor Apple OAuth (Doctor)');

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: 'com.cliniqone.doctor.cap://callback',
                skipBrowserRedirect: true,
                queryParams: { prompt: 'consent' },
            },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No OAuth URL received');

        console.log('[OAuth] Got Apple OAuth URL, opening browser...');

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

            const timeout = setTimeout(() => safeResolve(false), 120_000);
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

            // Strategy B: Browser closed
            if (Plugins?.Browser) {
                browserFinishedHandle = Plugins.Browser.addListener('browserFinished', async () => {
                    console.log('[OAuth] Browser finished, checking session...');
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData?.session) {
                            await useAuthStore.getState().initialize();
                            safeResolve(true);
                        } else {
                            safeResolve(false);
                        }
                    } catch (err) {
                        safeResolve(false);
                    }
                });
            }

            if (!Plugins?.App && !Plugins?.Browser) safeResolve(false);
        });
    } catch (error: any) {
        console.error('[OAuth] Capacitor Apple OAuth error:', error);
        (globalThis as any).alert?.('Apple Sign-In failed: ' + (error?.message || 'Unknown error'));
        return false;
    }
}
