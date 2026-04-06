import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '@cliniqone/ui';
import { markSplashShown } from '../App';
import splashVideo from '../../assets/splash-bg.mp4';
import logoImg from '../../assets/logo.png';
import type { CSSProperties } from 'react';

const SPLASH_DURATION = 10000;

export function SplashPage() {
    const navigate = useNavigate();
    const [bgReady, setBgReady] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => dismiss(), SPLASH_DURATION);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const dismiss = () => {
        if (isDismissing) return;
        setIsDismissing(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        // Fade out then navigate
        const el = document.getElementById('splash-container');
        if (el) {
            el.style.transition = 'opacity 0.5s';
            el.style.opacity = '0';
        }
        setTimeout(() => { markSplashShown(); navigate('/', { replace: true }); }, 500);
    };

    return (
        <div id="splash-container" onClick={dismiss} style={s.container}>
            {/* Background video */}
            <div style={{ ...s.video, opacity: bgReady ? 1 : 0, transition: 'opacity 0.6s' }}>
                <video src={splashVideo} autoPlay loop muted playsInline onCanPlay={() => setBgReady(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Dark overlay */}
            <div style={s.overlay} />
            {/* Centered Logo */}
            <div className="fade-in" style={s.logoContainer}>
                <img src={logoImg} alt="cliniq.one" style={s.logo} />
            </div>
            {/* Crafted by */}
            <div className="fade-in" style={s.craftedContainer}>
                <div style={s.craftedLine} />
                <span style={s.craftedLabel}>Crafted by</span>
                <span style={s.craftedName}>momen pharaon</span>
            </div>
            {/* Skip hint */}
            <div className="fade-in" style={s.skipHint}>
                <span style={s.skipText}>Tap to skip</span>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100dvh', minHeight: '100vh', backgroundColor: '#0A0E1A', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 9999, overflow: 'hidden' },
    video: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
    overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 14, 26, 0.45)' },
    logoContainer: { zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    logo: { width: 200, height: 200, objectFit: 'contain' },
    craftedContainer: { position: 'absolute', bottom: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 },
    craftedLine: { width: 30, height: 1, backgroundColor: 'rgba(0, 212, 170, 0.25)', marginBottom: 10 },
    craftedLabel: { fontSize: 10, color: 'rgba(255, 255, 255, 0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 300, marginBottom: 2 },
    craftedName: { fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 },
    skipHint: { position: 'absolute', bottom: 60, zIndex: 2 },
    skipText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: 1 },
};
