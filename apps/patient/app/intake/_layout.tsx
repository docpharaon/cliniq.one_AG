import { Stack } from 'expo-router';
import { colors } from '@cliniqone/ui';

export default function IntakeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgPrimary },
                animation: 'slide_from_right',
                gestureEnabled: false, // Prevent back swipe during intake
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="doctor-select" />
            <Stack.Screen name="complaint" />
            <Stack.Screen name="ai-chat" />
            <Stack.Screen name="analyzing" />
            <Stack.Screen name="questions" />
            <Stack.Screen name="medications" />
            <Stack.Screen name="allergies" />
            <Stack.Screen name="review" />
            <Stack.Screen name="submit" />
            <Stack.Screen name="telepsychiatry-consent" />
            <Stack.Screen name="psych-screening" />
        </Stack>
    );
}
