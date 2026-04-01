import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { PartyPopper, Bot, Doctor, ClipboardList } from '@cliniqone/ui';

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
        }}>
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
                <div style={{ marginBottom: 20 }}><PartyPopper size={64} color="#2DD4BF" /></div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                    {t('registration.welcomeTitle')}
                </h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: '24px', marginBottom: 32 }}>
                    {t('registration.welcomeDescription')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Bot size={24} color="#2DD4BF" />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>AI-powered health screening</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Doctor size={24} color="#2DD4BF" />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Licensed doctors review your case</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ClipboardList size={24} color="#2DD4BF" />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Get your report in hours, not days</span>
                    </div>
                </div>

                <button onClick={() => navigate('/', { replace: true })}
                    style={{
                        width: '100%', maxWidth: 320, padding: '16px 24px', borderRadius: 14,
                        border: 'none', backgroundColor: '#1A8A9E', color: '#fff',
                        fontSize: 17, fontWeight: 700, cursor: 'pointer', marginTop: 40,
                    }}>
                    {t('registration.startExploring')}
                </button>
            </div>
        </div>
    );
}
