import { create } from 'zustand';
import { supabase, safeFetch } from '@cliniqone/api';
import type { User } from '@cliniqone/types';
import type { Session } from '@supabase/supabase-js';
import { Capacitor, registerPlugin } from '@capacitor/core';

// ── Native auth bridge (syncs JWT to SharedPreferences for widget) ──
interface AuthBridgePlugin {
    syncToken(opts: { token: string }): Promise<{ success: boolean }>;
    clearToken(): Promise<{ success: boolean }>;
}
const AuthBridge = registerPlugin<AuthBridgePlugin>('AuthBridge');

/** Push JWT to native SharedPreferences (no-op on web) */
async function syncTokenToNative(token: string | null) {
    if (!Capacitor.isNativePlatform()) return;
    try {
        if (token) {
            await AuthBridge.syncToken({ token });
        } else {
            await AuthBridge.clearToken();
        }
    } catch (e) {
        console.warn('[AuthBridge] sync failed:', e);
    }
}

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isReady: boolean;
    _authSubscription: { unsubscribe: () => void } | null;

    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<void>;
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    isReady: false,
    _authSubscription: null,

    initialize: async () => {
        // Clean up previous listener if any
        const prev = get()._authSubscription;
        if (prev) prev.unsubscribe();

        try {
            // On web: if URL contains OAuth hash tokens (#access_token=...),
            // parse them directly and call setSession() — this is synchronous and avoids
            // racing against the safety timeout in _layout.tsx.
            const _win = globalThis as any;
            const isWeb = typeof _win.window !== 'undefined' && typeof _win.document !== 'undefined';
            if (isWeb && _win.window.location.hash.includes('access_token')) {
                console.log('[Auth] OAuth redirect detected — extracting tokens from URL hash...');

                // Parse tokens from the hash fragment: #access_token=...&refresh_token=...
                const hashPart = _win.window.location.hash.substring(1); // remove the #
                const params = new URLSearchParams(hashPart);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                // Clean the hash from the URL immediately to prevent re-processing
                if (_win.window.history?.replaceState) {
                    _win.window.history.replaceState(null, '', _win.window.location.pathname);
                }

                if (access_token && refresh_token) {
                    try {
                        // Set the session directly — no waiting needed
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (sessionError) {
                            console.error('[Auth] Failed to set OAuth session:', sessionError);
                            // Fall through to normal flow
                        } else if (sessionData.session) {
                            console.log('[Auth] OAuth session established successfully');
                            const oauthSession = sessionData.session;

                            // Fetch user profile
                            const { data: userData } = await safeFetch(
                                () => supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', oauthSession.user.id)
                                    .single(),
                                { timeout: 5000, retries: 1, label: 'fetchOAuthUser' },
                            );
                            set({ session: oauthSession, user: userData as User | null, isLoading: false, isReady: true });
                            syncTokenToNative(oauthSession.access_token);

                            // Register the ongoing listener
                            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                                set({ session: newSession });
                                if (event === 'TOKEN_REFRESHED') {
                                    if (newSession) syncTokenToNative(newSession.access_token);
                                    return;
                                }
                                if (newSession) {
                                    syncTokenToNative(newSession.access_token);
                                    try {
                                        const { data: ud } = await safeFetch(
                                            () => supabase.from('users').select('*').eq('id', newSession.user.id).single(),
                                            { timeout: 5000, retries: 0, label: 'authChangeUser' },
                                        );
                                        set({ user: ud as User | null });
                                    } catch (err) {
                                        console.warn('Failed to fetch user on auth change:', err);
                                    }
                                } else {
                                    set({ user: null });
                                    syncTokenToNative(null);
                                }
                            });
                            set({ _authSubscription: subscription });
                            return; // Done — OAuth session established
                        }
                    } catch (err) {
                        console.error('[Auth] Error processing OAuth tokens:', err);
                    }
                }
                // If tokens missing or error: fall through to normal flow
            }

            // Normal flow: Get current session (with timeout protection)
            const { data } = await safeFetch(
                () => supabase.auth.getSession(),
                { timeout: 5000, retries: 1, label: 'getSession' },
            );
            const session = data.session;

            if (session) {
                // Fetch user profile (with timeout protection)
                const { data: userData } = await safeFetch(
                    () => supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single(),
                    { timeout: 5000, retries: 1, label: 'fetchUserProfile' },
                );

                set({ session, user: userData as User | null, isLoading: false, isReady: true });
                syncTokenToNative(session.access_token);
            } else {
                set({ session: null, user: null, isLoading: false, isReady: true });
                syncTokenToNative(null);
            }

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                set({ session: newSession });

                // Token refresh: just update session, skip profile re-fetch
                if (event === 'TOKEN_REFRESHED') {
                    if (newSession) syncTokenToNative(newSession.access_token);
                    return;
                }

                if (newSession) {
                    syncTokenToNative(newSession.access_token);
                    try {
                        const { data: userData } = await safeFetch(
                            () => supabase
                                .from('users')
                                .select('*')
                                .eq('id', newSession.user.id)
                                .single(),
                            { timeout: 5000, retries: 0, label: 'authChangeUser' },
                        );
                        set({ user: userData as User | null });
                    } catch (err) {
                        console.warn('Failed to fetch user on auth change:', err);
                    }
                } else {
                    set({ user: null });
                    syncTokenToNative(null);
                }
            });
            set({ _authSubscription: subscription });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false, isReady: true });
        }
    },

    setSession: (session) => set({ session }),
    setUser: (user) => set({ user }),
    refreshUser: async () => {
        const { session } = get();
        if (!session) return;
        try {
            const { data: userData } = await safeFetch(
                () => supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single(),
                { timeout: 5000, retries: 1, label: 'refreshUser' },
            );
            if (userData) set({ user: userData as User });
        } catch (err) {
            console.warn('Failed to refresh user:', err);
        }
    },
    clear: () => {
        syncTokenToNative(null);
        set({ session: null, user: null });
    },
}));
