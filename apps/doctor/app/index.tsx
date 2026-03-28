import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
    const { session, doctor, isNewRegistration } = useAuthStore();

    // Not logged in → login screen
    if (!session) {
        return <Redirect href="/(auth)/login" />;
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
