import { useEffect, useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { colors } from '@cliniqone/ui';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { registerForPushNotifications, useNotificationListeners } from '../services/notifications';
import { initLocale } from '@cliniqone/i18n';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

// Phone frame dimensions (iPhone 14 Pro)
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;
const isWeb = Platform.OS === 'web';

function PhoneFrame({ children }: { children: React.ReactNode }) {
    if (!isWeb) return <>{children}</>;

    return (
        <View style={webStyles.backdrop}>
            <View style={webStyles.phoneOuter}>
                {/* Notch */}
                <View style={webStyles.notch} />
                {/* App content */}
                <View style={webStyles.phoneInner}>
                    {children}
                </View>
                {/* Home indicator */}
                <View style={webStyles.homeIndicatorContainer}>
                    <View style={webStyles.homeIndicator} />
                </View>
            </View>
        </View>
    );
}

export default function RootLayout() {
    const { isReady, initialize, user } = useAuthStore();
    const [localeReady, setLocaleReady] = useState(false);

    useEffect(() => {
        initLocale().then(() => setLocaleReady(true));
        initialize();
    }, []);

    // Register push token when user is authenticated
    useEffect(() => {
        if (user?.id) {
            registerForPushNotifications(user.id).catch(console.warn);
        }
    }, [user?.id]);

    // Handle notification taps → navigate to consultation
    const handleNotificationTap = useCallback((data: any) => {
        if (data?.consultationId) {
            router.push(`/consultation/${data.consultationId}`);
        }
    }, []);
    useNotificationListeners(handleNotificationTap);

    if (!isReady || !localeReady) {
        return (
            <PhoneFrame>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <StatusBar style="light" />
                </View>
            </PhoneFrame>
        );
    }

    return (
        <PhoneFrame>
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.bgPrimary },
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen
                            name="splash"
                            options={{ animation: 'fade' }}
                        />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                    </Stack>
                    <StatusBar style="light" />
                </QueryClientProvider>
            </ErrorBoundary>
        </PhoneFrame>
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

// Web-only styles for phone frame
const webStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh' as any,
    },
    phoneOuter: {
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        backgroundColor: '#000',
        borderRadius: 44,
        borderWidth: 4,
        borderColor: '#2a2a3e',
        overflow: 'hidden',
        position: 'relative',
        // Shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 30,
    },
    notch: {
        position: 'absolute',
        top: 0,
        left: '50%' as any,
        marginLeft: -62,
        width: 124,
        height: 34,
        backgroundColor: '#000',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 10,
    },
    phoneInner: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 40,
    },
    homeIndicatorContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    homeIndicator: {
        width: 134,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
    },
});
