'use client';

import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import PatientDetailPanel, { type UserFull } from '@/components/PatientDetailPanel';
import {
    Users, UserCheck, ShieldOff, Stethoscope, UserPlus,
    Search, Download, ChevronLeft, ChevronRight,
    MoreVertical, Eye, ShieldCheck, Trash2, Coins
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchUsers, fetchUserStats, editUser } from '@/lib/actions';

// ── Types ────────────────────────────────────

type UserRow = UserFull;

type UserStats = {
    total: number;
    active: number;
    blocked: number;
    patients: number;
    doctors: number;
};

// ── Constants ────────────────────────────────

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    blocked: 'error',
    inactive: 'neutral',
};

const STATUS_TABS = [
    { key: 'all', label: 'All Users' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'inactive', label: 'Inactive' },
] as const;

const ROLE_TABS = [
    { key: 'all', label: 'All Roles' },
    { key: 'patient', label: 'Patients' },
    { key: 'doctor', label: 'Doctors' },
    { key: 'admin', label: 'Admins' },
] as const;

// ── Helpers ──────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Page ─────────────────────────────────────

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, blocked: 0, patients: 0, doctors: 0 });
    const [activeStatus, setActiveStatus] = useState('all');
    const [activeRole, setActiveRole] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    const loadUsers = useCallback(() => {
        setLoading(true);
        const status = activeStatus === 'all' ? undefined : activeStatus;
        const role = activeRole === 'all' ? undefined : activeRole;
        const searchTerm = search.trim() || undefined;
        fetchUsers(page, perPage, searchTerm, status, role).then(({ data, count }) => {
            setUsers(data as UserRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, [activeStatus, activeRole, search, page]);

    const loadStats = useCallback(() => {
        fetchUserStats().then(setStats);
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);
    useEffect(() => { loadStats(); }, [loadStats]);

    function handleStatusFilter(key: string) { setActiveStatus(key); setPage(1); }
    function handleRoleFilter(key: string) { setActiveRole(key); setPage(1); }
    function handleSearchChange(val: string) { setSearch(val); setPage(1); }

    function refreshAll() { loadUsers(); loadStats(); }

    const totalPages = Math.ceil(totalCount / perPage);

    const roleColorMap: Record<string, string> = {
        patient: 'text-accent',
        doctor: 'text-blue-400',
        admin: 'text-purple-400',
    };

    return (
        <>
            <Header title="Patient Management" subtitle="Manage all registered users & patients" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                {/* ── Stat Cards ───────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Users"
                        value={stats.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={UserCheck}
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                    <StatCard
                        label="Patients"
                        value={stats.patients}
                        icon={Coins}
                        iconColor="text-yellow-400"
                        iconBg="bg-yellow-400/10"
                    />
                    <StatCard
                        label="Blocked"
                        value={stats.blocked}
                        icon={ShieldOff}
                        iconColor="text-error"
                        iconBg="bg-error-faded"
                    />
                </div>

                {/* ── Main Table Card ─────────────── */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    {/* Table Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">All Users</h2>
                            <p className="text-sm text-text-muted mt-0.5">
                                {totalCount} registered users
                            </p>
                        </div>
                    </div>

                    {/* Filter Tabs: Status */}
                    <div className="flex items-center gap-1 py-3 border-b border-border/50 overflow-x-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => handleStatusFilter(tab.key)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeStatus === tab.key
                                    ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                    }`}
                            >
                                {tab.label}
                                {tab.key === 'blocked' && stats.blocked > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-error/20 text-error">
                                        {stats.blocked}
                                    </span>
                                )}
                            </button>
                        ))}

                        {/* Separator */}
                        <div className="w-px h-6 bg-border/50 mx-1" />

                        {/* Role sub-filter */}
                        {ROLE_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => handleRoleFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${activeRole === tab.key
                                    ? 'bg-bg-elevated text-text-primary border border-accent/30'
                                    : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                {tab.label}
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
                                placeholder="Search by name, email, or ID..."
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
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">User</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Email</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Role</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Tokens</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Location</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Joined</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                                                    {search.trim() ? 'No results match your search' : 'No users found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map(u => (
                                                <tr key={u.id} className="group">
                                                    {/* User */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                                                                {getInitials(u.nickname)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-text-primary truncate">{u.nickname}</p>
                                                                <p className="text-xs text-text-muted truncate">{u.id.slice(0, 8)}…</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Email */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="text-text-secondary text-sm truncate block max-w-[200px]">{u.email}</span>
                                                    </td>
                                                    {/* Role */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className={`font-semibold text-xs capitalize ${roleColorMap[u.role] ?? 'text-text-secondary'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    {/* Status */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <StatusBadge
                                                            label={u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                                                            variant={statusVariantMap[u.status] ?? 'neutral'}
                                                            pulse={u.status === 'active'}
                                                        />
                                                    </td>
                                                    {/* Tokens */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="font-semibold text-yellow-400">{u.tokens_balance}</span>
                                                    </td>
                                                    {/* Location */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="text-text-muted text-xs">
                                                            {[u.city, u.country].filter(Boolean).join(', ') || '—'}
                                                        </span>
                                                    </td>
                                                    {/* Joined */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="text-text-muted text-xs">{formatDate(u.created_at)}</span>
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                        <div className="flex items-center justify-end gap-1.5 relative">
                                                            <button
                                                                onClick={() => setSelectedUser(u)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View
                                                            </button>
                                                            {/* More menu */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActionMenuId(actionMenuId === u.id ? null : u.id);
                                                                    }}
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                                {actionMenuId === u.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                                                                            <button
                                                                                onClick={() => { setSelectedUser(u); setActionMenuId(null); }}
                                                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                                View Profile
                                                                            </button>
                                                                            {u.status === 'active' ? (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        await editUser(u.id, { status: 'blocked' });
                                                                                        setActionMenuId(null);
                                                                                        refreshAll();
                                                                                    }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-error hover:bg-error-faded transition-colors"
                                                                                >
                                                                                    <ShieldOff className="w-3.5 h-3.5" />
                                                                                    Block User
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        await editUser(u.id, { status: 'active' });
                                                                                        setActionMenuId(null);
                                                                                        refreshAll();
                                                                                    }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-success hover:bg-success-faded transition-colors"
                                                                                >
                                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                                    Activate User
                                                                                </button>
                                                                            )}
                                                                            <div className="border-t border-border/50" />
                                                                            <button
                                                                                onClick={() => { setSelectedUser(u); setActionMenuId(null); }}
                                                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-error hover:bg-error-faded transition-colors"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                Delete User
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

            {/* ── Detail Panel ──────────── */}
            {selectedUser && (
                <PatientDetailPanel
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdated={() => {
                        setSelectedUser(null);
                        refreshAll();
                    }}
                />
            )}
        </>
    );
}
