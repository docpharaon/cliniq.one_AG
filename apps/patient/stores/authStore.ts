import { create } from 'zustand';
import { supabase, safeFetch } from '@cliniqone/api';
import type { User } from '@cliniqone/types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isReady: boolean;

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

    initialize: async () => {
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
            } else {
                set({ session: null, user: null, isLoading: false, isReady: true });
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, newSession) => {
                set({ session: newSession });

                if (newSession) {
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
                }
            });
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
    clear: () => set({ session: null, user: null }),
}));
