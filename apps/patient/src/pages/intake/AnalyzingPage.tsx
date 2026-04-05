import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { CheckCircle } from '@cliniqone/ui';

export default function AnalyzingPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
        }}>
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
                <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 20px' }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    Analyzing your responses…
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px' }}>
                    Our AI is reviewing your interview to prepare a comprehensive summary for the doctor.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                    {['Checking symptoms…', 'Analyzing medical history…', 'Preparing summary…'].map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CheckCircle size={14} color="#1A8A9E" />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
