import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    MessageSquare, Users, Key, Clock, TrendingUp, Search, Plus,
    Copy, Check, ToggleLeft, ToggleRight, Trash2, RefreshCw,
    Loader2, ChevronDown, Link2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchWaSubscriptions,
    fetchWaSubscriptionStats,
    doManageWaSubscription,
    fetchWaApiKeys,
    doGenerateWaApiKey,
    doToggleWaApiKey,
    doDeleteWaApiKey,
    fetchDoctors,
} from '@/lib/actions';

// ── Types ────────────────────────────────
type SubRow = {
    id: string;
    doctor_id: string;
    doctor_name: string;
    doctor_specialty: string;
    doctor_code: string;
    plan: string;
    status: string;
    sessions_limit: number;
    sessions_used: number;
    features: Record<string, boolean>;
    started_at: string;
    expires_at: string;
};

type KeyRow = {
    id: string;
    doctor_id: string;
    doctor_name: string;
    key_code: string;
    label: string;
    is_active: boolean;
    sessions_count: number;
    last_used_at: string | null;
    created_at: string;
};

type Stats = {
    total: number;
    active: number;
    trials: number;
    expired: number;
    totalSessions: number;
};

type DoctorOption = {
    id: string;
    display_name: string;
    specialty: string;
};

// ── Constants ────────────────────────────
const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    trial: { label: 'Free Trial', color: 'text-blue-400' },
    starter: { label: 'Starter', color: 'text-emerald-400' },
    professional: { label: 'Professional', color: 'text-purple-400' },
    enterprise: { label: 'Enterprise', color: 'text-amber-400' },
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    expired: 'error',
    cancelled: 'neutral',
    suspended: 'warning',
};

const WA_INTAKE_URL = 'https://wa-intake.cliniq.one';

