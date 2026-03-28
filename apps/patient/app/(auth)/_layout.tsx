import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@cliniqone/ui';

const isWeb = Platform.OS === 'web';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: isWeb ? 'fade' : 'slide_from_right',
                animationDuration: isWeb ? 250 : undefined,
            }}
        >
            <Stack.Screen name="landing" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="personal-details" options={{ gestureEnabled: false }} />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="legal" />
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        </Stack>
    );
}
