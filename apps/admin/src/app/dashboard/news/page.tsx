import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Megaphone, Eye, Send, PenLine, Plus, Trash2, X, Loader2, CheckCircle, XCircle, Newspaper, Volume2, Calendar } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchCampaigns, addCampaign, editCampaign, removeCampaign } from '@/lib/actions';

type CampaignRow = {
    id: string;
    type: string;
    title_en: string;
    title_ar: string | null;
    body_en: string | null;
    body_ar: string | null;
    icon: string;
    image_url: string | null;
    link_url: string | null;
    is_active: boolean;
    starts_at: string | null;
    expires_at: string | null;
    sort_order: number;
    created_at: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    news: { label: 'News', color: 'text-info', icon: Newspaper },
    promotion: { label: 'Promotion', color: 'text-success', icon: Megaphone },
    announcement: { label: 'Announcement', color: 'text-warning', icon: Volume2 },
};

const EMOJI_OPTIONS = ['📢', '🎉', '💊', '🏥', '🩺', '📰', '💡', '⭐', '🔔', '❤️', '🎁', '📋', '🆕', '🔥', '✨'];

const columns = [
    {
        key: 'title_en',
        label: 'Campaign',
        render: (row: CampaignRow) => (
            <div className="flex items-center gap-2">
                <span className="text-lg">{row.icon}</span>
                <div>
                    <p className="font-semibold text-text-primary max-w-[250px] truncate">{row.title_en}</p>
                    {row.title_ar && <p className="text-xs text-text-muted max-w-[250px] truncate" dir="rtl">{row.title_ar}</p>}
                </div>
            </div>
        ),
    },
    {
        key: 'type',
        label: 'Type',
        render: (row: CampaignRow) => {
            const t = TYPE_LABELS[row.type] || TYPE_LABELS.news;
            return <span className={`text-sm capitalize font-medium ${t.color}`}>{t.label}</span>;
        },
    },
    {
        key: 'is_active',
        label: 'Status',
        render: (row: CampaignRow) => {
            const now = new Date();
            const scheduled = row.starts_at && new Date(row.starts_at) > now;
            const expired = row.expires_at && new Date(row.expires_at) < now;
            if (!row.is_active) return <StatusBadge label="Draft" variant="neutral" />;
            if (expired) return <StatusBadge label="Expired" variant="error" />;
            if (scheduled) return <StatusBadge label="Scheduled" variant="warning" />;
            return <StatusBadge label="Active" variant="success" />;
        },
    },
    {
        key: 'schedule',
        label: 'Schedule',
        render: (row: CampaignRow) => (
            <div className="text-xs text-text-muted">
                {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : '—'}
                {' → '}
                {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : 'Ongoing'}
            </div>
        ),
    },
    {
        key: 'created_at',
        label: 'Created',
        render: (row: CampaignRow) => (
            <span className="text-sm text-text-secondary">
                {new Date(row.created_at).toLocaleDateString()}
            </span>
        ),
    },
];

