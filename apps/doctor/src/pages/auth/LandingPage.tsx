import { useNavigate } from 'react-router-dom';
import { haptic } from '../../hooks/useHaptics';
import { colors, spacing, typography, radius, ClipboardList, Stethoscope, MessageSquare } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { FadeIn } from '../../components/FadeIn';
import logoImg from '../../assets/logo.png';
import type { CSSProperties, ReactNode } from 'react';

function PulsingDot({ color, delay = 0 }: { color: string; delay?: number }) {
    return (
        <div
            className="pulsing-dot"
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, animationDelay: `${delay}ms` }}
        />
    );
}

function FeatureItem({ Icon, title, subtitle, accentColor, delay }: {
    Icon: (p: CliniqIconProps) => ReactNode; title: string; subtitle: string; accentColor: string; delay: number;
}) {
    return (
        <FadeIn delay={delay}>
            <div style={s.featureItem} className="pressable">
                <div style={{ ...s.featureIcon, backgroundColor: accentColor + '22' }}>
                    <Icon size={22} color={accentColor} />
                </div>
                <div style={{ flex: 1 }}>
                    <span style={s.featureTitle}>{title}</span>
                    <span style={s.featureSubtitle}>{subtitle}</span>
                </div>
            </div>
        </FadeIn>
    );
}

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div style={s.container}>
            <div style={s.content}>
                {/* Hero */}
                <FadeIn>
                    <div style={s.hero}>
                        <img src={logoImg} alt="cliniq.one" style={s.logo} />
                        <span style={s.brandName}>cliniq.one</span>
                        <div style={s.roleRow}>
                            <div style={{ ...s.roleTag, backgroundColor: colors.accentTealFaded }}>
                                <PulsingDot color={colors.accentTeal} />
                                <span style={{ ...s.roleTagText, color: colors.accentTeal }}>Doctor</span>
                            </div>
                            <span style={{ color: colors.textTertiary, fontSize: 8 }}>•</span>
                            <div style={{ ...s.roleTag, backgroundColor: colors.purpleFaded }}>
                                <PulsingDot color={colors.purple} delay={400} />
                                <span style={{ ...s.roleTagText, color: colors.purple }}>Locum</span>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                <FadeIn delay={200}>
                    <p style={s.tagline}>Your digital practice,<br />anytime, anywhere.</p>
                </FadeIn>

                {/* Features */}
                <div style={s.features}>
                    <FeatureItem Icon={ClipboardList} title="Manage Consultations" subtitle="Accept, review, and respond to patient cases" accentColor={colors.accentTeal} delay={400} />
                    <FeatureItem Icon={Stethoscope} title="Locum Shifts" subtitle="Pick up shifts and earn on your schedule" accentColor={colors.purple} delay={550} />
                    <FeatureItem Icon={MessageSquare} title="AI-Assisted Intake" subtitle="Pre-screened patients with smart summaries" accentColor={colors.accentBlue} delay={700} />
                </div>

                {/* CTA */}
                <FadeIn delay={850}>
                    <div style={s.ctaSection}>
                        <button style={s.primaryBtn} className="pressable" onClick={() => { haptic.medium(); navigate('/auth/login'); }}>
                            <span style={s.primaryBtnText}>Sign In</span>
                        </button>
                        <div style={s.registerRow}>
                            <span style={{ fontSize: 14, color: colors.textSecondary }}>New doctor or locum?</span>
                            <button onClick={() => { haptic.light(); navigate('/auth/login'); }}>
                                <span style={{ fontSize: 12, color: colors.accentTeal, fontWeight: 600 }}>
                                    Sign in with Google or Apple to register
                                </span>
                            </button>
                        </div>
                    </div>
                </FadeIn>

                <FadeIn delay={1000}>
                    <p style={s.footer}>Admin approval required for new accounts</p>
                </FadeIn>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    content: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', paddingInline: spacing.xl },
    hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: spacing['2xl'] },
    logo: { width: 88, height: 88, marginBottom: spacing.md },
    brandName: { fontSize: 34, fontWeight: 800, color: colors.accentTeal, letterSpacing: -1.5, marginBottom: spacing.md },
    roleRow: { display: 'flex', alignItems: 'center', gap: spacing.sm },
    roleTag: { display: 'flex', alignItems: 'center', gap: 6, paddingInline: spacing.md, paddingBlock: 6, borderRadius: radius.full },
    roleTagText: { fontSize: typography.buttonSm.fontSize, fontWeight: 600 },
    tagline: { fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textSecondary, textAlign: 'center', lineHeight: '26px', marginBottom: spacing['3xl'] },
    features: { display: 'flex', flexDirection: 'column', gap: spacing.lg, marginBottom: spacing['3xl'] },
    featureItem: { display: 'flex', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.bgSecondary, borderRadius: radius.lg, padding: spacing.lg, border: `1px solid ${colors.border}` },
    featureIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    featureTitle: { display: 'block', fontSize: typography.h4.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 2 },
    featureSubtitle: { display: 'block', fontSize: typography.bodySm.fontSize, color: colors.textTertiary },
    ctaSection: { marginBottom: spacing.xl },
    primaryBtn: { width: '100%', borderRadius: radius.lg, backgroundColor: colors.accentTeal, paddingBlock: 16, marginBottom: spacing.lg },
    primaryBtnText: { fontSize: typography.button.fontSize, fontWeight: 700, color: colors.textInverse },
    registerRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
    footer: { fontSize: typography.caption.fontSize, color: colors.textTertiary, textAlign: 'center' },
};
