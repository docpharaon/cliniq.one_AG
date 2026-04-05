import { useEffect, useState } from 'react';
import { isRTL, getLocale } from '@cliniqone/i18n';
import logoImg from '../../assets/logo.png';
import type { CSSProperties } from 'react';

/**
 * NoInternetOverlay — Full-screen branded "No Internet" cover.
 *
 * Renders when the device is offline, covering the auth flow with the
 * cliniq.one logo, a wifi-off icon, a friendly message, and a "Try Again"
 * button. Auto-dismisses when connectivity is restored.
 */
export function NoInternetOverlay() {
    const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
    const [checking, setChecking] = useState(false);
    const [pulse, setPulse] = useState(false);
    const rtl = isRTL();
    const lang = getLocale();

    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);

        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    // Don't render if online
    if (!isOffline) return null;

    async function handleRetry() {
        setChecking(true);
        setPulse(true);

        // Give the browser a moment to detect connectivity
        await new Promise(r => setTimeout(r, 1500));

        if (navigator.onLine) {
            setIsOffline(false);
        } else {
            setPulse(false);
        }
        setChecking(false);
    }

    const isArabic = lang === 'ar';

    return (
        <div className="no-internet-overlay" style={{ ...s.container, direction: rtl ? 'rtl' : 'ltr' }}>
            {/* Ambient gradient background */}
            <div style={s.ambientGlow} />

            {/* Content */}
            <div className="fade-in" style={s.content}>
                {/* Logo */}
                <div className="no-internet-logo-ring" style={s.logoRing}>
                    <img src={logoImg} alt="cliniq.one" style={s.logo} />
                </div>

                {/* Wifi Off Icon */}
                <div className={`no-internet-icon ${pulse ? 'no-internet-icon-pulse' : ''}`} style={s.iconContainer}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>

                {/* Message */}
                <h2 style={s.title}>
                    {isArabic ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
                </h2>
                <p style={s.subtitle}>
                    {isArabic
                        ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى'
                        : 'Check your connection and try again'}
                </p>

                {/* Animated signal bars */}
                <div className="no-internet-bars" style={s.barsContainer}>
                    <span style={{ ...s.bar, height: 8, opacity: 0.3 }} />
                    <span style={{ ...s.bar, height: 14, opacity: 0.25 }} />
                    <span style={{ ...s.bar, height: 20, opacity: 0.2 }} />
                    <span style={{ ...s.bar, height: 26, opacity: 0.15 }} />
                </div>

                {/* Retry Button */}
                <button
                    id="no-internet-retry"
                    onClick={handleRetry}
                    disabled={checking}
                    style={{
                        ...s.retryButton,
                        opacity: checking ? 0.6 : 1,
                        cursor: checking ? 'not-allowed' : 'pointer',
                    }}
                >
                    {checking ? (
                        <span className="spinner" style={{ width: 20, height: 20, borderTopColor: '#fff' }} />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    )}
                    <span>{isArabic ? 'حاول مرة أخرى' : 'Try Again'}</span>
                </button>

                {/* Status dot */}
                <div style={s.statusRow}>
                    <span className="pulsing-dot" style={s.statusDot} />
                    <span style={s.statusText}>
                        {checking
                            ? (isArabic ? 'جاري التحقق…' : 'Checking…')
                            : (isArabic ? 'غير متصل' : 'Offline')}
                    </span>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: {
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B1120',
        overflow: 'hidden',
    },
    ambientGlow: {
        position: 'absolute',
        top: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140%',
        height: '60%',
        background: 'radial-gradient(ellipse at center, rgba(26, 138, 158, 0.08) 0%, rgba(26, 138, 158, 0.03) 40%, transparent 70%)',
        pointerEvents: 'none',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 32px',
        textAlign: 'center',
        zIndex: 2,
        maxWidth: 360,
    },
    logoRing: {
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: '2px solid rgba(26, 138, 158, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
        position: 'relative',
    },
    logo: {
        width: 72,
        height: 72,
        objectFit: 'contain',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        color: '#F1F5F9',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 15,
        color: '#94A3B8',
        marginBottom: 28,
        lineHeight: '22px',
    },
    barsContainer: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        marginBottom: 32,
    },
    bar: {
        width: 6,
        borderRadius: 3,
        backgroundColor: '#F59E0B',
    },
    retryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        maxWidth: 280,
        padding: '14px 24px',
        borderRadius: 14,
        border: 'none',
        background: 'linear-gradient(135deg, #0F766E 0%, #1A8A9E 100%)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 0.2,
        transition: 'opacity 0.2s, transform 0.1s',
        boxShadow: '0 4px 16px rgba(26, 138, 158, 0.3)',
    },
    statusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    statusText: {
        fontSize: 12,
        color: '#64748B',
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: 600,
    },
};
