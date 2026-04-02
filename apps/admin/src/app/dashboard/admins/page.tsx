import Header from '@/components/Header';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import {
    Users, UserPlus, Shield, ShieldCheck, Search, Loader2,
    MoreVertical, ShieldAlert, Trash2, Crown, Mail, AlertCircle, X
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchUsers, editUser, removeUser, doInviteAdmin } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';

type AdminUser = {
    id: string;
    email: string;
    nickname: string;
    role: 'admin' | 'superadmin';
    status: string;
    created_at: string;
    avatar_url?: string | null;
};

export default function AdminManagementPage() {
    const { isSuperadmin, user } = useAdminAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'superadmin'>('admin');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    const loadAdmins = useCallback(async () => {
        setLoading(true);
        // Fetch admin users
        const adminResult = await fetchUsers(1, 100, search || undefined, undefined, 'admin');
        const superadminResult = await fetchUsers(1, 100, search || undefined, undefined, 'superadmin');

        const combined = [
            ...((superadminResult as any).data || []),
            ...((adminResult as any).data || []),
        ] as AdminUser[];

        // Deduplicate
        const seen = new Set<string>();
        const unique = combined.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
        });

        setAdmins(unique);
        setLoading(false);
    }, [search]);

    useEffect(() => {
        loadAdmins();
    }, [loadAdmins]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviteError('');
        setInviteSuccess('');
        setInviting(true);

        try {
            // H2 Fix: Use server action with service role — no client-side DB/auth calls
            const result = await doInviteAdmin(inviteEmail.trim(), inviteRole);
            if (result.success) {
                setInviteSuccess(result.message || 'Admin invited successfully');
                setInviteEmail('');
                loadAdmins();
            } else {
                setInviteError(result.error || 'Failed to invite admin');
            }
        } catch (err: any) {
            setInviteError(err?.message || 'Failed to invite admin');
        } finally {
            setInviting(false);
        }
    };

    const handleChangeRole = async (adminUser: AdminUser, newRole: 'admin' | 'superadmin') => {
        await editUser(adminUser.id, { role: newRole });
        setActionMenuId(null);
        loadAdmins();
    };

    const handleRemoveAdmin = async (adminUser: AdminUser) => {
        if (adminUser.id === user?.id) return; // Can't remove yourself
        if (!confirm(`Demote ${adminUser.email} to patient? They will lose admin access.`)) return;

        await editUser(adminUser.id, { role: 'patient' });
        setActionMenuId(null);
        loadAdmins();
    };

    if (!isSuperadmin) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <ShieldAlert className="w-12 h-12 text-error mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-text-primary mb-2">Superadmin Only</h2>
                    <p className="text-text-muted text-sm">Only MomenCrafts superadmins can manage admin accounts.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Admin Management" subtitle="Manage admin & superadmin accounts" />
            <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="glass rounded-2xl p-5 border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                                <Users className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-text-primary">{admins.length}</p>
                                <p className="text-xs text-text-muted">Total Admins</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                <Crown className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-text-primary">
                                    {admins.filter(a => a.role === 'superadmin').length}
                                </p>
                                <p className="text-xs text-text-muted">Superadmins</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                                <Shield className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-text-primary">
                                    {admins.filter(a => a.role === 'admin').length}
                                </p>
                                <p className="text-xs text-text-muted">Admins</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="glass rounded-2xl p-6 border border-border">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">All Administrators</h2>
                            <p className="text-sm text-text-muted mt-0.5">
                                Manage who has access to this admin panel
                            </p>
                        </div>
                        <button
                            onClick={() => setShowInvite(!showInvite)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all self-start"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Admin
                        </button>
                    </div>

                    {/* Invite Form */}
                    {showInvite && (
                        <div className="bg-bg-elevated rounded-xl p-5 border border-accent/30 mt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-text-primary">Invite New Admin</h3>
                                <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text-primary">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full bg-bg-primary border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    />
                                </div>
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value as 'admin' | 'superadmin')}
                                    className="bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                                <button
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold disabled:opacity-40 hover:-translate-y-0.5 transition-all"
                                >
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Invite
                                </button>
                            </div>
                            {inviteError && (
                                <div className="flex items-center gap-2 text-error text-sm px-3 py-2 bg-error-faded rounded-xl">
                                    <AlertCircle className="w-4 h-4" />
                                    {inviteError}
                                </div>
                            )}
                            {inviteSuccess && (
                                <div className="flex items-center gap-2 text-emerald-400 text-sm px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <ShieldCheck className="w-4 h-4" />
                                    {inviteSuccess}
                                </div>
                            )}
                            <p className="text-[11px] text-text-muted">
                                The invited person will need to sign in via Google or Apple OAuth. Their role will be applied automatically.
                            </p>
                        </div>
                    )}

                    {/* Search */}
                    <div className="py-4">
                        <div className="relative max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search admins..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="text-center py-12">
                            <Shield className="w-12 h-12 text-text-muted mx-auto mb-3" />
                            <p className="text-text-muted text-sm">No admin accounts found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Admin</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Role</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Added</th>
                                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(adminUser => {
                                        const isCurrentUser = adminUser.id === user?.id;
                                        const isSA = adminUser.role === 'superadmin';

                                        return (
                                            <tr key={adminUser.id} className="group">
                                                <td className="px-4 py-4 bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isSA
                                                            ? 'bg-gradient-to-br from-purple-500/25 to-purple-500/5 text-purple-400'
                                                            : 'bg-gradient-to-br from-accent/25 to-accent/5 text-accent'
                                                            }`}>
                                                            {adminUser.nickname?.[0]?.toUpperCase() || adminUser.email[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-text-primary text-sm truncate flex items-center gap-2">
                                                                {adminUser.nickname || adminUser.email.split('@')[0]}
                                                                {isCurrentUser && <span className="text-[10px] text-accent font-normal">(you)</span>}
                                                            </p>
                                                            <p className="text-xs text-text-muted truncate">{adminUser.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    {isSA ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            <Crown className="w-3 h-3" />
                                                            MomenCrafts
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
                                                            <Shield className="w-3 h-3" />
                                                            Admin
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${adminUser.status === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${adminUser.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                        {adminUser.status === 'active' ? 'Active' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 bg-bg-card group-hover:bg-bg-elevated transition-colors text-sm text-text-secondary">
                                                    {new Date(adminUser.created_at).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-4 py-4 bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                    <div className="flex items-center justify-end relative">
                                                        {isCurrentUser ? (
                                                            <span className="text-[11px] text-text-muted italic">—</span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => setActionMenuId(actionMenuId === adminUser.id ? null : adminUser.id)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                                {actionMenuId === adminUser.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                                                                        <div className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                                                                            {isSA ? (
                                                                                <button
                                                                                    onClick={() => handleChangeRole(adminUser, 'admin')}
                                                                                    className="flex items-center gap-2 w-full px-4 py-3 text-xs text-warning hover:bg-warning-faded transition-colors"
                                                                                >
                                                                                    <Shield className="w-3.5 h-3.5" />
                                                                                    Demote to Admin
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleChangeRole(adminUser, 'superadmin')}
                                                                                    className="flex items-center gap-2 w-full px-4 py-3 text-xs text-purple-400 hover:bg-purple-500/10 transition-colors"
                                                                                >
                                                                                    <Crown className="w-3.5 h-3.5" />
                                                                                    Promote to Superadmin
                                                                                </button>
                                                                            )}
                                                                            <div className="border-t border-border/50" />
                                                                            <button
                                                                                onClick={() => handleRemoveAdmin(adminUser)}
                                                                                className="flex items-center gap-2 w-full px-4 py-3 text-xs text-error hover:bg-error-faded transition-colors"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                Remove Admin Access
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Hierarchy Explainer */}
                <div className="glass rounded-2xl p-6 border border-border">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Role Hierarchy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-bold text-purple-400">MomenCrafts (Superadmin)</span>
                            </div>
                            <ul className="text-xs text-text-secondary space-y-1">
                                <li>• Create and manage admin accounts</li>
                                <li>• Access all settings, AI config, pricing</li>
                                <li>• Full platform control across all products</li>
                                <li>• Manage HR, Testers, KYC, Protocol Alerts</li>
                            </ul>
                        </div>
                        <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-accent" />
                                <span className="text-sm font-bold text-accent">Admin (cliniq.one Staff)</span>
                            </div>
                            <ul className="text-xs text-text-secondary space-y-1">
                                <li>• Manage doctors, patients, consultations</li>
                                <li>• View analytics and send notifications</li>
                                <li>• Manage interventions, scheduling, content</li>
                                <li>• Cannot access settings or financial config</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
