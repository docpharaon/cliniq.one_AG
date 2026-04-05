import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { t, useLocale } from '@cliniqone/i18n';
import { haptic } from '../hooks/useHaptics';
import logoImg from '../../assets/logo.png';
import bannerAudioSrc from '../../assets/banner-ambient.mp3';
import type { CSSProperties } from 'react';

/** Default playback volume (0–1) */
const AUDIO_VOLUME = 0.25;
/** Fade-out duration when dismissing (ms) */
const AUDIO_FADE_MS = 600;

/** Tracks whether the user has ever completed the forced first-run banner */
const FIRST_SEEN_KEY = 'cliniq_beta_banner_first_seen';
/** Minimum seconds the user must wait before CTA is enabled on first run */
const FIRST_RUN_LOCK_MS = 5_000;
const AUTO_DISMISS_MS = 25_000;

// Confetti colors — premium palette
const CONFETTI_COLORS = [
    '#2DD4BF', '#1A8A9E', '#F59E0B', '#EC4899',
    '#8B5CF6', '#3B82F6', '#10B981', '#F97316',
];

interface ConfettiPiece {
    id: number;
    left: string;
    color: string;
    duration: string;
    delay: string;
    size: number;
    rotation: number;
}

interface StarPiece {
    id: number;
    left: string;
    top: string;
    duration: string;
    delay: string;
}

function generateConfetti(count: number): ConfettiPiece[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: `${2 + Math.random() * 3}s`,
        delay: `${Math.random() * 2}s`,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
    }));
}

function generateStars(count: number): StarPiece[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        duration: `${1.5 + Math.random() * 2}s`,
        delay: `${Math.random() * 3}s`,
    }));
}

/** Dedication entry with staggered animation */
function DedicationName({ name, title, delay }: { name: string; title: string; delay: number }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            textAlign: 'center',
            marginBottom: 12,
        }}>
            <p style={s.dedicationName}>{name}</p>
            <p style={s.dedicationTitle}>{title}</p>
        </div>
    );
}

