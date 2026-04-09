import { colors, typography, Info, Globe, Stethoscope } from '@cliniqone/ui';
import { BackButton } from '../../components/BackButton';
import logoImg from '../../assets/logo.png';
import type { CSSProperties } from 'react';

export function AboutPage() {
    const version = '1.0.0';
    const buildDate = '2026-04-06';

    return (
        <div style={s.container} className="slide-in-page">
            <div style={s.header}>
                <BackButton />
                <span style={s.title}>About</span>
            </div>

            <div style={s.content}>
                {/* Logo + Brand */}
                <div style={s.brand}>
                    <img src={logoImg} alt="cliniq.one" style={s.logo} />
                    <span style={s.brandName}>cliniq.one</span>
                    <span style={s.brandSub}>Doctor Portal</span>
                    <span style={s.version}>Version {version}</span>
                </div>

                {/* Info cards */}
                <div style={s.infoSection}>
                    <InfoRow icon={<Stethoscope size={18} color={colors.accentTeal} />} label="Platform" value="Healthcare Telemedicine" />
                    <InfoRow icon={<Globe size={18} color={colors.accentBlue} />} label="Region" value="Saudi Arabia" />
                    <InfoRow icon={<Info size={18} color={colors.textTertiary} />} label="Build" value={buildDate} />
                </div>

                {/* Legal */}
                <div style={s.legal}>
                    <span style={s.legalText}>
                        cliniq.one is a licensed telemedicine platform compliant with SCFHS and MOH regulations.
                    </span>
                    <span style={s.legalText}>
                        © {new Date().getFullYear()} cliniq.one. All rights reserved.
                    </span>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={s.infoRow}>
            <div style={s.infoIcon}>{icon}</div>
            <span style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{value}</span>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: typography.h3.fontSize, fontWeight: 700, color: colors.textPrimary },
    content: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' },
    brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 },
    logo: { width: 80, height: 80, objectFit: 'contain', marginBottom: 12 },
    brandName: { fontSize: 24, fontWeight: 800, color: colors.textPrimary, letterSpacing: -0.5 },
    brandSub: { fontSize: 14, color: colors.accentTeal, fontWeight: 600, marginTop: 2 },
    version: { fontSize: 12, color: colors.textTertiary, marginTop: 8, backgroundColor: colors.bgSecondary, padding: '4px 12px', borderRadius: 20 },
    infoSection: { width: '100%', maxWidth: 400, marginBottom: 32 },
    infoRow: {
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 0', borderBottom: `1px solid ${colors.border}`,
    },
    infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    legal: { textAlign: 'center', maxWidth: 320 },
    legalText: { fontSize: 12, color: colors.textTertiary, lineHeight: '18px', display: 'block', marginBottom: 8 },
};
