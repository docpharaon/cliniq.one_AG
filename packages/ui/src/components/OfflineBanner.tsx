import React, { useEffect, useState, useRef } from 'react';

/**
 * OfflineBanner — a persistent, native-feeling network status bar.
 *
 * Automatically shows when the device goes offline and briefly shows
 * "Back Online" when connectivity is restored, then auto-hides.
 *
 * Usage: render once at the app root level.
 *   <OfflineBanner />
 */

type BannerState = 'hidden' | 'offline' | 'online';

interface OfflineBannerProps {
    /** Override "No Internet Connection" text */
    offlineText?: string;
    /** Override "Back Online" text */
    onlineText?: string;
}

export function OfflineBanner({
    offlineText = 'No Internet Connection',
    onlineText = 'Back Online',
}: OfflineBannerProps) {
    const [state, setState] = useState<BannerState>(() =>
        typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'hidden',
    );
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasOffline = useRef(false);

    useEffect(() => {
        function handleOffline() {
            wasOffline.current = true;
            if (hideTimer.current) clearTimeout(hideTimer.current);
            setState('offline');
        }

        function handleOnline() {
            if (wasOffline.current) {
                setState('online');
                hideTimer.current = setTimeout(() => {
                    setState('hidden');
                    wasOffline.current = false;
                }, 3000);
            }
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Initial check
        if (!navigator.onLine) {
            wasOffline.current = true;
            setState('offline');
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    if (state === 'hidden') return null;

    const isOffline = state === 'offline';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            transition: 'background-color 0.3s ease',
            backgroundColor: isOffline ? '#1E293B' : '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
            {/* Icon */}
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isOffline ? '#F59E0B' : '#FFFFFF'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
            >
                {isOffline ? (
                    <>
                        {/* Wifi Off icon */}
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </>
                ) : (
                    <>
                        {/* Check circle icon */}
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </>
                )}
            </svg>

            {/* Text */}
            <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                letterSpacing: 0.2,
            }}>
                {isOffline ? offlineText : onlineText}
            </span>

            {/* Subtle pulse animation for offline state */}
            {isOffline && (
                <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    animation: 'offlinePulse 2s ease-in-out infinite',
                    flexShrink: 0,
                }} />
            )}

            {/* Keyframes injection (only once) */}
            <style>{`
                @keyframes offlinePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.7); }
                }
            `}</style>
        </div>
    );
}
