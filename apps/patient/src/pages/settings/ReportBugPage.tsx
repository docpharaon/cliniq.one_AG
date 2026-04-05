import { useState } from 'react';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { Bug, Lightbulb, MessageSquare } from '@cliniqone/ui';

export default function ReportBugPage() {
    const { user } = useAuthStore();
    const toast = useToast(s => s.show);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('bug');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!description.trim()) return;
        setSubmitting(true);
        try {
            const categoryMap: Record<string, string> = { bug: 'ui', feature: 'chat', other: 'other' };
            await supabase.from('error_reports').insert({
                user_id: user?.id,
                reporter_name: user?.nickname || user?.email || 'Patient',
                category: categoryMap[category] || 'other',
                description: description.trim(),
                status: 'open',
            });
            toast(t('bugReport.successMessage'), 'success');
            setDescription('');
        } catch (err: any) {
            toast(err?.message || t('bugReport.submitFailed'), 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}><Bug size={22} color="var(--text-primary)" /> {t('bugReport.title')}</h1>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('bugReport.categoryLabel')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[{ key: 'bug', label: t('bugReport.category_ui'), Icon: Bug }, { key: 'feature', label: t('bugReport.category_chat'), Icon: MessageSquare }, { key: 'other', label: t('bugReport.category_other'), Icon: Lightbulb }].map(c => (
                            <button key={c.key} onClick={() => setCategory(c.key)} style={{
                                flex: 1, padding: '10px', borderRadius: 10,
                                border: `1px solid ${category === c.key ? '#1A8A9E' : '#334155'}`,
                                backgroundColor: category === c.key ? '#1A8A9E20' : 'var(--bg-card)',
                                color: category === c.key ? '#1A8A9E' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                            }}><c.Icon size={14} color={category === c.key ? '#1A8A9E' : 'var(--text-secondary)'} /> {c.label}</button>
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('bugReport.descriptionLabel')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder={t('bugReport.descriptionPlaceholder')} rows={5}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <button onClick={handleSubmit} disabled={!description.trim() || submitting}
                    style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', backgroundColor: description.trim() ? '#1A8A9E' : '#334155', color: '#fff', fontSize: 16, fontWeight: 700, cursor: description.trim() ? 'pointer' : 'not-allowed', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? t('settings.saving') : t('bugReport.submit')}
                </button>
            </div>
        </div>
    );
}
