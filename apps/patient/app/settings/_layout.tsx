import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@cliniqone/ui';

const isWeb = Platform.OS === 'web';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: isWeb ? 'fade' : 'slide_from_right',
                animationDuration: isWeb ? 250 : undefined,
            }}
        >
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="verify-identity" />
            <Stack.Screen name="insurance" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="language" />
            <Stack.Screen name="appearance" />
            <Stack.Screen name="security" />
            <Stack.Screen name="help" />
            <Stack.Screen name="privacy-terms" />
            <Stack.Screen name="report-bug" />
            <Stack.Screen name="delete-account" />
        </Stack>
    );
}
