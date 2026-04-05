import { create } from 'zustand';
import { supabase, safeFetch, ensureUserProfile } from '@cliniqone/api';
import type { User } from '@cliniqone/types';
import type { Session } from '@supabase/supabase-js';
import { markHasAccount } from '../pages/auth/AuthPage';

/** Push JWT to native SharedPreferences via Capacitor plugin (no-op on web) */
async function syncTokenToNative(token: string | null) {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        // Dynamic import of the native plugin
        const { registerPlugin } = await import('@capacitor/core');
        interface AuthBridgePlugin { syncToken(opts: { token: string }): Promise<{ success: boolean }>; clearToken(): Promise<{ success: boolean }>; }
        const AuthBridge = registerPlugin<AuthBridgePlugin>('AuthBridge');
        if (token) { await AuthBridge.syncToken({ token }); } else { await AuthBridge.clearToken(); }
    } catch { /* Not on native or plugin not available */ }
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
    signOut: () => Promise<void>;
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    isReady: false,
    _authSubscription: null,

    initialize: async () => {
        const prev = get()._authSubscription;
        if (prev) prev.unsubscribe();

        try {
            // On web: if URL contains OAuth hash tokens, parse them directly
            if (window.location.hash.includes('access_token')) {
                console.log('[Auth] OAuth redirect detected — extracting tokens...');
                const hashPart = window.location.hash.substring(1);
                const params = new URLSearchParams(hashPart);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                // Clean hash from URL
                window.history.replaceState(null, '', window.location.pathname);

                if (access_token && refresh_token) {
                    try {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (!sessionError && sessionData.session) {
                            const oauthSession = sessionData.session;
                            // Ensure public.users row exists (first-time OAuth users)
                            const userData = await ensureUserProfile(
                                oauthSession.user.id,
                                oauthSession.user.email,
                                oauthSession.user.user_metadata?.full_name || oauthSession.user.user_metadata?.name,
                                'patient',
                            );
                            set({ session: oauthSession, user: userData as User | null, isLoading: false, isReady: true });
                            syncTokenToNative(oauthSession.access_token);
                            markHasAccount();

                            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                                set({ session: newSession });
                                if (event === 'TOKEN_REFRESHED') { if (newSession) syncTokenToNative(newSession.access_token); return; }
                                if (newSession) {
                                    syncTokenToNative(newSession.access_token);
                                    try { const { data: ud } = await safeFetch(() => supabase.from('users').select('*').eq('id', newSession.user.id).single(), { timeout: 5000, retries: 0, label: 'authChangeUser' }); set({ user: ud as User | null }); } catch {}
                                } else { set({ user: null }); syncTokenToNative(null); }
                            });
                            set({ _authSubscription: subscription });
                            return;
                        }
                    } catch (err) { console.error('[Auth] Error processing OAuth tokens:', err); }
                }
            }

            // Normal flow
            const { data } = await safeFetch(() => supabase.auth.getSession(), { timeout: 5000, retries: 1, label: 'getSession' });
            const session = data.session;

            if (session) {
                // Ensure public.users row exists (covers OAuth redirect returns)
                const userData = await ensureUserProfile(
                    session.user.id,
                    session.user.email,
                    session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                    'patient',
                );
                set({ session, user: userData as User | null, isLoading: false, isReady: true });
                syncTokenToNative(session.access_token);
                markHasAccount();
            } else {
                set({ session: null, user: null, isLoading: false, isReady: true });
                syncTokenToNative(null);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                set({ session: newSession });
                if (event === 'TOKEN_REFRESHED') { if (newSession) syncTokenToNative(newSession.access_token); return; }
                if (newSession) {
                    syncTokenToNative(newSession.access_token);
                    try { const { data: userData } = await safeFetch(() => supabase.from('users').select('*').eq('id', newSession.user.id).single(), { timeout: 5000, retries: 0, label: 'authChangeUser' }); set({ user: userData as User | null }); } catch {}
                } else { set({ user: null }); syncTokenToNative(null); }
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
            const { data: userData } = await safeFetch(() => supabase.from('users').select('*').eq('id', session.user.id).single(), { timeout: 5000, retries: 1, label: 'refreshUser' });
            if (userData) set({ user: userData as User });
        } catch {}
    },
    signOut: async () => {
        try { await supabase.auth.signOut(); } catch {}
        syncTokenToNative(null);
        set({ session: null, user: null });
    },
    clear: () => { syncTokenToNative(null); set({ session: null, user: null }); },
}));
