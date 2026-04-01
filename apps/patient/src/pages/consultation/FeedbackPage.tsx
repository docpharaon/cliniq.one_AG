import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

export default function FeedbackPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const toast = useToast(s => s.show);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await supabase.from('feedback').insert({
                consultation_id: id, patient_id: user?.id, rating, comment: comment.trim() || null,
            });
            toast('Thank you for your feedback!', 'success');
            navigate(-1);
        } catch (err: any) {
            toast(err?.message || 'Failed to submit feedback', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⭐</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Rate Your Experience</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Help us improve our service</p>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setRating(star)}
                            style={{ background: 'none', border: 'none', fontSize: 36, cursor: 'pointer', opacity: star <= rating ? 1 : 0.3 }}>
                            ⭐
                        </button>
                    ))}
                </div>

                <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Tell us more about your experience (optional)…"
                    rows={4}
                    style={{
                        width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical',
                        boxSizing: 'border-box', outline: 'none', marginBottom: 20,
                    }} />

                <button onClick={handleSubmit} disabled={rating === 0 || submitting}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        backgroundColor: rating > 0 ? '#1A8A9E' : '#334155',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        cursor: rating > 0 ? 'pointer' : 'not-allowed', opacity: submitting ? 0.7 : 1,
                    }}>{submitting ? 'Submitting…' : 'Submit Feedback'}</button>
            </div>
        </div>
    );
}
