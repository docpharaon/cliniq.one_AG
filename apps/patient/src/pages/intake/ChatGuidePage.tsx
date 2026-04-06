import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, isRTL } from '@cliniqone/i18n';
import { FadeIn } from '../../components/FadeIn';
import { BackButton } from '../../components/BackButton';
import {
    Bot, MessageSquare, Mic, Lock, Shield, CheckCircle,
    ChevronRight, ChevronUp, Keyboard, Flag, Sparkles,
} from '@cliniqone/ui';
import guideAudio from '../../../assets/guide-audio.mp3';

// ── Brand colors ─────────────────────────────────────
const TEAL = '#1A8A9E';
const CYAN = '#0ECFCF';
const AMBER = '#F59E0B';

// ── Slide data ───────────────────────────────────────
interface SlideItem {
    icon: React.ReactNode;
    textKey: string;
}

interface Slide {
    titleKey: string;
    descKey: string;
    heroIcons: React.ReactNode;
    heroBg: string;
    heroBorder: string;
    items: SlideItem[];
}

function getSlides(rtl: boolean): Slide[] {
    return [
        {
            titleKey: 'chatGuide.slide1Title',
            descKey: 'chatGuide.slide1Desc',
            heroIcons: (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(26,138,158,0.15), rgba(14,207,207,0.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(26,138,158,0.2)',
                    }}>
                        <Bot size={28} color={TEAL} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{
                            width: 100, height: 10, borderRadius: 5,
                            background: 'rgba(26,138,158,0.12)',
                        }} />
                        <div style={{
                            width: 70, height: 10, borderRadius: 5,
                            background: 'rgba(14,207,207,0.1)',
                        }} />
                    </div>
                </div>
            ),
            heroBg: 'linear-gradient(135deg, rgba(26,138,158,0.06) 0%, rgba(14,207,207,0.04) 100%)',
            heroBorder: 'rgba(26,138,158,0.12)',
            items: [
                { icon: <MessageSquare size={18} color={TEAL} />, textKey: 'chatGuide.slide1Tip1' },
                { icon: <CheckCircle size={18} color="#10B981" />, textKey: 'chatGuide.slide1Tip2' },
                { icon: <ChevronRight size={18} color={CYAN} />, textKey: 'chatGuide.slide1Tip3' },
            ],
        },
        {
            titleKey: 'chatGuide.slide2Title',
            descKey: 'chatGuide.slide2Desc',
            heroIcons: (
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'linear-gradient(145deg, rgba(26,138,158,0.12), rgba(14,207,207,0.06))',
                        border: '2px solid rgba(26,138,158,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 16px rgba(26,138,158,0.08)',
                    }}>
                        <Mic size={28} color={TEAL} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <ChevronUp size={16} color={CYAN} style={{ animation: 'slideUpHint 1.2s ease infinite' }} />
                        <div style={{
                            padding: '3px 10px', borderRadius: 10,
                            background: 'rgba(14,207,207,0.1)',
                            border: '1px solid rgba(14,207,207,0.2)',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <Lock size={10} color={CYAN} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                {rtl ? 'تثبيت' : 'LOCK'}
                            </span>
                        </div>
                    </div>
                </div>
            ),
            heroBg: 'linear-gradient(135deg, rgba(14,207,207,0.06) 0%, rgba(26,138,158,0.08) 100%)',
            heroBorder: 'rgba(14,207,207,0.15)',
            items: [
                { icon: <Mic size={18} color={TEAL} />, textKey: 'chatGuide.slide2Tip1' },
                { icon: <Lock size={18} color={CYAN} />, textKey: 'chatGuide.slide2Tip2' },
                { icon: <MessageSquare size={18} color="#10B981" />, textKey: 'chatGuide.slide2Tip3' },
                { icon: <Keyboard size={18} color="var(--text-tertiary)" />, textKey: 'chatGuide.slide2Tip4' },
            ],
        },
        {
            titleKey: 'chatGuide.slide3Title',
            descKey: 'chatGuide.slide3Desc',
            heroIcons: (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(26,138,158,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        <Shield size={28} color="#10B981" />
                    </div>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(245,158,11,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(249,115,22,0.2)',
                    }}>
                        <Sparkles size={28} color={AMBER} />
                    </div>
                </div>
            ),
            heroBg: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(249,115,22,0.04) 100%)',
            heroBorder: 'rgba(16,185,129,0.12)',
            items: [
                { icon: <CheckCircle size={18} color="#10B981" />, textKey: 'chatGuide.slide3Tip1' },
                { icon: <MessageSquare size={18} color={TEAL} />, textKey: 'chatGuide.slide3Tip2' },
                { icon: <Flag size={18} color="#D97706" />, textKey: 'chatGuide.slide3Tip3' },
                { icon: <Shield size={18} color="#10B981" />, textKey: 'chatGuide.slide3Tip4' },
            ],
        },
    ];
}

