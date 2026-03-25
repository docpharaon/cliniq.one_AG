'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import { Lightbulb, Plus, X, Loader2, CheckCircle, Clock, XCircle, Send } from 'lucide-react';

type HealthTip = {
    id: string;
    icon: string;
    title_en: string;
    title_ar: string | null;
    text_en: string;
    text_ar: string | null;
    approval_status: string;
    created_at: string;
};

const EMOJI_OPTIONS = ['💡', '💧', '🚶', '😴', '🥗', '🧘', '💊', '🩺', '❤️', '🧠', '🦷', '👁️', '🫁', '🦴', '🧬'];

export default function HealthAdvicePage() {
    const [tips, setTips] = useState<HealthTip[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [form, setForm] = useState({
        icon: '💡',
        title_en: '',
        title_ar: '',
        text_en: '',
        text_ar: '',
    });

    const supabase = createBrowserSupabase();

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const loadTips = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
            .from('health_tips')
            .select('id, icon, title_en, title_ar, text_en, text_ar, approval_status, created_at')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false });

        setTips(data as HealthTip[] || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadTips(); }, [loadTips]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title_en.trim() || !form.text_en.trim()) return;
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await supabase.from('health_tips').insert({
            icon: form.icon,
            title_en: form.title_en.trim(),
            title_ar: form.title_ar.trim() || null,
            text_en: form.text_en.trim(),
            text_ar: form.text_ar.trim() || null,
            author_id: user.id,
            author_role: 'doctor',
            approval_status: 'pending',
            is_active: false,
        });

        setSaving(false);
        if (error) {
            showToast('error', 'Failed to submit tip');
            console.error(error);
            return;
        }

        showToast('success', 'Health tip submitted for review!');
        setForm({ icon: '💡', title_en: '', title_ar: '', text_en: '', text_ar: '' });
        setShowForm(false);
        loadTips();
    };

    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
            approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
        const icons: Record<string, React.ReactNode> = {
            pending: <Clock className="w-3 h-3" />,
            approved: <CheckCircle className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${styles[status] || styles.pending}`}>
                {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <>
            {/* Header */}
            <div className="border-b border-border px-4 md:px-8 py-4 md:py-6">
                <div className="flex items-center justify-between max-w-[1400px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent-faded">
                            <Lightbulb className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-text-primary">Health Advice</h1>
                            <p className="text-sm text-text-muted">Submit health tips for patients — reviewed by admin</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Tip
                    </button>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-bg-elevated rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-text-primary">{tips.length}</p>
                        <p className="text-xs text-text-muted">Submitted</p>
                    </div>
                    <div className="bg-bg-elevated rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{tips.filter(t => t.approval_status === 'approved').length}</p>
                        <p className="text-xs text-text-muted">Approved</p>
                    </div>
                    <div className="bg-bg-elevated rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{tips.filter(t => t.approval_status === 'pending').length}</p>
                        <p className="text-xs text-text-muted">Pending</p>
                    </div>
                </div>

                {/* Tips List */}
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tips.length === 0 ? (
                    <div className="text-center py-16">
                        <Lightbulb className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <p className="text-text-secondary font-medium">No health tips submitted yet</p>
                        <p className="text-text-muted text-sm">Share your medical knowledge with patients</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tips.map(tip => (
                            <div key={tip.id} className="bg-bg-elevated rounded-xl p-4 flex items-start gap-3">
                                <span className="text-2xl">{tip.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-text-primary truncate">{tip.title_en}</p>
                                        {statusBadge(tip.approval_status)}
                                    </div>
                                    <p className="text-sm text-text-secondary line-clamp-2">{tip.text_en}</p>
                                    {tip.title_ar && (
                                        <p className="text-xs text-text-muted mt-1" dir="rtl">{tip.title_ar}</p>
                                    )}
                                    <p className="text-xs text-text-muted mt-2">
                                        {new Date(tip.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-bg-primary rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary">New Health Tip</h3>
                            <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Icon Picker */}
                            <div>
                                <label className="text-xs font-semibold text-text-muted mb-1.5 block">Icon</label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {EMOJI_OPTIONS.map(e => (
                                        <button key={e} type="button" onClick={() => set('icon', e)}
                                            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === e ? 'bg-accent-faded ring-2 ring-accent' : 'bg-bg-elevated hover:bg-bg-elevated/80'}`}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Titles */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-1.5 block">Title (EN) *</label>
                                    <input value={form.title_en} onChange={e => set('title_en', e.target.value)} required
                                        placeholder="e.g. Stay Hydrated"
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-1.5 block">Title (AR)</label>
                                    <input value={form.title_ar} onChange={e => set('title_ar', e.target.value)} dir="rtl"
                                        placeholder="مثال: حافظ على ترطيبك"
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                                </div>
                            </div>

                            {/* Bodies */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-1.5 block">Advice Text (EN) *</label>
                                    <textarea value={form.text_en} onChange={e => set('text_en', e.target.value)} rows={3} required
                                        placeholder="Drink 8 glasses of water daily..."
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-1.5 block">Advice Text (AR)</label>
                                    <textarea value={form.text_ar} onChange={e => set('text_ar', e.target.value)} rows={3} dir="rtl"
                                        placeholder="اشرب ٨ أكواب من الماء يومياً..."
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none resize-none" />
                                </div>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Tips are submitted for admin review before being shown to patients.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-3 border-t border-border">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving || !form.title_en.trim() || !form.text_en.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit for Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg z-50 animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </>
    );
}
