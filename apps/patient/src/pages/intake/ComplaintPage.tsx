import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';

export default function ComplaintPage() {
    const navigate = useNavigate();
    const { chiefComplaint, setChiefComplaint } = useIntakeStore();
    const [complaint, setComplaint] = useState(chiefComplaint);

    function handleContinue() {
        if (complaint.trim().length < 5) return;
        setChiefComplaint(complaint.trim());
        navigate('/intake/ai-chat');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: '15%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    {t('intake.chiefComplaint')}
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: '20px' }}>
                    {t('intake.complaintHint')}
                </p>

                <textarea
                    value={complaint}
                    onChange={e => setComplaint(e.target.value)}
                    placeholder={t('intake.complaintPlaceholder')}
                    rows={4}
                    style={{
                        width: '100%', padding: '14px 16px', borderRadius: 12,
                        border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)', fontSize: 15, resize: 'vertical',
                        boxSizing: 'border-box', outline: 'none', lineHeight: '22px',
                    }}
                />
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
                    {complaint.length}/500 characters
                </p>

                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 10, padding: 12, margin: '16px 0 24px', borderLeft: '3px solid #1A8A9E' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: '18px' }}>
                        💡 Be specific. Instead of "skin problem", try "Red itchy rash on my left arm for 3 days"
                    </p>
                </div>

                <button onClick={handleContinue} disabled={complaint.trim().length < 5}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: complaint.trim().length >= 5 ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: complaint.trim().length >= 5 ? 'pointer' : 'not-allowed',
                    }}>
                    {t('common.continue')}
                </button>
            </div>
        </div>
    );
}
