import { Stack } from 'expo-router';
import { colors } from '@cliniqone/ui';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="landing" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="personal-details" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="legal" />
            <Stack.Screen name="welcome" />
        </Stack>
    );
}
