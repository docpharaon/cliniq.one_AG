import { create } from 'zustand';
import { supabase } from '@cliniqone/api';
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
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    isReady: false,

    initialize: async () => {
        try {
            // Get current session
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                // Fetch user profile
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                set({ session, user: userData as User | null, isLoading: false, isReady: true });
            } else {
                set({ session: null, user: null, isLoading: false, isReady: true });
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, newSession) => {
                set({ session: newSession });

                if (newSession) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', newSession.user.id)
                        .single();
                    set({ user: userData as User | null });
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
    clear: () => set({ session: null, user: null }),
}));
