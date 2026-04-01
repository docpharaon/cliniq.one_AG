

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import {
    fetchApplications,
    fetchApplicationStats,
    doMoveToDocumentsReview,
    doApproveApplication,
    doRejectApplication,
    doRequestResubmission,
} from '@/lib/actions';
import {
    Loader2, Search, FileText, Check, X, RotateCcw, Calendar,
    ChevronRight, Eye, Filter, RefreshCw, UserPlus, CheckCircle2,
    XCircle, Clock, ClipboardCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Application = {
    id: string;
    user_id: string;
    email: string;
    phone: string | null;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: string;
    status: string;
    submitted_at: string | null;
    created_at: string;
    interview_scheduled_at: string | null;
    interview_type: string | null;
};

const STATUS_TABS = [
    { key: 'submitted', label: 'New', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { key: 'documents_review', label: 'Docs Review', icon: Eye, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { key: 'interview_scheduled', label: 'Interview', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { key: 'interview_completed', label: 'Interviewed', icon: CheckCircle2, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { key: 'approved', label: 'Approved', icon: Check, color: 'text-success', bg: 'bg-success/20' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-error', bg: 'bg-error/20' },
    { key: 'resubmission_requested', label: 'Resubmit', icon: RotateCcw, color: 'text-orange-400', bg: 'bg-orange-500/20' },
];

const SPECIALTY_LABELS: Record<string, string> = {
    dermatology: '🩺 Dermatology',
    family_medicine: '👨‍⚕️ Family Medicine',
    psychiatry: '🧠 Psychiatry',
    orthopedics: '🦴 Orthopedics',
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_TABS.find(t => t.key === status);
    if (!config) return <span className="px-2 py-0.5 rounded-lg bg-bg-elevated text-text-muted text-[10px] font-bold">{status}</span>;
    return (
        <span className={`px-2.5 py-1 rounded-lg ${config.bg} ${config.color} text-[10px] font-bold uppercase tracking-wider`}>
            {config.label}
        </span>
    );
}

export default function ApplicationsPage() {
    const [adminId, setAdminId] = useState('');
    const [activeTab, setActiveTab] = useState('submitted');
    const [applications, setApplications] = useState<Application[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const PER_PAGE = 20;

    useEffect(() => {
        const sb = createBrowserSupabase();
        sb.auth.getSession().then(({ data }) => setAdminId(data.session?.user?.id || ''));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [result, statResult] = await Promise.all([
            fetchApplications(activeTab, page, PER_PAGE, search || undefined),
            fetchApplicationStats(),
        ]);
        setApplications(result.data as Application[]);
        setTotal(result.total);
        setStats(statResult);
        setLoading(false);
    }, [activeTab, page, search]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleQuickApprove(id: string) {
        if (!confirm('Approve this application? This will create an active doctor account.')) return;
        await doApproveApplication(id, adminId);
        loadData();
    }

    async function handleQuickReject(id: string) {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        await doRejectApplication(id, adminId, reason);
        loadData();
    }

    async function handleMoveToReview(id: string) {
        await doMoveToDocumentsReview(id, adminId);
        loadData();
    }

    async function handleRequestResubmit(id: string) {
        const feedback = prompt('What changes are needed?');
        if (!feedback) return;
        await doRequestResubmission(id, adminId, feedback);
        loadData();
    }

    const totalPending = (stats.submitted || 0) + (stats.documents_review || 0) + (stats.interview_scheduled || 0) + (stats.interview_completed || 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <ClipboardCheck className="w-7 h-7 text-accent" />
                        Doctor Applications
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Review, interview, and approve doctor registrations
                        {totalPending > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold">
                                {totalPending} pending
                            </span>
                        )}
                    </p>
                </div>
                <button 
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm font-semibold hover:text-accent transition-all"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === tab.key
                                ? 'bg-accent/10 text-accent border border-accent/20'
                                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {(stats[tab.key] ?? 0) > 0 && (
                            <span className={`${tab.bg} ${tab.color} text-[10px] px-1.5 py-0.5 rounded-full font-bold`}>
                                {stats[tab.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name, email, or license..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted"
                />
            </div>

            {/* Applications List */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
            ) : applications.length === 0 ? (
                <div className="text-center py-20">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-text-muted/30" />
                    <p className="text-text-muted text-sm">No applications in this category</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {applications.map(app => (
                        <div key={app.id} className="bg-bg-card border border-border rounded-2xl p-5 hover:border-accent/20 transition-all">
                            <div className="flex items-start justify-between gap-4">
                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-lg font-semibold text-text-primary">{app.display_name}</h3>
                                        <StatusBadge status={app.status} />
                                    </div>
                                    <p className="text-sm text-text-secondary mt-1">
                                        {app.full_name} • {app.email}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                        <span className="text-xs text-text-muted">
                                            {SPECIALTY_LABELS[app.specialty] || app.specialty}
                                        </span>
                                        <span className="text-xs text-text-muted">
                                            🪪 {app.license_number} ({app.license_authority})
                                        </span>
                                        {app.submitted_at && (
                                            <span className="text-xs text-text-muted">
                                                📅 Applied {new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                        {app.interview_scheduled_at && (
                                            <span className="text-xs text-purple-400">
                                                📅 Interview {new Date(app.interview_scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Context-sensitive buttons */}
                                    {app.status === 'submitted' && (
                                        <button
                                            onClick={() => handleMoveToReview(app.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated text-text-secondary text-xs font-semibold hover:text-accent transition-all"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Review Docs
                                        </button>
                                    )}

                                    {(app.status === 'submitted' || app.status === 'documents_review' || app.status === 'interview_completed') && (
                                        <>
                                            <button
                                                onClick={() => handleQuickApprove(app.id)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-all"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleQuickReject(app.id)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-all"
                                            >
                                                <X className="w-3.5 h-3.5" /> Reject
                                            </button>
                                        </>
                                    )}

                                    {(app.status === 'submitted' || app.status === 'documents_review') && (
                                        <button
                                            onClick={() => handleRequestResubmit(app.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated text-orange-400 text-xs font-semibold hover:bg-orange-500/10 transition-all"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                                        </button>
                                    )}

                                    {/* View detail link */}
                                    <Link to={`/dashboard/applications/${app.id}`}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-all"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" /> Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > PER_PAGE && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">
                        Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 rounded-xl bg-bg-card border border-border text-sm text-text-secondary disabled:opacity-40"
                        >
                            ← Previous
                        </button>
                        <button
                            disabled={page * PER_PAGE >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-xl bg-bg-card border border-border text-sm text-text-secondary disabled:opacity-40"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
