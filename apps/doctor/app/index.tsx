import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
    const { session, doctor } = useAuthStore();

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    if (!doctor) {
        // Logged in but no doctor profile — show login with error
        return <Redirect href="/(auth)/login" />;
    }

    // Force password change if flagged
    if (doctor.must_change_password) {
        return <Redirect href={'/(auth)/change-password' as any} />;
    }

    return <Redirect href="/(tabs)" />;
}
