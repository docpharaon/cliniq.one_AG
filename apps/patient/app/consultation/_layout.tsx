import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@cliniqone/ui';

const isWeb = Platform.OS === 'web';

export default function ConsultationLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: isWeb ? 'fade' : 'slide_from_right',
                animationDuration: isWeb ? 250 : undefined,
            }}
        >
            <Stack.Screen name="[id]" />
            <Stack.Screen name="waiting-room" />
            <Stack.Screen name="feedback" />
            <Stack.Screen name="intervention-booking" />
        </Stack>
    );
}