function CampaignModal({
    campaign,
    onSave,
    onClose,
}: {
    campaign: CampaignRow | null;
    onSave: (data: Record<string, unknown>) => Promise<void>;
    onClose: () => void;
}) {
    const isEdit = !!campaign;
    const [form, setForm] = useState({
        type: campaign?.type || 'news',
        title_en: campaign?.title_en || '',
        title_ar: campaign?.title_ar || '',
        body_en: campaign?.body_en || '',
        body_ar: campaign?.body_ar || '',
        icon: campaign?.icon || '📢',
        image_url: campaign?.image_url || '',
        link_url: campaign?.link_url || '',
        is_active: campaign?.is_active ?? false,
        starts_at: campaign?.starts_at ? campaign.starts_at.slice(0, 16) : '',
        expires_at: campaign?.expires_at ? campaign.expires_at.slice(0, 16) : '',
        sort_order: campaign?.sort_order ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title_en.trim()) return;
        setSaving(true);
        await onSave({
            ...form,
            starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
            expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        });
        setSaving(false);
    };

    const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-primary rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-bold text-text-primary">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type */}
                    <div>
                        <label className="text-xs font-semibold text-text-muted mb-1.5 block">Type</label>
                        <div className="flex gap-2">
                            {(['news', 'promotion', 'announcement'] as const).map(t => (
                                <button key={t} type="button" onClick={() => set('type', t)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${form.type === t ? 'bg-accent text-bg-primary' : 'bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon */}
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
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Title (AR)</label>
                            <input value={form.title_ar} onChange={e => set('title_ar', e.target.value)} dir="rtl"
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                    </div>

                    {/* Bodies */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Body (EN)</label>
                            <textarea value={form.body_en} onChange={e => set('body_en', e.target.value)} rows={3}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none resize-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Body (AR)</label>
                            <textarea value={form.body_ar} onChange={e => set('body_ar', e.target.value)} rows={3} dir="rtl"
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none resize-none" />
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Starts At</label>
                            <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Expires At</label>
                            <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                    </div>

                    {/* URLs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Image URL</label>
                            <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..."
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Link URL</label>
                            <input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://..."
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                    </div>

                    {/* Sort + Active */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Sort Order</label>
                            <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-5">
                            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                                className="w-4 h-4 rounded accent-accent" />
                            <span className="text-sm font-medium text-text-primary">Active</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-3 border-t border-border">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || !form.title_en.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {isEdit ? 'Save Changes' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [modal, setModal] = useState<{ mode: 'create' | 'edit'; campaign?: CampaignRow } | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const loadCampaigns = useCallback(async () => {
        setLoading(true);
        const { data, count } = await fetchCampaigns(1, 100, undefined, typeFilter !== 'all' ? typeFilter : undefined);
        setCampaigns(data as CampaignRow[]);
        setTotalCount(count);
        setLoading(false);
    }, [typeFilter]);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

    const handleSave = async (data: Record<string, unknown>) => {
        if (modal?.mode === 'edit' && modal.campaign) {
            const result = await editCampaign(modal.campaign.id, data);
            if (result.error) { showToast('error', result.error); return; }
            showToast('success', 'Campaign updated');
        } else {
            const result = await addCampaign(data as any);
            if (result.error) { showToast('error', result.error); return; }
            showToast('success', 'Campaign created');
        }
        setModal(null);
        loadCampaigns();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this campaign?')) return;
        const result = await removeCampaign(id);
        if (result.error) { showToast('error', result.error); return; }
        showToast('success', 'Campaign deleted');
        loadCampaigns();
    };

    const handleToggleActive = async (row: CampaignRow) => {
        await editCampaign(row.id, { is_active: !row.is_active });
        loadCampaigns();
    };

    const activeCount = campaigns.filter(c => c.is_active).length;
    const byType = (t: string) => campaigns.filter(c => c.type === t).length;

    const columnsWithActions = [
        ...columns,
        {
            key: 'actions',
            label: '',
            render: (row: CampaignRow) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleActive(row)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${row.is_active ? 'bg-warning-faded text-warning hover:bg-warning/20' : 'bg-success-faded text-success hover:bg-success/20'}`}>
                        {row.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setModal({ mode: 'edit', campaign: row })}
                        className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">Edit</button>
                    <button onClick={() => handleDelete(row.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-faded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Header title="Campaigns" subtitle="News, promotions & announcements for patients" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Megaphone} value={String(totalCount)} label="Total Campaigns" />
                    <StatCard icon={Send} value={String(activeCount)} label="Active" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Newspaper} value={String(byType('news'))} label="News" iconColor="text-info" iconBg="bg-info-faded" />
                    <StatCard icon={Volume2} value={String(byType('announcement'))} label="Announcements" iconColor="text-warning" iconBg="bg-warning-faded" />
                </div>

                {/* Type Tabs */}
                <div className="flex gap-2">
                    {[{ value: 'all', label: 'All' }, { value: 'news', label: 'News' }, { value: 'promotion', label: 'Promotions' }, { value: 'announcement', label: 'Announcements' }].map(tab => (
                        <button key={tab.value} onClick={() => setTypeFilter(tab.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${typeFilter === tab.value ? 'bg-accent text-bg-primary' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="All Campaigns"
                        subtitle={`${totalCount} campaigns`}
                        columns={columnsWithActions}
                        data={campaigns}
                        totalCount={totalCount}
                        searchPlaceholder="Search by title..."
                        rowKey={(row) => row.id}
                        actions={
                            <button onClick={() => setModal({ mode: 'create' })}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                                <Plus className="w-4 h-4" /> New Campaign
                            </button>
                        }
                    />
                )}
            </div>

            {/* Modal */}
            {modal && <CampaignModal campaign={modal.campaign || null} onSave={handleSave} onClose={() => setModal(null)} />}

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
