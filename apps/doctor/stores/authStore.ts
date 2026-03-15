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

    initialize: async () => {
        try {
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                // Fetch doctor profile (not user profile like patient app)
                const doctor = await getDoctorProfile(session.user.id);
                set({ session, doctor, isLoading: false, isReady: true });
            } else {
                set({ session: null, doctor: null, isLoading: false, isReady: true });
            }

            // Listen for auth changes — only register once
            if (!_listenerRegistered) {
                _listenerRegistered = true;
                supabase.auth.onAuthStateChange(async (_event, newSession) => {
                    set({ session: newSession });

                    if (newSession) {
                        const doctor = await getDoctorProfile(newSession.user.id);
                        set({ doctor });
                    } else {
                        set({ doctor: null });
                    }
                });
            }
        } catch (error) {
            console.error('Doctor auth initialization error:', error);
            set({ isLoading: false, isReady: true });
        }
    },

    setSession: (session) => set({ session }),
    setDoctor: (doctor) => set({ doctor }),
    clear: () => set({ session: null, doctor: null }),
}));
