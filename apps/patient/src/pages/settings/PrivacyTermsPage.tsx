import { BackButton } from '../../components/BackButton';
import { t } from '@cliniqone/i18n';

export default function PrivacyTermsPage() {
    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px' }}>{t('settings.privacyTermsTitle')}</h1>
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, marginBottom: 16, border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>{t('settings.dataProtection')}</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: 0 }}>
                        Your health data is encrypted at rest and in transit using AES-256 encryption.
                        We comply with Saudi Arabia's Personal Data Protection Law (PDPL) and international healthcare data standards.
                        Your data is stored securely on Supabase infrastructure with row-level security policies.
                    </p>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, marginBottom: 16, border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>{t('settings.dataRights')}</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: 0 }}>
                        You have the right to access, export, and delete your personal data at any time.
                        Contact support@cliniq.one for data requests.
                    </p>
                </div>
            </div>
        </div>
    );
}
