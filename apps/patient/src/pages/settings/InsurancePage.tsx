import { BackButton } from '../../components/BackButton';
import { Hospital } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

export default function InsurancePage() {
    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 16px' }}>
                    {t('settings.insuranceTitle')}
                </h1>
                <div className="fade-in" style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ marginBottom: 12 }}><Hospital size={48} color="#2DD4BF" /></div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                        {t('settings.insuranceComingSoon')}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: 0 }}>
                        {t('settings.insuranceComingSoonDesc')}
                    </p>
                </div>
            </div>
        </div>
    );
}
