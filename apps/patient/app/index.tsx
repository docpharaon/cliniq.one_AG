import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '@cliniqone/api';

// Module-level flag — splash only shows once per app session
let splashShown = false;

/** Mark splash as shown (called from splash.tsx before navigating back) */
export function markSplashShown() {
    splashShown = true;
}

/**
 * Root index — redirects based on auth state.
 * First visit  → Splash screen
 * After splash → Normal auth routing:
 *   - Not logged in → Landing page
 *   - Logged in but wrong role → Sign out + Landing page
 *   - Logged in but no legal → Legal screen
 *   - Logged in + legal → Dashboard
 */
export default function Index() {
    const { session, user, clear } = useAuthStore();

    const isWrongRole = !!(user && user.role !== 'patient');

    // Sign out non-patient users (doctor/admin logging into patient app)
    useEffect(() => {
        if (!isWrongRole) return;

        console.warn('[RoleGuard] Wrong role detected:', user?.role, '— signing out');
        supabase.auth.signOut().then(() => clear());
    }, [isWrongRole]);

    // Show splash on first launch
    if (!splashShown) {
        return <Redirect href="/splash" />;
    }

    if (!session) {
        return <Redirect href="/(auth)/landing" />;
    }

    // Role guard: only patients can use this app
    if (isWrongRole) {
        return <Redirect href="/(auth)/landing" />;
    }

    if (user && !user.legal_accepted_at) {
        return <Redirect href="/(auth)/legal" />;
    }

    return <Redirect href="/(tabs)" />;
}
