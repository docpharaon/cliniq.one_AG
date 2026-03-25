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
            // Get current session (with timeout protection)
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
