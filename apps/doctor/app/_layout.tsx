import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { colors, ThemeProvider } from '@cliniqone/ui';
import { ErrorBoundary } from '../components/ErrorBoundary';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 5 * 60 * 1000,
        },
    },
});

export default function RootLayout() {
    const { isReady, initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, []);

    if (!isReady) {
        return (
            <ThemeProvider>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <StatusBar style="dark" />
                </View>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.bgPrimary },
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="consultation" />
                    </Stack>
                    <StatusBar style="dark" />
                </QueryClientProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
    },
});
