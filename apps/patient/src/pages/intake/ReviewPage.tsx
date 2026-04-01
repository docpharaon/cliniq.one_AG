import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@cliniqone/i18n';
import { useIntakeStore } from '../../stores/intakeStore';
import { BackButton } from '../../components/BackButton';
import { ClipboardList } from '@cliniqone/ui';

export default function ReviewPage() {
    const navigate = useNavigate();
    const { chiefComplaint, qaHistory, photos, medications, allergies, specialty, setPatientAddendum } = useIntakeStore();
    const [addendum, setAddendum] = useState('');

    function handleSubmit() {
        if (addendum.trim()) setPatientAddendum(addendum.trim());
        navigate('/intake/doctor-select');
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ height: 4, backgroundColor: 'var(--bg-card)', borderRadius: 2, margin: '16px 0 24px' }}>
                    <div style={{ height: 4, width: '85%', backgroundColor: '#1A8A9E', borderRadius: 2 }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={22} color="#2DD4BF" /> {t('intake.review')}</h1>

                {/* Summary sections */}
                <Section title="Chief Complaint" content={chiefComplaint} />
                <Section title="Specialty" content={specialty.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                {medications.length > 0 && <Section title="Medications" content={medications.join(', ')} />}
                {allergies.length > 0 && <Section title="Allergies" content={allergies.join(', ')} />}
                {photos.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Photos ({photos.length})</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />)}
                        </div>
                    </div>
                )}

                {/* Q&A Summary */}
                {qaHistory.length > 0 && (
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Interview Summary ({qaHistory.length} questions)</p>
                        {qaHistory.slice(-5).map((qa, i) => (
                            <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>Q: {qa.question.slice(0, 100)}</p>
                                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '2px 0 0' }}>A: {qa.answer}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Addendum */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {t('intake.addendum')}
                    </label>
                    <textarea value={addendum} onChange={e => setAddendum(e.target.value)}
                        placeholder={t('intake.addendumPlaceholder')} rows={3}
                        style={{
                            width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical',
                            boxSizing: 'border-box', outline: 'none',
                        }} />
                </div>

                <button onClick={handleSubmit} style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                }}>{t('common.continue')}</button>
            </div>
        </div>
    );
}

function Section({ title, content }: { title: string; content: string }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, backgroundColor: 'var(--bg-card)', borderRadius: 10, padding: '10px 14px' }}>{content}</p>
        </div>
    );
}
