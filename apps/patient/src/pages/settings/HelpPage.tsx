import { BackButton } from '../../components/BackButton';
import { t } from '@cliniqone/i18n';
import { Info, Mail } from '@cliniqone/ui';

export default function HelpPage() {
    const faqs = [
        { q: t('help.faq1Q'), a: t('help.faq1A') },
        { q: t('help.faq2Q'), a: t('help.faq2A') },
        { q: t('help.faq3Q'), a: t('help.faq3A') },
        { q: t('help.faq4Q'), a: t('help.faq4A') },
        { q: t('help.faq5Q'), a: t('help.faq5A') },
        { q: t('help.faq6Q'), a: t('help.faq6A') },
    ];

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Info size={22} color="#1A8A9E" />
                    {t('settings.helpSupport')}
                </h1>

                {faqs.map((faq, i) => (
                    <details key={i} style={{ marginBottom: 8 }}>
                        <summary style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', listStyle: 'none' }}>
                            {faq.q}
                        </summary>
                        <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-card)', borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: '20px' }}>{faq.a}</p>
                        </div>
                    </details>
                ))}

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('help.stillNeedHelp')}</p>
                    <a href="mailto:support@cliniq.one" style={{ color: '#1A8A9E', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={16} color="#1A8A9E" />
                        support@cliniq.one
                    </a>
                </div>
            </div>
        </div>
    );
}
