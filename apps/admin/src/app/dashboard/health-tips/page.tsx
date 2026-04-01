import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Lightbulb, CheckCircle, XCircle, Clock, Loader2, Eye, Stethoscope } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';

type HealthTipRow = {
    id: string;
    icon: string;
    title_en: string;
    title_ar: string | null;
    text_en: string;
    text_ar: string | null;
    is_active: boolean;
    sort_order: number;
    author_id: string | null;
    author_role: string | null;
    approved_by: string | null;
    approval_status: string;
    approved_at: string | null;
    created_at: string;
    author_name?: string;
};

const columns = [
    {
        key: 'title_en',
        label: 'Health Tip',
        render: (row: HealthTipRow) => (
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
        key: 'text_en',
        label: 'Content',
        render: (row: HealthTipRow) => (
            <p className="text-sm text-text-secondary max-w-[300px] truncate">{row.text_en}</p>
        ),
    },
    {
        key: 'author_role',
        label: 'Author',
        render: (row: HealthTipRow) => (
            <div className="flex items-center gap-1.5">
                {row.author_role === 'doctor' ? (
                    <><Stethoscope className="w-3.5 h-3.5 text-accent" /><span className="text-sm text-text-secondary">Doctor</span></>
                ) : (
                    <span className="text-sm text-text-muted">Admin</span>
                )}
            </div>
        ),
    },
    {
        key: 'approval_status',
        label: 'Status',
        render: (row: HealthTipRow) => {
            const variant = row.approval_status === 'approved' ? 'success' :
                row.approval_status === 'rejected' ? 'error' : 'warning';
            return <StatusBadge label={row.approval_status.charAt(0).toUpperCase() + row.approval_status.slice(1)} variant={variant} />;
        },
    },
    {
        key: 'is_active',
        label: 'Visible',
        render: (row: HealthTipRow) => (
            <StatusBadge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'neutral'} />
        ),
    },
    {
        key: 'created_at',
        label: 'Date',
        render: (row: HealthTipRow) => (
            <span className="text-sm text-text-secondary">{new Date(row.created_at).toLocaleDateString()}</span>
        ),
    },
];

export default function HealthTipsManagementPage() {
    const [tips, setTips] = useState<HealthTipRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [previewTip, setPreviewTip] = useState<HealthTipRow | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const loadTips = useCallback(async () => {
        setLoading(true);
        let query = supabaseAdmin.from('health_tips')
            .select('*')
            .order('created_at', { ascending: false });

        if (tab !== 'all') {
            query = query.eq('approval_status', tab);
        }

        const { data } = await query;
        setTips(data as HealthTipRow[] || []);
        setLoading(false);
    }, [tab]);

    useEffect(() => { loadTips(); }, [loadTips]);

    const handleApprove = async (tip: HealthTipRow) => {
        setProcessing(tip.id);
        const { data: { user } } = await supabaseAdmin.auth.getUser();
        const { error } = await supabaseAdmin.from('health_tips').update({
            approval_status: 'approved',
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
            is_active: true,
        }).eq('id', tip.id);

        setProcessing(null);
        if (error) { showToast('error', 'Failed to approve'); return; }
        showToast('success', `"${tip.title_en}" approved and now visible to patients`);
        loadTips();
    };

    const handleReject = async (tip: HealthTipRow) => {
        if (!confirm(`Reject "${tip.title_en}"? This health tip will not be shown to patients.`)) return;
        setProcessing(tip.id);
        const { data: { user } } = await supabaseAdmin.auth.getUser();
        const { error } = await supabaseAdmin.from('health_tips').update({
            approval_status: 'rejected',
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
            is_active: false,
        }).eq('id', tip.id);

        setProcessing(null);
        if (error) { showToast('error', 'Failed to reject'); return; }
        showToast('success', 'Tip rejected');
        loadTips();
    };

    const handleToggleActive = async (tip: HealthTipRow) => {
        await supabaseAdmin.from('health_tips').update({
            is_active: !tip.is_active,
        }).eq('id', tip.id);
        loadTips();
    };

    const pendingCount = tips.filter(t => t.approval_status === 'pending').length;
    const approvedCount = tips.filter(t => t.approval_status === 'approved').length;
    const activeCount = tips.filter(t => t.is_active).length;

    const columnsWithActions = [
        ...columns,
        {
            key: 'actions',
            label: '',
            render: (row: HealthTipRow) => (
                <div className="flex items-center gap-2">
                    {row.approval_status === 'pending' && (
                        <>
                            <button
                                onClick={() => handleApprove(row)}
                                disabled={processing === row.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-success-faded text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                            >
                                {processing === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Approve
                            </button>
                            <button
                                onClick={() => handleReject(row)}
                                disabled={processing === row.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-error-faded text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-3 h-3" /> Reject
                            </button>
                        </>
                    )}
                    {row.approval_status === 'approved' && (
                        <button
                            onClick={() => handleToggleActive(row)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${row.is_active ? 'bg-warning-faded text-warning hover:bg-warning/20' : 'bg-success-faded text-success hover:bg-success/20'}`}
                        >
                            {row.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    )}
                    <button
                        onClick={() => setPreviewTip(row)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-faded transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    const tabs = [
        { value: 'all' as const, label: 'All' },
        { value: 'pending' as const, label: `Pending (${pendingCount})` },
        { value: 'approved' as const, label: 'Approved' },
        { value: 'rejected' as const, label: 'Rejected' },
    ];

    return (
        <>
            <Header title="Health Tips" subtitle="Manage health advice for patients — review doctor submissions" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Lightbulb} value={String(tips.length)} label="Total Tips" />
                    <StatCard icon={Clock} value={String(pendingCount)} label="Pending Review" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={CheckCircle} value={String(approvedCount)} label="Approved" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Eye} value={String(activeCount)} label="Active (Visible)" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map(t => (
                        <button key={t.value} onClick={() => setTab(t.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.value ? 'bg-accent text-bg-primary' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Health Tips"
                        subtitle={`${tips.length} tips`}
                        columns={columnsWithActions}
                        data={tips.filter(t => tab === 'all' ? true : t.approval_status === tab)}
                        totalCount={tips.length}
                        searchPlaceholder="Search tips..."
                        rowKey={(row) => row.id}
                    />
                )}
            </div>

            {/* Preview Modal */}
            {previewTip && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTip(null)}>
                    <div className="bg-bg-primary rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-text-primary">Tip Preview</h3>
                            <button onClick={() => setPreviewTip(null)} className="text-text-muted hover:text-text-primary">✕</button>
                        </div>
                        <div className="bg-bg-elevated rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{previewTip.icon}</span>
                                <span className="font-bold text-text-primary">{previewTip.title_en}</span>
                            </div>
                            <p className="text-sm text-text-secondary">{previewTip.text_en}</p>
                            {previewTip.title_ar && (
                                <div className="border-t border-border pt-2 mt-2" dir="rtl">
                                    <p className="font-semibold text-text-primary">{previewTip.title_ar}</p>
                                    <p className="text-sm text-text-secondary">{previewTip.text_ar}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-muted">
                            Author: {previewTip.author_role || 'admin'} · Created: {new Date(previewTip.created_at).toLocaleDateString()}
                        </p>
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
