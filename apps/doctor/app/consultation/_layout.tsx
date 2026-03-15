import { Stack } from 'expo-router';
import { colors } from '@cliniqone/ui';

export default function ConsultationLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: 'slide_from_right',
            }}
        />
    );
}
