import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { markSplashShown } from '../App';
import { colors } from '@cliniqone/ui';
import splashBg from '../assets/splash-bg.mp4';
import logoImg from '../assets/logo.png';
import type { CSSProperties } from 'react';

const SPLASH_DURATION = 10000;

export function SplashPage() {
    const navigate = useNavigate();
    const [bgLoaded, setBgLoaded] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [logoVisible, setLogoVisible] = useState(false);
    const [badgeVisible, setBadgeVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Show logo after a tiny delay
        setTimeout(() => setLogoVisible(true), 100);
        setTimeout(() => setBadgeVisible(true), 900);

        timerRef.current = setTimeout(() => dismiss(), SPLASH_DURATION);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const dismiss = () => {
        if (isDismissing) return;
        setIsDismissing(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        markSplashShown();
        navigate('/', { replace: true });
    };

    return (
        <div onClick={dismiss} style={s.container}>
            {/* Background video */}
            <div style={{ ...s.videoWrap, opacity: bgLoaded ? 1 : 0 }}>
                <video
                    src={splashBg}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onCanPlay={() => setBgLoaded(true)}
                    style={s.video}
                />
            </div>

            {/* Overlay */}
            <div style={s.overlay} />

            {/* Logo */}
            <div style={{
                ...s.logoWrap,
                opacity: logoVisible ? 1 : 0,
                transform: logoVisible ? 'scale(1)' : 'scale(0.8)',
            }}>
                <img src={logoImg} alt="cliniq.one" style={s.logo} />
            </div>

            {/* Doctor Portal badge */}
            <div style={{ ...s.badge, opacity: badgeVisible ? 1 : 0 }}>
                <div style={s.badgeInner}>
                    <div style={{ ...s.dot, backgroundColor: '#1A8A9E' }} />
                    <span style={s.badgeText}>DOCTOR PORTAL</span>
                    <div style={{ ...s.dot, backgroundColor: '#1A8A9E' }} />
                </div>
            </div>

            {/* Crafted by */}
            <div style={{ ...s.crafted, opacity: logoVisible ? 1 : 0 }}>
                <div style={s.craftedLine} />
                <span style={s.craftedLabel}>Crafted by</span>
                <span style={s.craftedName}>momen pharaon</span>
            </div>

            {/* Skip hint */}
            <div style={{ ...s.skipHint, opacity: logoVisible ? 1 : 0 }}>
                <span style={s.skipText}>Tap to skip</span>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: {
        position: 'fixed', inset: 0,
        backgroundColor: '#0A0E1A',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        cursor: 'pointer', zIndex: 9999,
    },
    videoWrap: {
        position: 'absolute', inset: 0,
        transition: 'opacity 0.6s ease',
    },
    video: {
        width: '100%', height: '100%', objectFit: 'cover' as any,
    },
    overlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(10, 14, 26, 0.45)',
    },
    logoWrap: {
        zIndex: 2,
        transition: 'opacity 0.8s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    logo: { width: 200, height: 200 },
    badge: {
        zIndex: 2, marginTop: 20,
        transition: 'opacity 0.6s ease',
    },
    badgeInner: {
        display: 'flex', alignItems: 'center', gap: 10,
        paddingInline: 20, paddingBlock: 8,
        borderRadius: 20, border: '1px solid rgba(26, 138, 158, 0.3)',
        backgroundColor: 'rgba(26, 138, 158, 0.08)',
    },
    dot: { width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
    badgeText: {
        fontSize: 13, fontWeight: 600, letterSpacing: 4,
        color: 'rgba(26, 138, 158, 0.85)',
    },
    skipHint: {
        position: 'absolute', bottom: 60, zIndex: 2,
        transition: 'opacity 0.8s ease',
    },
    skipText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
    crafted: {
        position: 'absolute', bottom: 100, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transition: 'opacity 0.8s ease',
    },
    craftedLine: {
        width: 30, height: 1, backgroundColor: 'rgba(26, 138, 158, 0.25)',
        marginBottom: 10,
    },
    craftedLabel: {
        fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2,
        textTransform: 'uppercase' as any, fontWeight: 300, marginBottom: 2,
    },
    craftedName: {
        fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 3,
        textTransform: 'uppercase' as any, fontWeight: 500,
    },
};
