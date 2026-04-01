import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useEffect, useState, useCallback } from 'react';
import {
    getAllRefundRequests,
    reviewRefundRequest,
    processRefund,
    getRefundStats,
    createAdminRefund,
} from '@cliniqone/api';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import {
    RotateCcw,
    Clock,
    CheckCircle2,
    XCircle,
    Coins,
    ChevronDown,
    X,
    AlertTriangle,
    User,
    Stethoscope,
    Shield,
} from 'lucide-react';

// ── Status → Badge variant mapping ──
const statusVariantMap: Record<string, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
    pending: 'warning',
    approved: 'info',
    auto_approved: 'success',
    processed: 'success',
    rejected: 'error',
};

const roleIcons: Record<string, typeof User> = {
    patient: User,
    doctor: Stethoscope,
    admin: Shield,
};

const roleBadgeColors: Record<string, string> = {
    patient: 'bg-info-faded text-info border-info/30',
    doctor: 'bg-accent-faded text-accent border-accent/30',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-400/30',
};

type RefundRow = {
    id: string;
    consultation_id: string;
    requester_role: string;
    reason_category: string;
    reason_text: string | null;
    refund_amount: number;
    status: string;
    review_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    requester?: { id: string; nickname: string; email: string; role: string };
    reviewer?: { id: string; nickname: string; email: string } | null;
    consultation?: {
        id: string;
        specialty: string;
        chief_complaint: string;
        status: string;
        token_cost: number;
        patient?: { id: string; nickname: string; email: string };
        doctor?: { id: string; display_name: string; specialty: string } | null;
    };
};

type Stats = {
    pendingCount: number;
    approvedToday: number;
    rejectedToday: number;
    totalTokensRefundedMonth: number;
};

