import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

// Module-level flag — splash only shows once per app session
let splashShown = false;

/** Mark splash as shown (called from splash.tsx before navigating back) */
export function markSplashShown() {
    splashShown = true;
}

export default function Index() {
    const { session, doctor, isNewRegistration } = useAuthStore();

    // Show splash on first launch (skip on OAuth redirect)
    const _w = globalThis as any;
    const isOAuthReturn = typeof _w.window !== 'undefined' && _w.window.location?.hash?.includes('access_token');
    if (!splashShown && !isOAuthReturn) {
        return <Redirect href={'/splash' as any} />;
    }

    // Not logged in → landing/splash screen
    if (!session) {
        return <Redirect href={'/(auth)/landing' as any} />;
    }

    // Logged in via OAuth but no doctor profile → pending approval
    if (isNewRegistration || !doctor) {
        return <Redirect href={'/(auth)/pending-approval' as any} />;
    }

    // Doctor exists but account is pending/suspended
    if (doctor.status === 'pending') {
        return <Redirect href={'/(auth)/pending-approval' as any} />;
    }

    if (doctor.status === 'suspended' || doctor.status === 'inactive') {
        return <Redirect href="/(auth)/login" />;
    }

    // Force password change if flagged
    if (doctor.must_change_password) {
        return <Redirect href={'/(auth)/change-password' as any} />;
    }

    return <Redirect href="/(tabs)" />;
}
