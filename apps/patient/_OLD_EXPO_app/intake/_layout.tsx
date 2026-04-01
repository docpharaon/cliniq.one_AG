import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@cliniqone/ui';

const isWeb = Platform.OS === 'web';

export default function IntakeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: isWeb ? 'fade' : 'slide_from_right',
                animationDuration: isWeb ? 250 : undefined,
                gestureEnabled: false, // Prevent back swipe during intake
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="doctor-select" />
            <Stack.Screen name="complaint" />
            <Stack.Screen name="ai-chat" />
            <Stack.Screen name="analyzing" options={{ animation: 'fade' }} />
            <Stack.Screen name="questions" />
            <Stack.Screen name="medications" />
            <Stack.Screen name="allergies" />
            <Stack.Screen name="review" />
            <Stack.Screen name="submit" options={{ animation: 'fade' }} />
            <Stack.Screen name="telepsychiatry-consent" />
            <Stack.Screen name="psych-screening" />
        </Stack>
    );
}