export default function RefundsPage() {
    const { user: adminUser } = useAdminAuth();
    const [refundRequests, setRefundRequests] = useState<RefundRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ pendingCount: 0, approvedToday: 0, rejectedToday: 0, totalTokensRefundedMonth: 0 });
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedRefund, setSelectedRefund] = useState<RefundRow | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [adjustedAmount, setAdjustedAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [reqResult, statsResult] = await Promise.all([
                getAllRefundRequests({ limit: 100 }),
                getRefundStats(),
            ]);
            setRefundRequests(reqResult.refundRequests as RefundRow[]);
            setTotalCount(reqResult.total);
            setStats(statsResult);
        } catch (err) {
            console.error('Failed to fetch refund data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredRequests = activeFilter === 'All'
        ? refundRequests
        : refundRequests.filter(r => r.status === activeFilter.toLowerCase().replace('-', '_'));

    // ── Review actions ──
    async function handleApprove(requestId: string, partial?: number) {
        if (!adminUser?.id) return;
        setProcessing(true);
        try {
            await reviewRefundRequest({
                requestId,
                adminUserId: adminUser.id,
                decision: 'approved',
                notes: reviewNotes || undefined,
                adjustedAmount: partial,
            });
            // Immediately process it
            await processRefund(requestId, adminUser.id);
            setSelectedRefund(null);
            setReviewNotes('');
            setAdjustedAmount('');
            await fetchData();
        } catch (err: any) {
            alert('Error: ' + (err?.message || 'Failed to approve'));
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject(requestId: string) {
        if (!adminUser?.id || !reviewNotes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        setProcessing(true);
        try {
            await reviewRefundRequest({
                requestId,
                adminUserId: adminUser.id,
                decision: 'rejected',
                notes: reviewNotes,
            });
            setSelectedRefund(null);
            setReviewNotes('');
            await fetchData();
        } catch (err: any) {
            alert('Error: ' + (err?.message || 'Failed to reject'));
        } finally {
            setProcessing(false);
        }
    }

    // ── Column definitions ──
    const columns = [
        {
            key: 'created_at',
            label: 'Date',
            sortable: true,
            render: (row: RefundRow) => (
                <div>
                    <span className="text-sm text-text-primary">{new Date(row.created_at).toLocaleDateString()}</span>
                    <p className="text-[10px] text-text-muted">{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            ),
        },
        {
            key: 'consultation_id',
            label: 'Case',
            render: (row: RefundRow) => (
                <div>
                    <span className="font-mono text-xs text-accent">{row.consultation_id?.slice(0, 8)}…</span>
                    {row.consultation?.chief_complaint && (
                        <p className="text-[11px] text-text-muted truncate max-w-[200px]">{row.consultation.chief_complaint}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'requester',
            label: 'Requester',
            render: (row: RefundRow) => {
                const RoleIcon = roleIcons[row.requester_role] || User;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${roleBadgeColors[row.requester_role] || ''}`}>
                            <RoleIcon className="w-3 h-3" />
                            {row.requester_role}
                        </div>
                        <span className="text-sm text-text-primary">{row.requester?.nickname || row.requester?.email || '—'}</span>
                    </div>
                );
            },
        },
        {
            key: 'reason_category',
            label: 'Reason',
            render: (row: RefundRow) => (
                <div>
                    <span className="text-sm text-text-primary capitalize">{row.reason_category.replace(/_/g, ' ')}</span>
                    {row.reason_text && (
                        <p className="text-[11px] text-text-muted truncate max-w-[180px]" title={row.reason_text}>{row.reason_text}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'refund_amount',
            label: 'Amount',
            render: (row: RefundRow) => (
                <span className="font-semibold text-accent">💎 {row.refund_amount}</span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row: RefundRow) => (
                <StatusBadge
                    label={row.status.replace('_', ' ').toUpperCase()}
                    variant={statusVariantMap[row.status] || 'neutral'}
                    pulse={row.status === 'pending'}
                />
            ),
        },
        {
            key: 'actions',
            label: '',
            render: (row: RefundRow) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRefund(row); }}
                        className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                    >
                        {row.status === 'pending' ? 'Review' : 'View'}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Header title="Refund Management" subtitle="Review and process consultation refund requests" />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 animate-fade-in">
                    <StatCard
                        icon={Clock}
                        value={stats.pendingCount}
                        label="Pending Review"
                        iconColor="text-warning"
                        iconBg="bg-warning-faded"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        value={stats.approvedToday}
                        label="Approved Today"
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                    <StatCard
                        icon={XCircle}
                        value={stats.rejectedToday}
                        label="Rejected Today"
                        iconColor="text-error"
                        iconBg="bg-error-faded"
                    />
                    <StatCard
                        icon={Coins}
                        value={`💎 ${stats.totalTokensRefundedMonth}`}
                        label="Refunded This Month"
                        iconColor="text-accent"
                        iconBg="bg-accent-faded"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['All', 'Pending', 'Approved', 'Auto_approved', 'Processed', 'Rejected'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setActiveFilter(s)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === s
                                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                : 'bg-bg-elevated border border-border text-text-secondary hover:text-accent hover:border-accent'
                                }`}
                        >
                            {s === 'Auto_approved' ? 'Auto-Approved' : s}
                            {s === 'Pending' && stats.pendingCount > 0 && (
                                <span className="ml-1.5 bg-warning text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Refund Requests"
                        subtitle={`${totalCount} total refund requests`}
                        columns={columns}
                        data={filteredRequests}
                        totalCount={filteredRequests.length}
                        searchPlaceholder="Search by case ID, requester, or reason..."
                        rowKey={(row) => row.id}
                        onRowClick={(row) => setSelectedRefund(row)}
                    />
                )}
            </div>

            {/* ── Review Modal ── */}
            {selectedRefund && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => { setSelectedRefund(null); setReviewNotes(''); setAdjustedAmount(''); }}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto glass rounded-3xl p-6 md:p-8 animate-fade-in">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-accent" />
                                    Refund Request
                                </h2>
                                <p className="text-sm text-text-muted mt-1">
                                    {new Date(selectedRefund.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedRefund(null); setReviewNotes(''); setAdjustedAmount(''); }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-elevated transition-colors text-text-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">Requester</p>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${roleBadgeColors[selectedRefund.requester_role] || ''}`}>
                                        {selectedRefund.requester_role}
                                    </span>
                                    <span className="text-sm text-text-primary font-medium">{selectedRefund.requester?.nickname || '—'}</span>
                                </div>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">Refund Amount</p>
                                <p className="text-lg font-bold text-accent">💎 {selectedRefund.refund_amount} tokens</p>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">Case</p>
                                <p className="text-sm font-mono text-accent">{selectedRefund.consultation_id?.slice(0, 12)}…</p>
                                <p className="text-xs text-text-muted mt-0.5">{selectedRefund.consultation?.specialty}</p>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">Status</p>
                                <StatusBadge
                                    label={selectedRefund.status.replace('_', ' ').toUpperCase()}
                                    variant={statusVariantMap[selectedRefund.status] || 'neutral'}
                                    pulse={selectedRefund.status === 'pending'}
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-bg-elevated rounded-xl p-4 mb-6">
                            <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Reason</p>
                            <p className="text-sm font-semibold text-text-primary capitalize mb-1">
                                {selectedRefund.reason_category.replace(/_/g, ' ')}
                            </p>
                            {selectedRefund.reason_text && (
                                <p className="text-sm text-text-secondary leading-relaxed">{selectedRefund.reason_text}</p>
                            )}
                        </div>

                        {/* Consultation Details */}
                        {selectedRefund.consultation && (
                            <div className="bg-bg-elevated rounded-xl p-4 mb-6">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Consultation</p>
                                <p className="text-sm text-text-primary">{selectedRefund.consultation.chief_complaint}</p>
                                <div className="flex gap-4 mt-2 text-xs text-text-muted">
                                    {selectedRefund.consultation.patient && (
                                        <span>Patient: <span className="text-text-secondary">{selectedRefund.consultation.patient.nickname}</span></span>
                                    )}
                                    {selectedRefund.consultation.doctor && (
                                        <span>Doctor: <span className="text-text-secondary">{selectedRefund.consultation.doctor.display_name}</span></span>
                                    )}
                                    <span>Status: <span className="text-text-secondary capitalize">{selectedRefund.consultation.status}</span></span>
                                </div>
                            </div>
                        )}

                        {/* Admin Review (only for pending) */}
                        {selectedRefund.status === 'pending' && (
                            <>
                                {/* Admin Notes */}
                                <div className="mb-4">
                                    <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2 block">
                                        Admin Notes {selectedRefund.status === 'pending' && <span className="text-error">(required for rejection)</span>}
                                    </label>
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Add review notes..."
                                        className="w-full bg-bg-card border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all min-h-[80px] resize-none"
                                    />
                                </div>

                                {/* Partial Refund */}
                                <div className="mb-6">
                                    <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2 block">
                                        Adjust Amount (optional — leave blank for full refund)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-muted">💎</span>
                                        <input
                                            type="number"
                                            value={adjustedAmount}
                                            onChange={(e) => setAdjustedAmount(e.target.value)}
                                            placeholder={String(selectedRefund.refund_amount)}
                                            min="1"
                                            max={String(selectedRefund.refund_amount)}
                                            className="w-32 bg-bg-card border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                                        />
                                        <span className="text-xs text-text-muted">/ {selectedRefund.refund_amount} tokens</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(selectedRefund.id)}
                                        disabled={processing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error text-error hover:bg-error-faded transition-all font-semibold text-sm disabled:opacity-40"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(
                                            selectedRefund.id,
                                            adjustedAmount ? parseInt(adjustedAmount) : undefined
                                        )}
                                        disabled={processing}
                                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-success text-white hover:bg-success/90 transition-all font-semibold text-sm disabled:opacity-40 shadow-lg shadow-success/30"
                                    >
                                        {processing ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Approve & Process
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Already reviewed */}
                        {selectedRefund.status !== 'pending' && selectedRefund.review_notes && (
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Admin Review</p>
                                <p className="text-sm text-text-secondary">{selectedRefund.review_notes}</p>
                                {selectedRefund.reviewed_at && (
                                    <p className="text-xs text-text-muted mt-2">
                                        Reviewed: {new Date(selectedRefund.reviewed_at).toLocaleString()}
                                        {selectedRefund.reviewer && ` by ${selectedRefund.reviewer.nickname}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