export function BetaWelcomeBanner() {
    const lang = useLocale();
    const [visible, setVisible] = useState(true);          // Always show
    const [dismissing, setDismissing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // First-run detection: has the user ever seen & completed this banner?
    const isFirstRun = useRef(true);
    const [ctaUnlocked, setCtaUnlocked] = useState(false);

    // ── Audio state ──
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioMuted, setAudioMuted] = useState(false);
    const [audioReady, setAudioReady] = useState(false);

    // Generate once
    const confetti = useMemo(() => generateConfetti(30), []);
    const stars = useMemo(() => generateStars(12), []);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(FIRST_SEEN_KEY);
            if (seen) {
                // Returning user — can skip immediately
                isFirstRun.current = false;
                setCtaUnlocked(true);
            } else {
                // First run — lock CTA for FIRST_RUN_LOCK_MS
                isFirstRun.current = true;
                setCtaUnlocked(false);
                timerRef.current = setTimeout(() => setCtaUnlocked(true), FIRST_RUN_LOCK_MS);
            }
        } catch {
            // Storage unavailable — treat as skippable
            isFirstRun.current = false;
            setCtaUnlocked(true);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // ── Audio: autoplay at low volume, loop ──
    useEffect(() => {
        const audio = new Audio(bannerAudioSrc);
        audio.loop = true;
        audio.volume = AUDIO_VOLUME;
        audioRef.current = audio;

        // Attempt autoplay — browsers may block until user interaction
        const tryPlay = async () => {
            try {
                await audio.play();
                setAudioReady(true);
            } catch {
                // Autoplay blocked — will start on user tap of unmute toggle
                setAudioMuted(true);
                setAudioReady(true);
            }
        };
        tryPlay();

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, []);

    /** Toggle mute/unmute */
    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audioMuted) {
            audio.volume = AUDIO_VOLUME;
            audio.play().catch(() => {});
            setAudioMuted(false);
        } else {
            audio.volume = 0;
            setAudioMuted(true);
        }
        haptic.light();
    }, [audioMuted]);

    /** Fade audio out smoothly */
    const fadeOutAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || audio.paused) return;
        const steps = 20;
        const stepMs = AUDIO_FADE_MS / steps;
        const volumeStep = audio.volume / steps;
        let current = 0;
        const iv = setInterval(() => {
            current++;
            audio.volume = Math.max(0, audio.volume - volumeStep);
            if (current >= steps) {
                clearInterval(iv);
                audio.pause();
            }
        }, stepMs);
    }, []);

    const dismiss = () => {
        if (dismissing) return;
        // On first run, only allow dismiss after CTA is unlocked
        if (isFirstRun.current && !ctaUnlocked) return;
        setDismissing(true);
        haptic.medium();
        // Fade out audio
        fadeOutAudio();
        // Mark first run as complete so future visits are skippable
        try { localStorage.setItem(FIRST_SEEN_KEY, 'true'); } catch {}
        // Notify TabLayout to show the tab bar
        window.dispatchEvent(new Event('beta-banner-dismissed'));
        // Fade out
        setTimeout(() => setVisible(false), 400);
    };

    /** Overlay tap — only works for returning users (skippable) */
    const handleOverlayTap = () => {
        if (isFirstRun.current) return;   // Can't skip on first run
        dismiss();
    };

    if (!visible) return null;

    return createPortal(
        <div
            id="beta-welcome-banner"
            className="beta-banner-overlay"
            style={{
                ...s.overlay,
                opacity: dismissing ? 0 : undefined,
                transition: dismissing ? 'opacity 0.4s ease-out' : undefined,
            }}
        >
            {/* ── Audio mute/unmute toggle ── */}
            {audioReady && (
                <button
                    onClick={toggleMute}
                    aria-label={audioMuted ? 'Unmute' : 'Mute'}
                    style={{
                        ...s.audioToggle,
                        ...(audioMuted ? s.audioToggleMuted : {}),
                    }}
                >
                    {audioMuted ? (
                        /* Speaker off icon */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                    ) : (
                        /* Speaker on icon with waves */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity="0.4" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    )}
                </button>
            )}
            {/* Confetti particles */}
            {confetti.map(c => (
                <div
                    key={c.id}
                    className="beta-confetti-particle"
                    style={{
                        left: c.left,
                        backgroundColor: c.color,
                        width: c.size,
                        height: c.size,
                        animationDuration: c.duration,
                        animationDelay: c.delay,
                        transform: `rotate(${c.rotation}deg)`,
                    }}
                />
            ))}

            {/* Background stars */}
            {stars.map(star => (
                <span
                    key={star.id}
                    className="beta-star"
                    style={{
                        left: star.left,
                        top: star.top,
                        animationDuration: star.duration,
                        animationDelay: star.delay,
                    }}
                >
                    ✦
                </span>
            ))}

            {/* Main content (scrollable) */}
            <div style={s.scrollContainer} onClick={handleOverlayTap}>
                <div className="beta-banner-content" style={s.content} onClick={e => e.stopPropagation()}>

                    {/* ── Section 1: Logo + Welcome ────────────────────── */}
                    <div style={s.logoSection}>
                        <div className="beta-banner-logo-ring" style={s.logoRing}>
                            {/* Spinning gradient border */}
                            <svg className="beta-banner-logo-spinner" style={s.logoSpinner} viewBox="0 0 120 120">
                                <defs>
                                    <linearGradient id="betaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                                        <stop offset="33%" stopColor="#2DD4BF" stopOpacity="0.6" />
                                        <stop offset="66%" stopColor="#1A8A9E" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.4" />
                                    </linearGradient>
                                </defs>
                                <circle cx="60" cy="60" r="56" fill="none" stroke="url(#betaGrad)" strokeWidth="2.5" strokeDasharray="40 20" />
                            </svg>
                            <img src={logoImg} alt="cliniq.one" style={s.logoImg} />
                        </div>

                        <h1 style={s.welcomeTitle}>{t('betaBanner.welcomeTitle')}</h1>
                        <p style={s.welcomeSubtitle}>{t('betaBanner.welcomeSubtitle')}</p>
                    </div>

                    {/* ── Section 2: Free Consultation Promo ────────────── */}
                    <div className="beta-banner-shimmer" style={s.promoCard}>
                        <span className="beta-banner-badge" style={s.betaBadge}>
                            {t('betaBanner.betaBadge')}
                        </span>
                        <p style={s.promoTitle}>{t('betaBanner.freeTitle')}</p>
                        <p style={s.promoBody}>{t('betaBanner.freeBody')}</p>
                        <div style={s.promoDateRow}>
                            <span style={s.promoDate}>{t('betaBanner.freeUntil')}</span>
                        </div>
                    </div>

                    {/* ── Section 3: Dedication ─────────────────────────── */}
                    <div style={s.dedicationSection}>
                        <div style={s.dedicationDivider}>
                            <div style={s.dedicationLine} />
                            <span className="beta-banner-heart" style={{ fontSize: 18 }}>💝</span>
                            <div style={s.dedicationLine} />
                        </div>

                        <p style={s.dedicationIntro}>{t('betaBanner.dedicationIntro')}</p>

                        {/* In Memory — Father */}
                        <div style={s.inMemoryBlock}>
                            <p style={s.inMemoryLabel}>🕊️ {t('betaBanner.inMemory')}</p>
                            <p style={s.inMemoryName}>{t('betaBanner.fatherName')}</p>
                            <p style={s.inMemoryTitle}>{t('betaBanner.fatherTitle')}</p>
                        </div>

                        <div style={s.memoryDivider} />

                        <DedicationName
                            name={t('betaBanner.motherName')}
                            title={t('betaBanner.motherTitle')}
                            delay={800}
                        />
                        <DedicationName
                            name={t('betaBanner.wifeName')}
                            title={t('betaBanner.wifeTitle')}
                            delay={1200}
                        />
                        <DedicationName
                            name={t('betaBanner.kidsName')}
                            title={t('betaBanner.kidsTitle')}
                            delay={1600}
                        />
                    </div>

                    {/* ── Section 4: MomenCrafts ───────────────────────── */}
                    <div style={s.craftedSection}>
                        <div style={s.craftedLine} />
                        <p style={s.craftedBy}>{t('betaBanner.craftedBy')}</p>
                        <p style={s.craftedFirst}>{t('betaBanner.craftedFirst')}</p>
                        <p style={s.creatorName}>{t('betaBanner.creatorName')}</p>
                    </div>

                    {/* ── Section 5: CTA ───────────────────────────────── */}
                    <button
                        className="beta-banner-cta pressable"
                        style={{
                            ...s.ctaButton,
                            ...(isFirstRun.current && !ctaUnlocked ? {
                                opacity: 0.35,
                                pointerEvents: 'none' as const,
                            } : {}),
                        }}
                        onClick={dismiss}
                        disabled={isFirstRun.current && !ctaUnlocked}
                    >
                        {isFirstRun.current && !ctaUnlocked
                            ? t('betaBanner.enterButton')
                            : `${t('betaBanner.enterButton')} →`}
                    </button>

                    {/* Skip hint — only for returning users */}
                    {!isFirstRun.current && (
                        <p style={s.skipHint}>{t('betaBanner.skipHint')}</p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

const s: Record<string, CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(10, 14, 26, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },

    // ── Audio Toggle ──
    audioToggle: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10001,
        width: 40,
        height: 40,
        borderRadius: 20,
        border: '1px solid rgba(45, 212, 191, 0.3)',
        background: 'rgba(45, 212, 191, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#2DD4BF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    } as CSSProperties,
    audioToggleMuted: {
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: 'rgba(241, 245, 249, 0.4)',
    } as CSSProperties,
    scrollContainer: {
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 20px 60px',
    },
    content: {
        maxWidth: 420,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },

    // ── Logo Section ──
    logoSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 28,
    },
    logoRing: {
        position: 'relative',
        width: 120,
        height: 120,
        borderRadius: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoSpinner: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
    },
    logoImg: {
        width: 80,
        height: 80,
        objectFit: 'contain',
        position: 'relative',
        zIndex: 2,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: 800,
        color: '#F1F5F9',
        margin: 0,
        letterSpacing: '-0.02em',
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: 'rgba(241, 245, 249, 0.55)',
        margin: '6px 0 0',
        textAlign: 'center',
        fontWeight: 400,
    },

    // ── Promo Card ──
    promoCard: {
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        padding: '20px 20px 18px',
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        marginBottom: 28,
        textAlign: 'center',
    },
    betaBadge: {
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.5,
        color: '#2DD4BF',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        padding: '4px 12px',
        borderRadius: 20,
        marginBottom: 12,
    },
    promoTitle: {
        fontSize: 20,
        fontWeight: 800,
        color: '#F1F5F9',
        margin: '0 0 8px',
    },
    promoBody: {
        fontSize: 14,
        color: 'rgba(241, 245, 249, 0.7)',
        margin: '0 0 14px',
        lineHeight: '20px',
    },
    promoDateRow: {
        display: 'flex',
        justifyContent: 'center',
    },
    promoDate: {
        fontSize: 12,
        fontWeight: 700,
        color: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: '5px 14px',
        borderRadius: 20,
    },

    // ── Dedication ──
    dedicationSection: {
        width: '100%',
        marginBottom: 24,
    },
    dedicationDivider: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    dedicationLine: {
        width: 40,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent)',
    },
    dedicationIntro: {
        fontSize: 14,
        color: 'rgba(241, 245, 249, 0.5)',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
        fontWeight: 300,
    },
    dedicationName: {
        fontSize: 18,
        fontWeight: 700,
        color: '#F1F5F9',
        margin: 0,
        letterSpacing: '-0.01em',
    },
    dedicationTitle: {
        fontSize: 12,
        color: 'rgba(245, 158, 11, 0.8)',
        margin: '2px 0 0',
        fontStyle: 'italic',
        fontWeight: 400,
    },

    // ── In Memory ──
    inMemoryBlock: {
        textAlign: 'center',
        marginBottom: 16,
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(245, 158, 11, 0.04)',
        border: '1px solid rgba(245, 158, 11, 0.1)',
    },
    inMemoryLabel: {
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(241, 245, 249, 0.4)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        margin: '0 0 8px',
    },
    inMemoryName: {
        fontSize: 20,
        fontWeight: 800,
        color: '#F1F5F9',
        margin: 0,
        letterSpacing: '-0.01em',
    },
    inMemoryTitle: {
        fontSize: 13,
        color: 'rgba(245, 158, 11, 0.7)',
        margin: '4px 0 0',
        fontStyle: 'italic',
        fontWeight: 400,
        lineHeight: '18px',
    },
    memoryDivider: {
        width: 20,
        height: 1,
        background: 'rgba(245, 158, 11, 0.15)',
        margin: '4px auto 16px',
    },

    // ── MomenCrafts ──
    craftedSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 28,
    },
    craftedLine: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(45, 212, 191, 0.2)',
        marginBottom: 10,
    },
    craftedBy: {
        fontSize: 13,
        fontWeight: 700,
        color: 'rgba(241, 245, 249, 0.6)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        margin: 0,
    },
    craftedFirst: {
        fontSize: 11,
        color: 'rgba(241, 245, 249, 0.3)',
        margin: '4px 0 0',
        fontStyle: 'italic',
    },
    creatorName: {
        fontSize: 15,
        fontWeight: 700,
        color: 'rgba(245, 158, 11, 0.85)',
        margin: '10px 0 0',
        letterSpacing: 0.5,
    },

    // ── CTA ──
    ctaButton: {
        width: '100%',
        maxWidth: 320,
        padding: '16px 24px',
        borderRadius: 16,
        border: 'none',
        background: 'linear-gradient(135deg, #0F766E 0%, #1A8A9E 50%, #0D9488 100%)',
        color: '#fff',
        fontSize: 17,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        marginBottom: 12,
    },
    skipHint: {
        fontSize: 12,
        color: 'rgba(241, 245, 249, 0.3)',
        margin: 0,
        textAlign: 'center',
    },
};
