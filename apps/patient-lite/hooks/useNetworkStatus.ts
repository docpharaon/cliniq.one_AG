import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useToast } from '../components/ToastProvider';

// Web APIs are available when Platform.OS === 'web' but RN types don't include them
declare const window: any;
declare const navigator: any;

interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean;
}

/**
 * Monitors network connectivity.
 * Shows a toast when connection is lost or restored.
 */
export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState(true);
    const wasOfflineRef = useRef(false);
    const toast = useToast((s) => s.show);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleOnline = () => {
                setIsOnline(true);
                if (wasOfflineRef.current) {
                    toast('Connection restored', 'success', 2500);
                    wasOfflineRef.current = false;
                }
            };
            const handleOffline = () => {
                setIsOnline(false);
                wasOfflineRef.current = true;
                toast('No internet connection', 'error', 5000);
            };

            setIsOnline(navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        // React Native: uses NetInfo if available
        let unsubscribe: (() => void) | undefined;
        try {
            const NetInfo = require('@react-native-community/netinfo').default;
            unsubscribe = NetInfo.addEventListener((state: any) => {
                const online = state.isConnected && state.isInternetReachable !== false;
                if (!online && isOnline) {
                    wasOfflineRef.current = true;
                    toast('No internet connection', 'error', 5000);
                } else if (online && wasOfflineRef.current) {
                    toast('Connection restored', 'success', 2500);
                    wasOfflineRef.current = false;
                }
                setIsOnline(online);
            });
        } catch {
            // NetInfo not available, assume online
        }

        return () => unsubscribe?.();
    }, []);

    return { isOnline, wasOffline: wasOfflineRef.current };
}

interface SessionTimeoutOptions {
    /** Inactivity timeout in ms (default 15 min) */
    timeout?: number;
    /** Callback when session expires */
    onExpire: () => void;
}

/**
 * Auto-signs out the user after a period of inactivity.
 * Required for healthcare apps handling sensitive data.
 */
export function useSessionTimeout(opts: SessionTimeoutOptions) {
    const { timeout = 15 * 60 * 1000, onExpire } = opts;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const expireCb = useRef(onExpire);
    expireCb.current = onExpire;

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            expireCb.current();
        }, timeout);
    }, [timeout]);

    useEffect(() => {
        resetTimer();

        if (Platform.OS === 'web') {
            const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
            events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
            return () => {
                events.forEach((e) => window.removeEventListener(e, resetTimer));
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }

        // React Native: reset on app foreground
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') resetTimer();
        });

        return () => {
            sub.remove();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);
}
