import { create } from 'zustand';
import { supabase } from '@cliniqone/api';
import { getDoctorProfile } from '@cliniqone/api';
import type { Doctor } from '@cliniqone/types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    doctor: Doctor | null;
    isLoading: boolean;
    isReady: boolean;
    /** True when user is authenticated but has no doctor profile (new OAuth registration) */
    isNewRegistration: boolean;

    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    setDoctor: (doctor: Doctor | null) => void;
    clear: () => void;
}

let _listenerRegistered = false;

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    doctor: null,
    isLoading: true,
    isReady: false,
    isNewRegistration: false,

    initialize: async () => {
        try {
            // Check for OAuth hash tokens on web
            const _g = globalThis as any;
            const hasOAuthHash =
                typeof _g.window !== 'undefined' &&
                _g.window.location?.hash?.includes('access_token');

            if (hasOAuthHash) {
                console.log('[DoctorAuth] OAuth hash detected, exchanging tokens...');
                // Let Supabase auto-detect hash and set session
                await new Promise((r) => setTimeout(r, 500));
            }

            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                console.log('[DoctorAuth] Session found, fetching doctor profile...');
                const doctor = await getDoctorProfile(session.user.id);

                if (doctor) {
                    console.log('[DoctorAuth] Doctor profile found:', doctor.display_name, 'status:', doctor.status);
                    set({ session, doctor, isLoading: false, isReady: true, isNewRegistration: false });
                } else {
                    console.log('[DoctorAuth] No doctor profile — new OAuth registration');
                    set({ session, doctor: null, isLoading: false, isReady: true, isNewRegistration: true });
                }
            } else {
                set({ session: null, doctor: null, isLoading: false, isReady: true, isNewRegistration: false });
            }

            // Listen for auth changes — only register once
            if (!_listenerRegistered) {
                _listenerRegistered = true;
                supabase.auth.onAuthStateChange(async (event, newSession) => {
                    // Skip redundant token refresh events
                    if (event === 'TOKEN_REFRESHED') {
                        set({ session: newSession });
                        return;
                    }

                    console.log('[DoctorAuth] Auth state changed:', event);
                    set({ session: newSession });

                    if (newSession) {
                        const doctor = await getDoctorProfile(newSession.user.id);
                        if (doctor) {
                            set({ doctor, isNewRegistration: false });
                        } else {
                            set({ doctor: null, isNewRegistration: true });
                        }
                    } else {
                        set({ doctor: null, isNewRegistration: false });
                    }
                });
            }
        } catch (error) {
            console.error('[DoctorAuth] Initialization error:', error);
            set({ isLoading: false, isReady: true });
        }
    },

    setSession: (session) => set({ session }),
    setDoctor: (doctor) => set({ doctor }),
    clear: () => set({ session: null, doctor: null, isNewRegistration: false }),
}));
