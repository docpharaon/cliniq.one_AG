import { t } from '@cliniqone/i18n';
import { BackButton } from '../../components/BackButton';
import { Stethoscope, Bot, Lock, Pill, Scroll, Shield, Mail } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { useNavigate } from 'react-router-dom';

const APP_VERSION = '2.0.0';

export default function AboutPage() {
    const navigate = useNavigate();
    const year = new Date().getFullYear();

    const features: { Icon: React.FC<CliniqIconProps>; color: string; title: string; desc: string }[] = [
        { Icon: Stethoscope, color: '#3B82F6', title: t('about.licensedDoctors'), desc: t('about.licensedDoctorsDesc') },
        { Icon: Bot, color: '#2DD4BF', title: t('about.aiPowered'), desc: t('about.aiPoweredDesc') },
        { Icon: Lock, color: '#8B5CF6', title: t('about.dataPrivacy'), desc: t('about.dataPrivacyDesc') },
        { Icon: Pill, color: '#059669', title: t('about.ePrescription'), desc: t('about.ePrescriptionDesc') },
    ];

    const links: { label: string; Icon: React.FC<CliniqIconProps>; color: string; action: () => void }[] = [
        { label: t('about.termsOfService'), Icon: Scroll, color: '#D97706', action: () => navigate('/auth/legal') },
        { label: t('about.privacyPolicy'), Icon: Shield, color: '#8B5CF6', action: () => navigate('/auth/legal') },
        { label: t('about.contactSupport'), Icon: Mail, color: '#1A8A9E', action: () => window.open('mailto:support@cliniq.one') },
    ];

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />

                {/* Header */}
                <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 28 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 18, margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, #0F766E 0%, #1A8A9E 50%, #0D9488 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(26, 138, 158, 0.25)',
                    }}>
                        <span style={{ fontSize: 32, color: '#fff', fontWeight: 700 }}>c</span>
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        cliniq.one
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                        {t('about.version')} {APP_VERSION}
                    </p>
                    <p style={{
                        fontSize: 14, color: 'var(--text-secondary)', marginTop: 12,
                        lineHeight: '22px', maxWidth: 320, margin: '12px auto 0',
                    }}>
                        {t('about.tagline')}
                    </p>
                </div>

                {/* Description */}
                <div style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18,
                    border: '1px solid var(--border)', marginBottom: 20,
                }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '21px', margin: 0 }}>
                        {t('about.description')}
                    </p>
                </div>

                {/* Features */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {features.map((f, i) => (
                        <div key={i} style={{
                            backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 16,
                            border: '1px solid var(--border)', textAlign: 'center',
                        }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                <f.Icon size={22} color={f.color} />
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{f.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: '16px' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Links */}
                <div style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 14,
                    border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20,
                }}>
                    {links.map((link, i) => (
                        <button key={i} onClick={link.action} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 16px', backgroundColor: 'transparent', color: 'var(--text-primary)',
                            fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                            borderBottom: i < links.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${link.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <link.Icon size={16} color={link.color} />
                            </div>
                            {link.label}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 28 }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        {t('about.madeWith')}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
                        {t('about.copyright', { year: String(year) })}
                    </p>
                </div>
            </div>
        </div>
    );
}