// ── Component ────────────────────────────────────────
export default function ChatGuidePage() {
    const navigate = useNavigate();
    const rtl = isRTL();
    const slides = getSlides(rtl);
    const [current, setCurrent] = useState(0);
    const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
    const touchStartX = useRef(0);
    const touchDelta = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ── Background audio — soft ambient on mount ──
    useEffect(() => {
        const audio = new Audio(guideAudio);
        audio.loop = true;
        audio.volume = 0.15;
        audioRef.current = audio;
        audio.play().catch(() => { /* autoplay blocked — silent fail */ });
        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, []);

    const isLast = current === slides.length - 1;

    const goTo = useCallback((idx: number) => {
        if (idx < 0 || idx >= slides.length) return;
        setSlideDir(idx > current ? 'next' : 'prev');
        setCurrent(idx);
    }, [current, slides.length]);

    const handleNext = useCallback(() => {
        if (isLast) {
            navigate('/intake/ai-chat');
        } else {
            goTo(current + 1);
        }
    }, [isLast, current, navigate, goTo]);

    const handleSkip = useCallback(() => {
        navigate('/intake/ai-chat');
    }, [navigate]);

    // ── Swipe handlers ──
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchDelta.current = 0;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        touchDelta.current = e.touches[0].clientX - touchStartX.current;
    }, []);

    const onTouchEnd = useCallback(() => {
        const threshold = 60;
        const delta = touchDelta.current;
        // Invert for RTL
        const effectiveDelta = rtl ? -delta : delta;
        if (effectiveDelta < -threshold) {
            // Swipe left (or right in RTL) → next
            if (current < slides.length - 1) goTo(current + 1);
        } else if (effectiveDelta > threshold) {
            // Swipe right (or left in RTL) → prev
            if (current > 0) goTo(current - 1);
        }
        touchDelta.current = 0;
    }, [current, slides.length, goTo, rtl]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goTo(current + (rtl ? -1 : 1));
            if (e.key === 'ArrowLeft') goTo(current + (rtl ? 1 : -1));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [current, goTo, rtl]);

    const slide = slides[current];

    return (
        <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
                minHeight: '100vh',
                backgroundColor: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                direction: rtl ? 'rtl' : 'ltr',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <BackButton />
                <button
                    onClick={handleSkip}
                    id="chat-guide-skip"
                    style={{
                        background: 'none', border: 'none',
                        color: 'var(--text-tertiary)',
                        fontSize: 14, fontWeight: 500,
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: 8,
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                    {t('common.skip')}
                </button>
            </div>

            {/* Slide Content */}
            <div style={{
                flex: 1,
                maxWidth: 480,
                margin: '0 auto',
                padding: '0 24px 32px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Step indicator */}
                <FadeIn key={`step-${current}`} duration={300}>
                    <p style={{
                        fontSize: 12, fontWeight: 700, color: TEAL,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        margin: '0 0 20px', textAlign: 'center',
                    }}>
                        {current + 1} / {slides.length}
                    </p>
                </FadeIn>

                {/* Hero illustration area */}
                <FadeIn key={`hero-${current}`} delay={80} duration={400}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '28px 20px',
                        borderRadius: 20,
                        background: slide.heroBg,
                        border: `1px solid ${slide.heroBorder}`,
                        marginBottom: 24,
                        minHeight: 100,
                    }}>
                        {slide.heroIcons}
                    </div>
                </FadeIn>

                {/* Title */}
                <FadeIn key={`title-${current}`} delay={160} duration={400}>
                    <h1 style={{
                        fontSize: 24, fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: '0 0 8px',
                        textAlign: 'center',
                        lineHeight: 1.3,
                    }}>
                        {t(slide.titleKey)}
                    </h1>
                </FadeIn>

                {/* Description */}
                <FadeIn key={`desc-${current}`} delay={220} duration={400}>
                    <p style={{
                        fontSize: 14, color: 'var(--text-secondary)',
                        margin: '0 0 24px',
                        textAlign: 'center',
                        lineHeight: '22px',
                    }}>
                        {t(slide.descKey)}
                    </p>
                </FadeIn>

                {/* Tip cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {slide.items.map((item, i) => (
                        <FadeIn key={`tip-${current}-${i}`} delay={300 + i * 80} duration={350}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 14,
                                padding: '14px 16px',
                                borderRadius: 14,
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'rgba(26,138,158,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {item.icon}
                                </div>
                                <p style={{
                                    fontSize: 13, fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    margin: 0, lineHeight: '20px',
                                    flex: 1,
                                }}>
                                    {t(item.textKey)}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>

                {/* Beta testing banner — only on last slide */}
                {isLast && (
                    <FadeIn delay={650} duration={400}>
                        <div style={{
                            marginTop: 14,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(245,158,11,0.03) 100%)',
                            border: '1px dashed rgba(245,158,11,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <Sparkles size={14} color={AMBER} style={{ flexShrink: 0 }} />
                            <p style={{
                                fontSize: 11, color: 'var(--text-secondary)',
                                margin: 0, lineHeight: '16px',
                            }}>
                                <span style={{ fontWeight: 700, color: AMBER }}>{t('chatGuide.betaTitle')}</span>{' '}
                                {t('chatGuide.betaDesc')}
                            </p>
                        </div>
                    </FadeIn>
                )}

                {/* Spacer */}
                <div style={{ flex: 1, minHeight: 20 }} />

                {/* Dot indicators */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 20,
                }}>
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            aria-label={`Slide ${i + 1}`}
                            style={{
                                width: i === current ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                background: i === current
                                    ? `linear-gradient(90deg, ${TEAL}, ${CYAN})`
                                    : 'var(--border)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        />
                    ))}
                </div>

                {/* CTA button */}
                <FadeIn key={`cta-${current}`} delay={isLast ? 700 : 500} duration={350}>
                    <button
                        id="chat-guide-next"
                        onClick={handleNext}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: 14,
                            border: 'none',
                            background: isLast
                                ? `linear-gradient(135deg, ${TEAL}, ${CYAN})`
                                : TEAL,
                            color: '#fff',
                            fontSize: 17,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: isLast
                                ? '0 4px 24px rgba(26,138,158,0.25), 0 0 0 1px rgba(14,207,207,0.15)'
                                : '0 2px 12px rgba(26,138,158,0.15)',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {isLast ? t('chatGuide.startChat') : t('chatGuide.next')}
                        {!isLast && <ChevronRight size={18} color="#fff" style={rtl ? { transform: 'scaleX(-1)' } : {}} />}
                    </button>
                </FadeIn>
            </div>

            {/* CSS keyframes */}
            <style>{`
                @keyframes slideUpHint {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
