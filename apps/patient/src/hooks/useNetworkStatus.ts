import { useEffect, useRef, useState, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean;
}

/**
 * Monitors network connectivity using browser APIs.
 * Shows toast-like feedback when connection is lost or restored.
 */
export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (wasOfflineRef.current) {
                wasOfflineRef.current = false;
            }
        };
        const handleOffline = () => {
            setIsOnline(false);
            wasOfflineRef.current = true;
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

        return () => {
            events.forEach((e) => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);
}
