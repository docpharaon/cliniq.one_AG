import { BackButton } from '../../components/BackButton';

export default function VerifyIdentityPage() {
    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 16px' }}>🪪 Verify Identity</h1>
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🪪</span>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Identity Verification</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: '0 0 16px' }}>
                        Identity verification enhances your profile security and enables certain features.
                        This feature will be available in a future update.
                    </p>
                    <div style={{ backgroundColor: '#1A8A9E15', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, color: '#1A8A9E', margin: 0 }}>
                            ✓ Your account is already secured with email verification
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
