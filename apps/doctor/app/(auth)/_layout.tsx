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
        />
    );
}
