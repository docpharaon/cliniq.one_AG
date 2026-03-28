import { Stack } from 'expo-router';
import { colors } from '@cliniqone/ui';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: 'fade',
            }}
        >
            <Stack.Screen name="landing" />
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="pending-approval" options={{ gestureEnabled: false }} />
        </Stack>
    );
}
