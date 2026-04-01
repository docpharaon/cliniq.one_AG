import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptLegalTerms } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { BackButton } from '../../components/BackButton';
import { useToast } from '../../components/ToastProvider';

export default function LegalPage() {
    const navigate = useNavigate();
    const refreshUser = useAuthStore((s) => s.refreshUser);
    const toast = useToast((s) => s.show);
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleAccept() {
        if (!accepted || loading) return;
        setLoading(true);
        try {
            await acceptLegalTerms();
            await refreshUser();
            navigate('/auth/personal-details', { replace: true });
        } catch (err: any) {
            toast(err?.message || 'Failed to accept terms', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 48px' }}>
                <div style={{ paddingTop: 16, marginBottom: 24 }}><BackButton /></div>

                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>
                    {t('auth.termsOfService')} & {t('auth.privacyPolicy')}
                </h1>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>Terms of Service</h2>
                    <p style={pStyle}>
                        By using cliniq.one, you agree to these terms. The platform provides AI-assisted medical intake and telemedicine services.
                        cliniq.one is not a substitute for emergency medical care.
                    </p>
                    <p style={pStyle}>
                        <strong>User Responsibilities:</strong> You must provide accurate health information. Providing false information may affect the quality of medical advice you receive.
                    </p>
                    <p style={pStyle}>
                        <strong>Token System:</strong> Consultations require tokens. Tokens are non-refundable except as outlined in our refund policy.
                        Unused tokens do not expire.
                    </p>
                    <p style={pStyle}>
                        <strong>Medical Disclaimer:</strong> AI-generated suggestions are informational only. All diagnoses and treatment plans are reviewed by licensed physicians.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>Privacy Policy</h2>
                    <p style={pStyle}>
                        We collect personal and health data necessary to provide medical consultations.
                        Your data is encrypted and stored securely in compliance with healthcare regulations.
                    </p>
                    <p style={pStyle}>
                        <strong>Data We Collect:</strong> Name, email, phone, year of birth, gender, medical history, consultation records, and photos you upload.
                    </p>
                    <p style={pStyle}>
                        <strong>How We Use It:</strong> To facilitate consultations, improve our AI system, and communicate with you about your care.
                    </p>
                    <p style={pStyle}>
                        <strong>Data Sharing:</strong> We share your medical data only with the doctor assigned to your consultation.
                        We never sell your data to third parties.
                    </p>
                    <p style={pStyle}>
                        <strong>Your Rights:</strong> You can request to view, export, or delete your data at any time through the app settings.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>Contact</h2>
                    <p style={pStyle}>
                        For questions about these terms, contact us at <a href="mailto:support@cliniq.one" style={{ color: '#1A8A9E' }}>support@cliniq.one</a>
                    </p>
                </section>

                {/* Accept checkbox */}
                <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }}
                    onClick={() => setAccepted(!accepted)}
                >
                    <div style={{
                        width: 24, height: 24, borderRadius: 6, border: '1.5px solid',
                        borderColor: accepted ? '#1A8A9E' : '#475569',
                        backgroundColor: accepted ? '#1A8A9E' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>
                        {accepted && '✓'}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: '22px' }}>
                        I have read and agree to the <strong style={{ color: '#1A8A9E' }}>Terms of Service</strong> and <strong style={{ color: '#1A8A9E' }}>Privacy Policy</strong>
                    </span>
                </div>

                {/* Accept button */}
                <button
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                    style={{
                        width: '100%', padding: '16px 20px', borderRadius: 14, border: 'none',
                        backgroundColor: accepted ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: accepted ? 'pointer' : 'not-allowed',
                        opacity: loading ? 0.7 : 1,
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? 'Accepting…' : 'I Accept & Continue'}
                </button>
            </div>
        </div>
    );
}

const sectionStyle: React.CSSProperties = { marginBottom: 24, padding: '16px 18px', backgroundColor: 'var(--bg-card)', borderRadius: 12 };
const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' };
const pStyle: React.CSSProperties = { fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: '0 0 10px' };
