import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import {
    Fingerprint,
    ShieldCheck,
    Clock,
    XCircle,
    ShieldOff,
    UserCheck,
    ToggleLeft,
    ToggleRight,
    RotateCcw,
    ExternalLink,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchKycStats, fetchKycUsers, changeUserKycStatus, fetchKycSetting, toggleKycSetting } from '@/lib/actions';

type KycUser = {
    id: string;
    nickname: string;
    email: string;
    kyc_status: string;
    kyc_applicant_id: string | null;
    kyc_verified_at: string | null;
    kyc_rejection_reason: string | null;
    created_at: string;
};

const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    not_started: { variant: 'neutral', label: 'Not Started' },
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Verified' },
    rejected: { variant: 'error', label: 'Rejected' },
    resubmission_requested: { variant: 'warning', label: 'Resubmit' },
    exempt: { variant: 'info', label: 'Exempt' },
};

const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'not_started', label: 'Not Started' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'exempt', label: 'Exempt' },
];

export default function KycPage() {
    const [stats, setStats] = useState<Record<string, number>>({});
    const [users, setUsers] = useState<KycUser[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [kycEnabled, setKycEnabled] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [statsData, usersData, settingData] = await Promise.all([
            fetchKycStats(),
            fetchKycUsers(1, 50, search || undefined, filter !== 'all' ? filter : undefined),
            fetchKycSetting(),
        ]);
        setStats(statsData);
        setUsers(usersData.data as KycUser[]);
        setTotalCount(usersData.count);
        setKycEnabled(settingData as boolean);
        setLoading(false);
    }, [filter, search]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleToggleKyc() {
        setToggling(true);
        await toggleKycSetting(!kycEnabled);
        setKycEnabled(!kycEnabled);
        setToggling(false);
    }

    async function handleExempt(userId: string) {
        if (!confirm('Exempt this user from identity verification?')) return;
        setActionLoading(userId);
        await changeUserKycStatus(userId, 'exempt');
        await loadData();
        setActionLoading(null);
    }

    async function handleReset(userId: string) {
        if (!confirm('Reset this user\'s verification? They will need to verify again.')) return;
        setActionLoading(userId);
        await changeUserKycStatus(userId, 'not_started');
        await loadData();
        setActionLoading(null);
    }

    const columns = [
        {
            key: 'nickname',
            label: 'Patient',
            render: (row: KycUser) => (
                <div>
                    <div className="font-semibold text-text-primary">{row.nickname}</div>
                    <div className="text-xs text-text-muted">{row.email}</div>
                </div>
            ),
        },
        {
            key: 'kyc_status',
            label: 'Status',
            render: (row: KycUser) => {
                const s = statusMap[row.kyc_status] ?? { variant: 'neutral' as const, label: row.kyc_status };
                return <StatusBadge label={s.label} variant={s.variant} />;
            },
        },
        {
            key: 'kyc_verified_at',
            label: 'Verified At',
            render: (row: KycUser) => row.kyc_verified_at ? (
                <span className="text-sm text-success">{new Date(row.kyc_verified_at).toLocaleDateString()}</span>
            ) : (
                <span className="text-sm text-text-muted">—</span>
            ),
        },
        {
            key: 'kyc_rejection_reason',
            label: 'Rejection Reason',
            render: (row: KycUser) => row.kyc_rejection_reason ? (
                <span className="text-sm text-error truncate max-w-[200px] block" title={row.kyc_rejection_reason}>
                    {row.kyc_rejection_reason}
                </span>
            ) : (
                <span className="text-sm text-text-muted">—</span>
            ),
        },
        {
            key: 'kyc_applicant_id',
            label: 'Sumsub',
            render: (row: KycUser) => row.kyc_applicant_id ? (
                <a
                    href={`https://cockpit.sumsub.com/checkus/#/applicant/${row.kyc_applicant_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                    View <ExternalLink className="w-3 h-3" />
                </a>
            ) : (
                <span className="text-sm text-text-muted">—</span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row: KycUser) => (
                <div className="flex items-center gap-2">
                    {row.kyc_status !== 'exempt' && (
                        <button
                            onClick={() => handleExempt(row.id)}
                            disabled={actionLoading === row.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-info-faded text-info hover:bg-info/20 transition-colors disabled:opacity-50"
                            title="Exempt from verification"
                        >
                            <UserCheck className="w-3 h-3" /> Exempt
                        </button>
                    )}
                    {row.kyc_status !== 'not_started' && (
                        <button
                            onClick={() => handleReset(row.id)}
                            disabled={actionLoading === row.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-faded text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
                            title="Reset verification"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const totalPatients = Object.values(stats).reduce((s, v) => s + v, 0);

    return (
        <>
            <Header title="ID Verification (KYC)" subtitle="Manage patient identity verification via Sumsub" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Global Toggle */}
                <div className="glass rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-accent" />
                            ID Verification Requirement
                        </h3>
                        <p className="text-sm text-text-muted mt-1">
                            {kycEnabled
                                ? 'Patients must verify their identity to receive prescriptions.'
                                : 'ID verification is disabled. All prescriptions are delivered without verification.'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggleKyc}
                        disabled={toggling}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            kycEnabled
                                ? 'bg-error-faded text-error hover:bg-error/20'
                                : 'bg-success-faded text-success hover:bg-success/20'
                        } disabled:opacity-50`}
                    >
                        {kycEnabled ? (
                            <><ToggleRight className="w-5 h-5" /> Disable KYC</>
                        ) : (
                            <><ToggleLeft className="w-5 h-5" /> Enable KYC</>
                        )}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={Fingerprint} value={String(totalPatients)} label="Total Patients" iconColor="text-accent" iconBg="bg-accent-faded" />
                    <StatCard icon={ShieldCheck} value={String(stats.approved || 0)} label="Verified" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Clock} value={String(stats.pending || 0)} label="Pending" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={XCircle} value={String(stats.rejected || 0)} label="Rejected" iconColor="text-error" iconBg="bg-error-faded" />
                    <StatCard icon={ShieldOff} value={String(stats.not_started || 0)} label="Not Started" iconColor="text-text-muted" iconBg="bg-card" />
                    <StatCard icon={UserCheck} value={String(stats.exempt || 0)} label="Exempt" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                filter === tab.key
                                    ? 'bg-accent text-bg-primary'
                                    : 'bg-card text-text-secondary hover:bg-accent-faded hover:text-accent'
                            }`}
                        >
                            {tab.label}
                            {stats[tab.key] !== undefined && (
                                <span className="ml-1.5 text-xs opacity-70">({stats[tab.key]})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Patient Verification Status"
                        subtitle={`${totalCount} patients${filter !== 'all' ? ` (${filter.replace('_', ' ')})` : ''}`}
                        columns={columns}
                        data={users}
                        totalCount={totalCount}
                        searchPlaceholder="Search by name or email..."
                        rowKey={(row) => row.id}
                    />
                )}
            </div>
        </>
    );
}
