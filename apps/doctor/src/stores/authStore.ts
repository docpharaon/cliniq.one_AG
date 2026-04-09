import { create } from 'zustand';
import { supabase, safeFetch } from '@cliniqone/api';
import { getDoctorProfile, getMyApplication, ensureUserProfile } from '@cliniqone/api';
import type { Doctor } from '@cliniqone/types';
import type { DoctorApplication } from '@cliniqone/api';
import type { Session } from '@supabase/supabase-js';

/** Push JWT to native SharedPreferences via Capacitor plugin (no-op on web) */
async function syncTokenToNative(token: string | null) {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { registerPlugin } = await import('@capacitor/core');
        interface AuthBridgePlugin { syncToken(opts: { token: string }): Promise<{ success: boolean }>; clearToken(): Promise<{ success: boolean }>; }
        const AuthBridge = registerPlugin<AuthBridgePlugin>('AuthBridge');
        if (token) { await AuthBridge.syncToken({ token }); } else { await AuthBridge.clearToken(); }
    } catch { /* Not on native or plugin not available */ }
}

interface AuthState {
    session: Session | null;
    doctor: Doctor | null;
    application: DoctorApplication | null;
    isLoading: boolean;
    isReady: boolean;
    isNewRegistration: boolean;
    _authSubscription: { unsubscribe: () => void } | null;
    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    setDoctor: (doctor: Doctor | null) => void;
    refreshDoctor: () => Promise<void>;
    signOut: () => Promise<void>;
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    doctor: null,
    application: null,
    isLoading: true,
    isReady: false,
    isNewRegistration: false,
    _authSubscription: null,

    initialize: async () => {
        // Unsubscribe previous listener
        const prev = get()._authSubscription;
        if (prev) prev.unsubscribe();

        try {
            // On web: if URL contains OAuth hash tokens, parse them directly
            if (window.location.hash.includes('access_token')) {
                console.log('[DoctorAuth] OAuth redirect detected — extracting tokens...');
                const hashPart = window.location.hash.substring(1);
                const params = new URLSearchParams(hashPart);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                // Clean hash from URL immediately
                window.history.replaceState(null, '', window.location.pathname);

                if (access_token && refresh_token) {
                    try {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (!sessionError && sessionData.session) {
                            const oauthSession = sessionData.session;
                            // Ensure public.users row exists
                            await ensureUserProfile(
                                oauthSession.user.id,
                                oauthSession.user.email,
                                oauthSession.user.user_metadata?.full_name || oauthSession.user.user_metadata?.name,
                                'doctor',
                            );
                            const doctor = await getDoctorProfile(oauthSession.user.id);
                            if (doctor) {
                                set({ session: oauthSession, doctor, application: null, isLoading: false, isReady: true, isNewRegistration: false });
                            } else {
                                let application: DoctorApplication | null = null;
                                try { application = await getMyApplication(oauthSession.user.id); } catch { /* */ }
                                set({ session: oauthSession, doctor: null, application, isLoading: false, isReady: true, isNewRegistration: true });
                            }
                            syncTokenToNative(oauthSession.access_token);

                            // Register auth listener
                            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                                set({ session: newSession });
                                if (event === 'TOKEN_REFRESHED') { if (newSession) syncTokenToNative(newSession.access_token); return; }
                                if (newSession) {
                                    syncTokenToNative(newSession.access_token);
                                    const doc = await getDoctorProfile(newSession.user.id);
                                    if (doc) { set({ doctor: doc, application: null, isNewRegistration: false }); }
                                    else {
                                        let app: DoctorApplication | null = null;
                                        try { app = await getMyApplication(newSession.user.id); } catch { /* */ }
                                        set({ doctor: null, application: app, isNewRegistration: true });
                                    }
                                } else { set({ doctor: null, application: null, isNewRegistration: false }); syncTokenToNative(null); }
                            });
                            set({ _authSubscription: subscription });
                            return;
                        }
                    } catch (err) { console.error('[DoctorAuth] Error processing OAuth tokens:', err); }
                }
            }

            // Normal flow
            const { data } = await safeFetch(
                () => supabase.auth.getSession(),
                { timeout: 5000, retries: 1, label: 'getSession' },
            );
            const session = data.session;

            if (session) {
                console.log('[DoctorAuth] Session found, fetching doctor profile...');
                const doctor = await getDoctorProfile(session.user.id);

                if (doctor) {
                    console.log('[DoctorAuth] Doctor profile found:', doctor.display_name, 'status:', doctor.status);
                    set({ session, doctor, application: null, isLoading: false, isReady: true, isNewRegistration: false });
                    syncTokenToNative(session.access_token);
                } else {
                    console.log('[DoctorAuth] No doctor profile — checking for application...');
                    let application: DoctorApplication | null = null;
                    try {
                        application = await getMyApplication(session.user.id);
                    } catch { /* no application yet */ }

                    await ensureUserProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                        'doctor',
                    );
                    set({ session, doctor: null, application, isLoading: false, isReady: true, isNewRegistration: true });
                    syncTokenToNative(session.access_token);
                }
            } else {
                set({ session: null, doctor: null, application: null, isLoading: false, isReady: true, isNewRegistration: false });
                syncTokenToNative(null);
            }

            // Register auth state change listener
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                set({ session: newSession });
                if (event === 'TOKEN_REFRESHED') { if (newSession) syncTokenToNative(newSession.access_token); return; }
                console.log('[DoctorAuth] Auth state changed:', event);

                if (newSession) {
                    syncTokenToNative(newSession.access_token);
                    try {
                        const { data: doc } = await safeFetch(
                            () => supabase.from('doctors').select('*').eq('user_id', newSession.user.id).single(),
                            { timeout: 5000, retries: 0, label: 'authChangeDoctor' },
                        );
                        if (doc) { set({ doctor: doc as Doctor, application: null, isNewRegistration: false }); }
                        else {
                            let application: DoctorApplication | null = null;
                            try { application = await getMyApplication(newSession.user.id); } catch { /* */ }
                            set({ doctor: null, application, isNewRegistration: true });
                        }
                    } catch { /* */ }
                } else {
                    set({ doctor: null, application: null, isNewRegistration: false });
                    syncTokenToNative(null);
                }
            });
            set({ _authSubscription: subscription });
        } catch (error) {
            console.error('[DoctorAuth] Initialization error:', error);
            set({ isLoading: false, isReady: true });
        }
    },

    setSession: (session) => set({ session }),
    setDoctor: (doctor) => set({ doctor }),
    refreshDoctor: async () => {
        const { session } = get();
        if (!session) return;
        try {
            const doctor = await getDoctorProfile(session.user.id);
            if (doctor) set({ doctor });
        } catch { /* */ }
    },
    signOut: async () => {
        try { await supabase.auth.signOut(); } catch { /* */ }
        syncTokenToNative(null);
        set({ session: null, doctor: null, application: null, isNewRegistration: false });
    },
    clear: () => { syncTokenToNative(null); set({ session: null, doctor: null, application: null, isNewRegistration: false }); },
}));

