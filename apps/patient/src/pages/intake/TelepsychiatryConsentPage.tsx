import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { BackButton } from '../../components/BackButton';
import { Brain, CheckCircle } from '@cliniqone/ui';

export default function TelepsychiatryConsentPage() {
    const navigate = useNavigate();
    const [accepted, setAccepted] = useState(false);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><Brain size={22} color="#8B5CF6" /> Telepsychiatry Consent</h1>

                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 18, marginBottom: 20, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: '22px' }}>
                        I understand that I am requesting a telepsychiatry consultation through cliniq.one. I acknowledge that:
                    </p>
                    <ul style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: '22px', paddingLeft: 20, marginTop: 12 }}>
                        <li>This service is not for emergency psychiatric conditions</li>
                        <li>If I am experiencing suicidal thoughts, I should call emergency services (997) immediately</li>
                        <li>The psychiatrist may recommend in-person follow-up</li>
                        <li>My responses will be shared with the assigned mental health professional</li>
                        <li>Medications may only be prescribed when clinically appropriate</li>
                    </ul>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24, cursor: 'pointer' }}
                    onClick={() => setAccepted(!accepted)}>
                    <div style={{
                        width: 24, height: 24, borderRadius: 6, border: '1.5px solid',
                        borderColor: accepted ? '#8B5CF6' : '#475569',
                        backgroundColor: accepted ? '#8B5CF6' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>
                        {accepted && <CheckCircle size={16} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        I have read and agree to the telepsychiatry consent form
                    </span>
                </div>

                <button onClick={() => navigate('/intake/psych-screening')} disabled={!accepted}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: accepted ? '#8B5CF6' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: accepted ? 'pointer' : 'not-allowed',
                    }}>Continue to Screening</button>
            </div>
        </div>
    );
}
