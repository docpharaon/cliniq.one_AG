import { useEffect, useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { colors } from '@cliniqone/ui';
import { supabase } from '@cliniqone/api';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider, useToast } from '../components/ToastProvider';
import { registerForPushNotifications, useNotificationListeners } from '../services/notifications';
import { initLocale } from '@cliniqone/i18n';
import { useNetworkStatus, useSessionTimeout } from '../hooks/useNetworkStatus';

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

function AppInner() {
    const { user } = useAuthStore();
    const toast = useToast((s) => s.show);

    // Monitor network connectivity
    useNetworkStatus();

    // Auto-lock session after 15 min inactivity (healthcare requirement)
    useSessionTimeout({
        timeout: 15 * 60 * 1000,
        onExpire: async () => {
            if (!user) return; // Not logged in, no need to expire
            toast('Session expired for your security', 'warning', 5000);
            try {
                await supabase.auth.signOut();
                useAuthStore.getState().clear();
            } catch { /* ignore */ }
            router.replace('/(auth)/landing');
        },
    });

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

    return (
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
    );
}

export default function RootLayout() {
    const { isReady, initialize } = useAuthStore();
    const [localeReady, setLocaleReady] = useState(false);

    useEffect(() => {
        initLocale().then(() => setLocaleReady(true));
        initialize();
    }, []);

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
                    <ToastProvider>
                        <AppInner />
                        <StatusBar style="light" />
                    </ToastProvider>
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
