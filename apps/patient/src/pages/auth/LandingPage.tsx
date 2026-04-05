import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, colors, spacing, typography, radius } from '@cliniqone/ui';
import { t, setLocale, useLocale } from '@cliniqone/i18n';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { NoInternetOverlay } from '../../components/NoInternetOverlay';
import splashVideo from '../../../assets/splash-video.mp4';
import titleLogo from '../../../assets/title-logo.png';
import logo from '../../../assets/logo.png';
import type { CSSProperties } from 'react';

export function LandingPage() {
    const navigate = useNavigate();
    const lang = useLocale();
    const [videoReady, setVideoReady] = useState(false);

    async function switchLanguage(target: 'en' | 'ar') {
        if (target === lang) return;
        await setLocale(target);
    }

    return (
        <div style={s.container}>
            <NoInternetOverlay />
            {/* Header */}
            <div style={s.header}>
                <img src={titleLogo} alt="cliniq.one" style={s.headerLogo} />
                <button style={s.flagButton} onClick={() => switchLanguage(lang === 'en' ? 'ar' : 'en')}>
                    <span style={{ fontSize: 20 }}>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
                </button>
            </div>

            <div className="scrollable" style={s.scroll}>
                {/* Tagline */}
                <div style={s.hero}>
                    <span style={s.tagline}>{t('landing.tagline')}</span>
                </div>

                {/* Video Section */}
                <div style={{ marginBottom: spacing['3xl'] }}>
                    <div style={s.videoContainer}>
                        {!videoReady && (
                            <div style={s.videoPlaceholder}>
                                <img src={logo} alt="" style={s.placeholderLogo} />
                                <div className="pulsing-dot" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentTeal }} />
                            </div>
                        )}
                        <video
                            src={splashVideo}
                            autoPlay loop muted playsInline
                            onCanPlay={() => setVideoReady(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16, opacity: videoReady ? 1 : 0, transition: 'opacity 0.5s', position: 'absolute', top: 0, left: 0 }}
                        />
                    </div>
                </div>

                {/* Disclaimer */}
                <DisclaimerBanner message={t('disclaimer.compact')} />

                {/* CTA */}
                <div style={{ marginTop: spacing.lg }}>
                    <Button title={t('landing.getStarted')} onPress={() => navigate('/auth')} size="lg" />
                    <div style={s.loginRow}>
                        <span style={s.loginText}>{t('landing.alreadyHaveAccount')} </span>
                        <span style={s.loginLink} onClick={() => navigate('/auth')}>{t('landing.login')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md, position: 'relative' },
    headerLogo: { width: 200, height: 55, objectFit: 'contain' },
    flagButton: { position: 'absolute', top: spacing.lg, right: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
    scroll: { flex: 1, paddingInline: spacing.xl, paddingBottom: 60, overflowY: 'auto' },
    hero: { display: 'flex', alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing['3xl'] },
    tagline: { ...typography.bodyLg, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg, lineHeight: '26px' },
    videoContainer: { width: '100%', height: 450, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.bgCard, position: 'relative' },
    videoPlaceholder: { position: 'absolute', inset: 0, backgroundColor: colors.bgCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2, borderRadius: radius.xl },
    placeholderLogo: { width: 80, height: 80, opacity: 0.4, marginBottom: spacing.md, objectFit: 'contain' },
    loginRow: { display: 'flex', justifyContent: 'center', marginTop: spacing.lg },
    loginText: { ...typography.body, color: colors.textSecondary },
    loginLink: { ...typography.body, color: colors.accentTeal, fontWeight: 600, cursor: 'pointer' },
};
