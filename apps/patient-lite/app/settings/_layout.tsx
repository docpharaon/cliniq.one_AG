import { Stack } from 'expo-router';
import { colors } from '@cliniqone/ui';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="security" />
        </Stack>
    );
}
