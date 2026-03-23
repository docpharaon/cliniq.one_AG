'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import AddDoctorModal from '@/components/AddDoctorModal';
import DoctorDetailPanel, { type DoctorFull } from '@/components/DoctorDetailPanel';
import {
    UserPlus, Users, ShieldCheck, Clock, Star, Search, Download,
    ChevronLeft, ChevronRight, Loader2, MoreVertical, Eye,
    ShieldAlert, Trash2, ToggleLeft, ToggleRight, RefreshCw, QrCode
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchDoctors, fetchDoctorStats, editDoctor, doRenewLocumCredential } from '@/lib/actions';

// ── Types ────────────────────────────────────

type DoctorRow = DoctorFull;

type DoctorStats = {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    avgRating: number;
};

// ── Constants ────────────────────────────────

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    probation: 'info',
    suspended: 'error',
    inactive: 'neutral',
    limited: 'warning',
};

const FILTER_TABS = [
    { key: 'all', label: 'All Doctors' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'inactive', label: 'Inactive' },
] as const;

// ── Helpers ──────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Page ─────────────────────────────────────

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<DoctorRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DoctorStats>({ total: 0, active: 0, pending: 0, suspended: 0, avgRating: 0 });
    const [activeFilter, setActiveFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorRow | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const loadDoctors = useCallback(() => {
        setLoading(true);
        const status = activeFilter === 'all' ? undefined : activeFilter;
        const searchTerm = search.trim() || undefined;
        fetchDoctors(page, perPage, searchTerm, status).then(({ data, count }) => {
            setDoctors(data as unknown as DoctorRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, [activeFilter, search, page]);

    const loadStats = useCallback(() => {
        fetchDoctorStats().then(setStats);
    }, []);

    useEffect(() => {
        loadDoctors();
    }, [loadDoctors]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    function handleFilterChange(key: string) {
        setActiveFilter(key);
        setPage(1);
    }

    function handleSearchChange(val: string) {
        setSearch(val);
        setPage(1);
    }

    async function handleToggleAccepting(doc: DoctorRow) {
        setTogglingId(doc.id);
        try {
            await editDoctor(doc.id, { is_accepting: !doc.is_accepting });
            loadDoctors();
        } catch {
            // Silently fail — user will see no change
        }
        setTogglingId(null);
    }

    function refreshAll() {
        loadDoctors();
        loadStats();
    }

    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <>
            <Header title="Doctor Management" subtitle="Verify credentials, manage status & limits" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                {/* ── Stat Cards ───────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Doctors"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={ShieldCheck}
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                    <StatCard
                        label="Pending Verification"
                        value={stats.pending}
                        icon={Clock}
                        iconColor="text-warning"
                        iconBg="bg-warning-faded"
                    />
                    <StatCard
                        label="Avg Rating"
                        value={stats.avgRating.toFixed(1)}
                        icon={Star}
                        iconColor="text-yellow-400"
                        iconBg="bg-yellow-400/10"
                    />
                </div>

                {/* ── Main Table Card ─────────────── */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    {/* Table Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">All Doctors</h2>
                            <p className="text-sm text-text-muted mt-0.5">
                                {totalCount} licensed medical practitioners
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/dashboard/doctors/locum"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm font-semibold hover:-translate-y-0.5 transition-all self-start"
                            >
                                <QrCode className="w-4 h-4" />
                                Manage Locum
                            </Link>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all self-start"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Doctor
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 py-3 border-b border-border/50 overflow-x-auto">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => handleFilterChange(tab.key)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === tab.key
                                    ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                    }`}
                            >
                                {tab.label}
                                {tab.key === 'pending' && stats.pending > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-warning/20 text-warning">
                                        {stats.pending}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search + Export */}
                    <div className="flex flex-wrap items-center gap-3 py-4">
                        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search by name, license, or specialty..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            />
                        </div>
                        <div className="ml-auto">
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-accent hover:bg-accent-faded transition-colors">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Doctor</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Type</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Code</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Specialty</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Rating</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Accepting</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {doctors.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                                                    {search.trim() ? 'No results match your search' : 'No doctors found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            doctors.map(doc => (
                                                <tr key={doc.id} className="group">
                                                    {/* Doctor */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                                                                {getInitials(doc.display_name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-text-primary truncate">{doc.display_name}</p>
                                                                <p className="text-xs text-text-muted truncate">{doc.email || doc.license_number}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Type */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        {(() => {
                                                            const d = doc as Record<string, unknown>;
                                                            const expiresAt = d.credential_expires_at ? String(d.credential_expires_at) : null;
                                                            const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
                                                            if (d.doctor_type === 'locum') {
                                                                return (
                                                                    <div>
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                                            🟡 Locum
                                                                        </span>
                                                                        {expiresAt && (
                                                                            <p className="text-[10px] text-text-muted mt-1">
                                                                                {isExpired
                                                                                    ? <span className="text-error">Expired</span>
                                                                                    : <>Exp: {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
                                                                    🟢 Permanent
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    {/* Code */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="font-mono text-xs text-text-secondary bg-bg-elevated px-2 py-1 rounded-lg">
                                                            {String((doc as Record<string, unknown>).identifier_code ?? '—')}
                                                        </span>
                                                    </td>
                                                    {/* Specialty */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="text-accent text-sm capitalize">{doc.specialty?.replace('_', ' ')}</span>
                                                    </td>
                                                    {/* Status */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <StatusBadge
                                                            label={doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                                            variant={statusVariantMap[doc.status] ?? 'neutral'}
                                                        />
                                                    </td>
                                                    {/* Rating */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-yellow-400">★</span>
                                                            <span className="font-medium">{Number(doc.rating_avg).toFixed(1)}</span>
                                                        </div>
                                                    </td>
                                                    {/* Accepting Toggle */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleAccepting(doc); }}
                                                            disabled={togglingId === doc.id}
                                                            className="transition-all hover:scale-110 disabled:opacity-50"
                                                            title={doc.is_accepting ? 'Currently accepting patients' : 'Not accepting patients'}
                                                        >
                                                            {togglingId === doc.id ? (
                                                                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                                            ) : doc.is_accepting ? (
                                                                <ToggleRight className="w-7 h-7 text-accent" />
                                                            ) : (
                                                                <ToggleLeft className="w-7 h-7 text-text-muted" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                        <div className="flex items-center justify-end gap-1.5 relative">
                                                            <button
                                                                onClick={() => setSelectedDoctor(doc)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View
                                                            </button>
                                                            {doc.status === 'pending' && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        await editDoctor(doc.id, {
                                                                            status: 'active',
                                                                            verified_at: new Date().toISOString(),
                                                                        });
                                                                        refreshAll();
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-success-faded text-success hover:bg-success/20 transition-colors font-semibold"
                                                                >
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    Verify
                                                                </button>
                                                            )}
                                                            {/* More menu */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActionMenuId(actionMenuId === doc.id ? null : doc.id);
                                                                    }}
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                                {actionMenuId === doc.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                                                                            <button
                                                                                onClick={() => { setSelectedDoctor(doc); setActionMenuId(null); }}
                                                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                                View Profile
                                                                            </button>
                                                                            {doc.status === 'active' ? (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        await editDoctor(doc.id, { status: 'suspended' });
                                                                                        setActionMenuId(null);
                                                                                        refreshAll();
                                                                                    }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-warning hover:bg-warning-faded transition-colors"
                                                                                >
                                                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                                                    Suspend Doctor
                                                                                </button>
                                                                            ) : doc.status !== 'active' && (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        await editDoctor(doc.id, { status: 'active', verified_at: doc.verified_at ?? new Date().toISOString() });
                                                                                        setActionMenuId(null);
                                                                                        refreshAll();
                                                                                    }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-success hover:bg-success-faded transition-colors"
                                                                                >
                                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                                    Activate Doctor
                                                                                </button>
                                                                            )}
                                                                            <div className="border-t border-border/50" />
                                                                            <button
                                                                                onClick={async () => {
                                                                                    // Will be handled through the detail panel for safety
                                                                                    setSelectedDoctor(doc);
                                                                                    setActionMenuId(null);
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-error hover:bg-error-faded transition-colors"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                Delete Doctor
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="text-sm text-text-secondary font-medium">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Modals / Panels ──────────── */}
            {showAddModal && (
                <AddDoctorModal
                    onClose={() => setShowAddModal(false)}
                    onSaved={refreshAll}
                />
            )}

            {selectedDoctor && (
                <DoctorDetailPanel
                    doctor={selectedDoctor}
                    onClose={() => setSelectedDoctor(null)}
                    onUpdated={() => {
                        setSelectedDoctor(null);
                        refreshAll();
                    }}
                />
            )}
        </>
    );
}