// ── Helpers ──────────────────────────────
function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string) {
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Page ─────────────────────────────────
export default function WaSubscriptionsPage() {
    const [subs, setSubs] = useState<SubRow[]>([]);
    const [keys, setKeys] = useState<KeyRow[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, trials: 0, expired: 0, totalSessions: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'subscriptions' | 'keys'>('subscriptions');
    const [search, setSearch] = useState('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addPlan, setAddPlan] = useState('trial');
    const [addDoctorId, setAddDoctorId] = useState('');
    const [addSaving, setAddSaving] = useState(false);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    // Key gen modal
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [keyDoctorId, setKeyDoctorId] = useState('');
    const [keyLabel, setKeyLabel] = useState('Default');
    const [keySaving, setKeySaving] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    // Actions
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [subsData, statsData, keysData] = await Promise.all([
            fetchWaSubscriptions(),
            fetchWaSubscriptionStats(),
            fetchWaApiKeys(),
        ]);
        setSubs(subsData as unknown as SubRow[]);
        setStats(statsData);
        setKeys(keysData as unknown as KeyRow[]);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    async function loadDoctors() {
        const { data } = await fetchDoctors(1, 200);
        setDoctors((data as unknown as DoctorOption[]).filter((d) => d.id));
    }

    // Filtered data
    const filteredSubs = subs.filter(s =>
        !search || s.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.doctor_code?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredKeys = keys.filter(k =>
        !search || k.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
        k.key_code?.toLowerCase().includes(search.toLowerCase())
    );

    // Actions
    async function handleAddSubscription() {
        if (!addDoctorId) return;
        setAddSaving(true);
        await doManageWaSubscription(addDoctorId, addPlan, 'create');
        setAddSaving(false);
        setShowAddModal(false);
        setAddDoctorId('');
        loadData();
    }

    async function handleManageSub(doctorId: string, plan: string, action: string) {
        setActionLoading(doctorId);
        await doManageWaSubscription(doctorId, plan, action);
        setActionLoading(null);
        loadData();
    }

    async function handleGenerateKey() {
        if (!keyDoctorId) return;
        setKeySaving(true);
        const result = await doGenerateWaApiKey(keyDoctorId, keyLabel) as { data: { key_code?: string } | null; error: string | null };
        if (result.data?.key_code) {
            setGeneratedKey(result.data.key_code);
        }
        setKeySaving(false);
        loadData();
    }

    async function handleToggleKey(keyId: string, active: boolean) {
        setActionLoading(keyId);
        await doToggleWaApiKey(keyId, active);
        setActionLoading(null);
        loadData();
    }

    async function handleDeleteKey(keyId: string) {
        if (!confirm('Delete this API key? Patients using this link will be blocked.')) return;
        setActionLoading(keyId);
        await doDeleteWaApiKey(keyId);
        setActionLoading(null);
        loadData();
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    }

    return (
        <>
            <Header title="WhatsApp Intake" subtitle="Manage doctor subscriptions & API keys" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* ── Stat Cards ───────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                    <StatCard label="Total Subscribers" value={stats.total} icon={Users} />
                    <StatCard label="Active" value={stats.active} icon={TrendingUp} iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard label="Free Trials" value={stats.trials} icon={Clock} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
                    <StatCard label="Expired" value={stats.expired} icon={Clock} iconColor="text-error" iconBg="bg-error-faded" />
                    <StatCard label="Sessions (Month)" value={stats.totalSessions} icon={MessageSquare} iconColor="text-purple-400" iconBg="bg-purple-400/10" />
                </div>

                {/* ── Main Card ────────────────── */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                    {/* Tabs */}
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border flex-wrap">
                        <div className="flex gap-1">
                            {(['subscriptions', 'keys'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab
                                        ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                        : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                        }`}
                                >
                                    {tab === 'subscriptions' ? '📋 Subscriptions' : '🔑 API Keys'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowKeyModal(true); setGeneratedKey(null); loadDoctors(); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-semibold hover:-translate-y-0.5 transition-all"
                            >
                                <Key className="w-4 h-4" />
                                Generate Key
                            </button>
                            <button
                                onClick={() => { setShowAddModal(true); loadDoctors(); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Subscription
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-3 py-4">
                        <div className="relative flex-1 max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by doctor or key code..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            />
                        </div>
                        <button onClick={loadData} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-muted hover:text-accent hover:border-accent transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activeTab === 'subscriptions' ? (
                        /* ── Subscriptions Table ── */
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Doctor</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Plan</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Usage</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Expires</th>
                                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubs.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-text-muted text-sm">No subscriptions yet</td></tr>
                                    ) : filteredSubs.map(sub => {
                                        const plan = PLAN_LABELS[sub.plan] || { label: sub.plan, color: 'text-text-primary' };
                                        const usagePct = sub.sessions_limit > 0 ? Math.min(100, (sub.sessions_used / sub.sessions_limit) * 100) : 0;
                                        const expDays = daysUntil(sub.expires_at);

                                        return (
                                            <tr key={sub.id} className="group">
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                    <p className="font-semibold text-text-primary">{sub.doctor_name}</p>
                                                    <p className="text-xs text-text-muted capitalize">{sub.doctor_specialty?.replace('_', ' ')}</p>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <span className={`font-bold text-xs ${plan.color}`}>{plan.label}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-bg-elevated rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-error' : usagePct > 50 ? 'bg-warning' : 'bg-accent'}`}
                                                                style={{ width: `${usagePct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-text-muted">{sub.sessions_used}/{sub.sessions_limit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <StatusBadge label={sub.status} variant={STATUS_VARIANT[sub.status] ?? 'neutral'} />
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <span className={`text-xs ${expDays <= 3 ? 'text-error font-semibold' : 'text-text-secondary'}`}>
                                                        {formatDate(sub.expires_at)}
                                                        {expDays > 0 && <span className="text-text-muted ml-1">({expDays}d)</span>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {sub.status === 'active' ? (
                                                            <select
                                                                className="bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                                                                defaultValue=""
                                                                onChange={async (e) => {
                                                                    const val = e.target.value;
                                                                    if (!val) return;
                                                                    e.target.value = '';
                                                                    if (val === 'suspend') await handleManageSub(sub.doctor_id, sub.plan, 'suspend');
                                                                    else if (val === 'cancel') await handleManageSub(sub.doctor_id, sub.plan, 'cancel');
                                                                    else await handleManageSub(sub.doctor_id, val, 'upgrade');
                                                                }}
                                                            >
                                                                <option value="" disabled>Actions ▾</option>
                                                                <option value="trial">→ Trial</option>
                                                                <option value="starter">→ Starter</option>
                                                                <option value="professional">→ Professional</option>
                                                                <option value="enterprise">→ Enterprise</option>
                                                                <option value="suspend">⚠ Suspend</option>
                                                                <option value="cancel">✕ Cancel</option>
                                                            </select>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleManageSub(sub.doctor_id, sub.plan, 'renew')}
                                                                disabled={actionLoading === sub.doctor_id}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent-faded text-accent hover:bg-accent/20 transition-colors font-medium disabled:opacity-50"
                                                            >
                                                                {actionLoading === sub.doctor_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                                Renew
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* ── API Keys Table ── */
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Key Code</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Doctor</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Label</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Sessions</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Active</th>
                                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKeys.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-text-muted text-sm">No API keys generated yet</td></tr>
                                    ) : filteredKeys.map(k => (
                                        <tr key={k.id} className="group">
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-accent bg-accent-faded px-2 py-1 rounded-lg">{k.key_code}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(`${WA_INTAKE_URL}/?doc=${k.key_code}`)}
                                                        className="text-text-muted hover:text-accent transition-colors"
                                                        title="Copy intake link"
                                                    >
                                                        <Link2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                <span className="text-text-primary">{k.doctor_name}</span>
                                            </td>
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                <span className="text-text-secondary">{k.label || '—'}</span>
                                            </td>
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                <span className="font-medium">{k.sessions_count}</span>
                                                {k.last_used_at && (
                                                    <p className="text-[10px] text-text-muted">Last: {formatDate(k.last_used_at)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                <button
                                                    onClick={() => handleToggleKey(k.id, !k.is_active)}
                                                    disabled={actionLoading === k.id}
                                                    className="transition-all hover:scale-110 disabled:opacity-50"
                                                >
                                                    {actionLoading === k.id ? (
                                                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                                    ) : k.is_active ? (
                                                        <ToggleRight className="w-7 h-7 text-accent" />
                                                    ) : (
                                                        <ToggleLeft className="w-7 h-7 text-text-muted" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => copyToClipboard(`${WA_INTAKE_URL}/?doc=${k.key_code}`)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        Copy Link
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteKey(k.id)}
                                                        disabled={actionLoading === k.id}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add Subscription Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }} onClick={() => setShowAddModal(false)} />
                    <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden animate-scale-in" style={{ pointerEvents: 'auto', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
                            <h3 className="text-base font-bold text-text-primary">Add Subscription</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-error transition-colors text-lg">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Doctor</label>
                                <select
                                    value={addDoctorId}
                                    onChange={e => setAddDoctorId(e.target.value)}
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent"
                                >
                                    <option value="">Select a doctor...</option>
                                    {doctors.map(d => (
                                        <option key={d.id} value={d.id}>{d.display_name} ({d.specialty?.replace('_', ' ')})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Plan</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(PLAN_LABELS).map(([key, val]) => (
                                        <button
                                            key={key}
                                            onClick={() => setAddPlan(key)}
                                            className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${addPlan === key
                                                ? 'bg-accent-faded border-accent/40 text-accent'
                                                : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary'
                                                }`}
                                        >
                                            {val.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary transition-all">Cancel</button>
                            <button
                                onClick={handleAddSubscription}
                                disabled={!addDoctorId || addSaving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                                {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Generate Key Modal ── */}
            {showKeyModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }} onClick={() => setShowKeyModal(false)} />
                    <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden animate-scale-in" style={{ pointerEvents: 'auto', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
                            <h3 className="text-base font-bold text-text-primary">
                                <Key className="w-5 h-5 inline mr-2 text-purple-400" />
                                Generate API Key
                            </h3>
                            <button onClick={() => setShowKeyModal(false)} className="text-text-muted hover:text-error transition-colors text-lg">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {generatedKey ? (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-success-faded flex items-center justify-center">
                                            <Check className="w-6 h-6 text-success" />
                                        </div>
                                        <p className="text-sm text-text-primary font-semibold mb-2">Key Generated!</p>
                                    </div>
                                    <div className="bg-bg-elevated border border-accent/30 rounded-xl p-4 text-center">
                                        <p className="font-mono text-lg font-bold text-accent mb-2">{generatedKey}</p>
                                        <p className="text-xs text-text-muted break-all">{WA_INTAKE_URL}/?doc={generatedKey}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(`${WA_INTAKE_URL}/?doc=${generatedKey}`)}
                                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 transition-all"
                                    >
                                        {copiedKey ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Intake Link</>}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Doctor</label>
                                        <select
                                            value={keyDoctorId}
                                            onChange={e => setKeyDoctorId(e.target.value)}
                                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent"
                                        >
                                            <option value="">Select a doctor...</option>
                                            {doctors.map(d => (
                                                <option key={d.id} value={d.id}>{d.display_name} ({d.specialty?.replace('_', ' ')})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Label (optional)</label>
                                        <input
                                            type="text"
                                            value={keyLabel}
                                            onChange={e => setKeyLabel(e.target.value)}
                                            placeholder="e.g. Main Clinic, Branch 2..."
                                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        {!generatedKey && (
                            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                                <button onClick={() => setShowKeyModal(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary transition-all">Cancel</button>
                                <button
                                    onClick={handleGenerateKey}
                                    disabled={!keyDoctorId || keySaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-bold hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                >
                                    {keySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                    Generate
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
}
