import { create } from 'zustand';
import { supabase } from '@cliniqone/api';
import { getDoctorProfile, getMyApplication, ensureUserProfile } from '@cliniqone/api';
import type { Doctor } from '@cliniqone/types';
import type { DoctorApplication } from '@cliniqone/api';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    doctor: Doctor | null;
    application: DoctorApplication | null;
    isLoading: boolean;
    isReady: boolean;
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
    application: null,
    isLoading: true,
    isReady: false,
    isNewRegistration: false,

    initialize: async () => {
        try {
            const hasOAuthHash = window.location.hash.includes('access_token');
            if (hasOAuthHash) {
                console.log('[DoctorAuth] OAuth hash detected, exchanging tokens...');
                await new Promise((r) => setTimeout(r, 500));
            }

            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                console.log('[DoctorAuth] Session found, fetching doctor profile...');
                const doctor = await getDoctorProfile(session.user.id);

                if (doctor) {
                    console.log('[DoctorAuth] Doctor profile found:', doctor.display_name, 'status:', doctor.status);
                    set({ session, doctor, application: null, isLoading: false, isReady: true, isNewRegistration: false });
                } else {
                    console.log('[DoctorAuth] No doctor profile — checking for application...');
                    // Check if there's an existing application
                    let application: DoctorApplication | null = null;
                    try {
                        application = await getMyApplication(session.user.id);
                    } catch { /* no application yet */ }

                    if (application) {
                        console.log('[DoctorAuth] Application found, status:', application.status);
                    } else {
                        console.log('[DoctorAuth] No application — new OAuth registration');
                    }
                    // Ensure a public.users row exists for this doctor
                    await ensureUserProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                        'doctor',
                    );
                    set({ session, doctor: null, application, isLoading: false, isReady: true, isNewRegistration: true });
                }
            } else {
                set({ session: null, doctor: null, application: null, isLoading: false, isReady: true, isNewRegistration: false });
            }

            if (!_listenerRegistered) {
                _listenerRegistered = true;
                supabase.auth.onAuthStateChange(async (event, newSession) => {
                    if (event === 'TOKEN_REFRESHED') {
                        set({ session: newSession });
                        return;
                    }
                    console.log('[DoctorAuth] Auth state changed:', event);
                    set({ session: newSession });

                    if (newSession) {
                        const doctor = await getDoctorProfile(newSession.user.id);
                        if (doctor) {
                            set({ doctor, application: null, isNewRegistration: false });
                        } else {
                            let application: DoctorApplication | null = null;
                            try { application = await getMyApplication(newSession.user.id); } catch { /* */ }
                            set({ doctor: null, application, isNewRegistration: true });
                        }
                    } else {
                        set({ doctor: null, application: null, isNewRegistration: false });
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
    clear: () => set({ session: null, doctor: null, application: null, isNewRegistration: false }),
}));

