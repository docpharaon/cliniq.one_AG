import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, useLocale } from '@cliniqone/i18n';
import { Stethoscope, Bot, ClipboardList, Shield } from '@cliniqone/ui';
import { haptic } from '../hooks/useHaptics';

const SLIDES = [
    {
        emoji: '🤖',
        IconComp: Bot,
        color: '#2DD4BF',
        titleKey: 'onboardingSlides.slide1Title',
        titleFallback: 'AI-Powered Intake',
        descKey: 'onboardingSlides.slide1Desc',
        descFallback: 'Answer a few questions and our AI builds a comprehensive medical history for your doctor — in about 10 minutes.',
    },
    {
        emoji: '🩺',
        IconComp: Stethoscope,
        color: '#3B82F6',
        titleKey: 'onboardingSlides.slide2Title',
        titleFallback: 'Licensed Doctor Review',
        descKey: 'onboardingSlides.slide2Desc',
        descFallback: 'Board-certified specialists in KSA & UAE review your case and respond within 2-4 hours with a full report.',
    },
    {
        emoji: '📋',
        IconComp: ClipboardList,
        color: '#8B5CF6',
        titleKey: 'onboardingSlides.slide3Title',
        titleFallback: 'Reports & E-Prescriptions',
        descKey: 'onboardingSlides.slide3Desc',
        descFallback: 'Get your diagnosis, treatment plan, and MOH-compliant e-prescriptions — all in the app.',
    },
    {
        emoji: '🔒',
        IconComp: Shield,
        color: '#059669',
        titleKey: 'onboardingSlides.slide4Title',
        titleFallback: 'Your Data, Your Control',
        descKey: 'onboardingSlides.slide4Desc',
        descFallback: 'All data is encrypted, stored securely, and shared only with your assigned doctor. We never sell your information.',
    },
];

export function OnboardingPage() {
    const navigate = useNavigate();
    const lang = useLocale();
    const isRtl = lang === 'ar';
    const [current, setCurrent] = useState(0);
    const slide = SLIDES[current];
    const isLast = current === SLIDES.length - 1;

    function next() {
        haptic.medium();
        if (isLast) {
            navigate('/tabs', { replace: true });
        } else {
            setCurrent(c => c + 1);
        }
    }

    function skip() {
        haptic.light();
        navigate('/tabs', { replace: true });
    }

    const Icon = slide.IconComp;

    return (
        <div style={s.container}>
            {/* Skip */}
            {!isLast && (
                <button onClick={skip}
                    style={{ ...s.skipBtn, ...(isRtl ? { left: 20 } : { right: 20 }) }}>
                    {t('onboardingSlides.getStarted') || 'Skip'}
                </button>
            )}

            {/* Content */}
            <div style={s.slideWrap} key={current} className="page-fade">
                <div style={{ ...s.iconCircle, backgroundColor: slide.color + '18', borderColor: slide.color + '30' }}>
                    <Icon size={48} color={slide.color} />
                </div>

                <h1 style={s.title}>{t(slide.titleKey) || slide.titleFallback}</h1>
                <p style={s.desc}>{t(slide.descKey) || slide.descFallback}</p>
            </div>

            {/* Dots + Button */}
            <div style={s.footer}>
                <div style={s.dots}>
                    {SLIDES.map((_, i) => (
                        <div key={i} style={{
                            width: i === current ? 24 : 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: i === current ? '#1A8A9E' : 'var(--border)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>

                <button onClick={next} className="pressable" style={s.nextBtn}>
                    {isLast
                        ? (t('onboardingSlides.getStarted') || 'Get Started')
                        : (t('common.next') || 'Next')
                    }
                </button>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },
    skipBtn: {
        position: 'absolute',
        top: 16,
        background: 'none',
        border: 'none',
        color: 'var(--text-tertiary)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        padding: '8px 12px',
        zIndex: 2,
    },
    slideWrap: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
        textAlign: 'center',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        border: '2px solid',
    },
    title: {
        fontSize: 26,
        fontWeight: 800,
        color: 'var(--text-primary)',
        margin: '0 0 12px',
        letterSpacing: '-0.01em',
    },
    desc: {
        fontSize: 15,
        color: 'var(--text-secondary)',
        lineHeight: '24px',
        margin: 0,
        maxWidth: 340,
    },
    footer: {
        padding: '24px 32px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
    },
    dots: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    nextBtn: {
        width: '100%',
        maxWidth: 320,
        padding: '16px 24px',
        borderRadius: 14,
        border: 'none',
        background: 'linear-gradient(135deg, #1A8A9E, #0F766E)',
        color: '#fff',
        fontSize: 17,
        fontWeight: 700,
        cursor: 'pointer',
    },
};
