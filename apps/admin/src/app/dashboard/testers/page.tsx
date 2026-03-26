'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { supabaseAdmin } from '@/lib/supabase';
import { FlaskConical, Check, X, Loader2, RefreshCw, Mail, ExternalLink, FileText, Linkedin, Phone, ChevronDown, ChevronUp, Shield, Key, Clock, RotateCw } from 'lucide-react';

interface Tester {
    id: string;
    name: string;
    email: string;
    role: string;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected';
    download_token: string;
    reviewed_at: string | null;
    created_at: string;
    // Role-specific fields
    country: string | null;
    license_type: string | null;
    license_number: string | null;
    specialty: string | null;
    credential_file_path: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    organization: string | null;
    preferred_call_time: string | null;
    motivation: string | null;
    // Credential fields
    assigned_role: string | null;
    auth_user_id: string | null;
    login_email: string | null;
    credentials_expire_at: string | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const PLATFORM_ROLES = ['Patient', 'Doctor', 'Locum', 'Admin'] as const;
type PlatformRole = typeof PLATFORM_ROLES[number];

const countryLabel = (code: string | null) => {
    if (code === 'SA') return '🇸🇦 KSA';
    if (code === 'AE') return '🇦🇪 UAE';
    return code || '—';
};

export default function TestersPage() {
    const [testers, setTesters] = useState<Tester[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

    // Role selection modal state
    const [approveModal, setApproveModal] = useState<{ tester: Tester; selectedRole: PlatformRole } | null>(null);

    // Current admin role (to gate Admin option)
    const [currentUserRole, setCurrentUserRole] = useState<string>('admin');

    const fetchTesters = useCallback(async () => {
        setLoading(true);
        const supabase = supabaseAdmin;
        const { data, error } = await supabase
            .from('tester_signups')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setTesters(data as Tester[]);
        setLoading(false);
    }, []);

    // Fetch current user role to determine if superadmin
    useEffect(() => {
        (async () => {
            const supabase = supabaseAdmin;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
                if (data) setCurrentUserRole(data.role);
            }
        })();
    }, []);

    useEffect(() => { fetchTesters(); }, [fetchTesters]);

    const openApproveModal = (tester: Tester) => {
        // Default role suggestion based on tester's application role
        let defaultRole: PlatformRole = 'Patient';
        if (tester.role === 'Doctor' || tester.role === 'Both') defaultRole = 'Doctor';
        else if (tester.role === 'Investor') defaultRole = 'Patient'; // Investors get patient access to explore the platform
        setApproveModal({ tester, selectedRole: defaultRole });
    };

    const handleApprove = async () => {
        if (!approveModal) return;
        const { tester, selectedRole } = approveModal;

        setActionLoading(tester.id);
        setApproveModal(null);

        try {
            const supabase = supabaseAdmin;

            // Update status in DB
            const { error } = await supabase
                .from('tester_signups')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: 'admin',
                })
                .eq('id', tester.id);

            if (error) throw error;

            // Call approve-tester edge function with assigned_role
            try {
                const resp = await fetch(`${SUPABASE_URL}/functions/v1/approve-tester`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        tester_id: tester.id,
                        name: tester.name,
                        email: tester.email,
                        download_token: tester.download_token,
                        assigned_role: selectedRole,
                    }),
                });

                if (!resp.ok) {
                    const errText = await resp.text();
                    console.warn('Approval function error:', errText);
                }
            } catch (emailErr) {
                console.warn('Approval email failed:', emailErr);
            }

            await fetchTesters();
        } catch (err) {
            console.error('Approve action failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (tester: Tester) => {
        setActionLoading(tester.id);
        try {
            const supabase = supabaseAdmin;
            const { error } = await supabase
                .from('tester_signups')
                .update({
                    status: 'rejected',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: 'admin',
                })
                .eq('id', tester.id);

            if (error) throw error;
            await fetchTesters();
        } catch (err) {
            console.error('Reject action failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleResendCredentials = async (tester: Tester) => {
        if (!tester.assigned_role) return;
        setActionLoading(tester.id);
        try {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/approve-tester`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    tester_id: tester.id,
                    name: tester.name,
                    email: tester.email,
                    download_token: tester.download_token,
                    assigned_role: tester.assigned_role,
                }),
            });

            if (!resp.ok) {
                console.warn('Resend credentials failed:', await resp.text());
            }
        } catch (err) {
            console.warn('Resend credentials error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const viewCredential = async (tester: Tester) => {
        if (!tester.credential_file_path) return;
        if (signedUrls[tester.id]) {
            window.open(signedUrls[tester.id], '_blank');
            return;
        }
        try {
            const supabase = supabaseAdmin;
            const { data } = await supabase.storage
                .from('tester-credentials')
                .createSignedUrl(tester.credential_file_path, 3600);
            if (data?.signedUrl) {
                setSignedUrls(prev => ({ ...prev, [tester.id]: data.signedUrl }));
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            console.error('Failed to get signed URL:', err);
        }
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
            approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
        const emoji: Record<string, string> = { pending: '🟡', approved: '🟢', rejected: '🔴' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || ''}`}>
                {emoji[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const roleBadge = (role: string) => {
        const styles: Record<string, string> = {
            Patient: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            Doctor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
            Both: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
            Investor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
        const emoji: Record<string, string> = { Patient: '🧑‍🤝‍🧑', Doctor: '👨‍⚕️', Both: '🔀', Investor: '💼' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                {emoji[role] || '🧪'} {role}
            </span>
        );
    };

    const assignedRoleBadge = (role: string | null) => {
        if (!role) return null;
        const styles: Record<string, string> = {
            Patient: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            Doctor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
            Locum: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
            Admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
        const emoji: Record<string, string> = { Patient: '🧑‍🤝‍🧑', Doctor: '👨‍⚕️', Locum: '🩺', Admin: '🛡️' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                {emoji[role] || '🧪'} {role}
            </span>
        );
    };

    const isCredentialExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const pendingCount = testers.filter(t => t.status === 'pending').length;

    // Detail row component
    const DetailRow = ({ label, value, href, isLink }: { label: string; value: string | null; href?: string; isLink?: boolean }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-3 py-2">
                <span className="text-xs text-text-muted w-28 shrink-0 pt-0.5">{label}</span>
                {isLink || href ? (
                    <a href={href || value} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline flex items-center gap-1">
                        {value} <ExternalLink className="w-3 h-3" />
                    </a>
                ) : (
                    <span className="text-sm text-text-primary">{value}</span>
                )}
            </div>
        );
    };

    return (
        <DashboardShell>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">Testers</h1>
                            <p className="text-sm text-text-secondary">
                                {testers.length} total · {pendingCount} pending review
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchTesters}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-all border border-accent/20"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Pending', count: testers.filter(t => t.status === 'pending').length, color: 'yellow' },
                        { label: 'Approved', count: testers.filter(t => t.status === 'approved').length, color: 'emerald' },
                        { label: 'Rejected', count: testers.filter(t => t.status === 'rejected').length, color: 'red' },
                    ].map(s => (
                        <div key={s.label} className="glass rounded-xl p-4 text-center">
                            <p className={`text-3xl font-bold text-${s.color}-400`}>{s.count}</p>
                            <p className="text-xs text-text-muted mt-1">{s.label}</p>
                        </div>
                    ))}
                    {/* Role breakdown */}
                    <div className="glass rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-2 text-center">
                            {['Patient', 'Doctor', 'Investor', 'Both'].map(r => (
                                <div key={r}>
                                    <p className="text-lg font-bold text-text-primary">{testers.filter(t => t.role === r).length}</p>
                                    <p className="text-[10px] text-text-muted">{r}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                ) : testers.length === 0 ? (
                    <div className="text-center py-20 text-text-muted">
                        <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No tester signups yet</p>
                    </div>
                ) : (
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-accent/10">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Applied As</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Credentials</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {testers.map(t => (
                                        <>
                                            <tr
                                                key={t.id}
                                                className={`border-b border-accent/5 hover:bg-accent/[0.03] transition-colors cursor-pointer ${expandedId === t.id ? 'bg-accent/[0.03]' : ''}`}
                                                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-text-primary">{t.name}</p>
                                                        {expandedId === t.id ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <a href={`mailto:${t.email}`} className="text-sm text-accent hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                        <Mail className="w-3.5 h-3.5" /> {t.email}
                                                    </a>
                                                </td>
                                                <td className="px-5 py-4">{roleBadge(t.role)}</td>
                                                <td className="px-5 py-4">
                                                    {t.assigned_role ? assignedRoleBadge(t.assigned_role) : <span className="text-xs text-text-muted">—</span>}
                                                </td>
                                                <td className="px-5 py-4 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        {t.status === 'approved' && t.credentials_expire_at ? (
                                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${isCredentialExpired(t.credentials_expire_at)
                                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                }`}>
                                                                <Clock className="w-3 h-3" />
                                                                {isCredentialExpired(t.credentials_expire_at) ? 'Expired' : `Until ${new Date(t.credentials_expire_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                                            </span>
                                                        ) : t.status === 'approved' ? (
                                                            <span className="text-xs text-text-muted">Legacy</span>
                                                        ) : (
                                                            <span className="text-xs text-text-muted">—</span>
                                                        )}
                                                        {/* Doctor file credentials summary */}
                                                        {(t.role === 'Doctor' || t.role === 'Both') && t.credential_file_path && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); viewCredential(t); }}
                                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                                                            >
                                                                <FileText className="w-3 h-3" /> File
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-text-muted">
                                                    {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-5 py-4">{statusBadge(t.status)}</td>
                                                <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    {t.status === 'pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => openApproveModal(t)}
                                                                disabled={actionLoading === t.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-all border border-emerald-500/20 disabled:opacity-50"
                                                            >
                                                                {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(t)}
                                                                disabled={actionLoading === t.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-all border border-red-500/20 disabled:opacity-50"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : t.status === 'approved' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleResendCredentials(t)}
                                                                disabled={actionLoading === t.id}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-all border border-accent/20 disabled:opacity-50"
                                                            >
                                                                {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                                                                Resend
                                                            </button>
                                                            <span className="text-xs text-text-muted">
                                                                {t.reviewed_at
                                                                    ? new Date(t.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                                                    : '—'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-text-muted">
                                                            {t.reviewed_at
                                                                ? new Date(t.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                                                : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* ── Expanded Detail Row ── */}
                                            {expandedId === t.id && (
                                                <tr key={`${t.id}-detail`}>
                                                    <td colSpan={8} className="px-5 py-4 bg-bg-tertiary/30 border-b border-accent/5">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 max-w-4xl">
                                                            {/* Common */}
                                                            {t.message && <DetailRow label="Message" value={t.message} />}

                                                            {/* Credential info */}
                                                            {t.assigned_role && (
                                                                <div className="flex items-start gap-3 py-2">
                                                                    <span className="text-xs text-text-muted w-28 shrink-0 pt-0.5">Platform Role</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {assignedRoleBadge(t.assigned_role)}
                                                                        {t.auth_user_id && (
                                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                                <Key className="w-3 h-3" /> Auth Created
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {t.credentials_expire_at && (
                                                                <div className="flex items-start gap-3 py-2">
                                                                    <span className="text-xs text-text-muted w-28 shrink-0 pt-0.5">Expires</span>
                                                                    <span className={`text-sm font-medium ${isCredentialExpired(t.credentials_expire_at) ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                        {new Date(t.credentials_expire_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        {isCredentialExpired(t.credentials_expire_at) && ' (Expired)'}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {t.login_email && <DetailRow label="Login Email" value={t.login_email} />}

                                                            {/* Doctor details */}
                                                            {(t.role === 'Doctor' || t.role === 'Both') && (
                                                                <>
                                                                    <DetailRow label="Country" value={countryLabel(t.country)} />
                                                                    <DetailRow label="License Type" value={t.license_type} />
                                                                    <DetailRow label="License #" value={t.license_number} />
                                                                    <DetailRow label="Specialty" value={t.specialty} />
                                                                    {t.credential_file_path && (
                                                                        <div className="flex items-start gap-3 py-2">
                                                                            <span className="text-xs text-text-muted w-28 shrink-0 pt-0.5">Credential</span>
                                                                            <button
                                                                                onClick={() => viewCredential(t)}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20 hover:bg-accent/20 transition-colors"
                                                                            >
                                                                                <FileText className="w-3.5 h-3.5" /> View Document
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* Investor details */}
                                                            {t.role === 'Investor' && (
                                                                <>
                                                                    <DetailRow label="LinkedIn" value={t.linkedin_url} isLink />
                                                                    <DetailRow label="Organization" value={t.organization} />
                                                                    <DetailRow label="Portfolio" value={t.portfolio_url} isLink />
                                                                    {t.preferred_call_time && (
                                                                        <div className="flex items-start gap-3 py-2 col-span-2">
                                                                            <span className="text-xs text-text-muted w-28 shrink-0 pt-0.5">Zoom Availability</span>
                                                                            <div className="flex items-start gap-2">
                                                                                <Phone className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                                                                <span className="text-sm text-text-primary">{t.preferred_call_time}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* Patient details */}
                                                            {t.role === 'Patient' && t.motivation && (
                                                                <DetailRow label="Motivation" value={t.motivation} />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Role Selection Modal ── */}
            {approveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setApproveModal(null)}>
                    <div
                        className="glass rounded-2xl p-6 w-full max-w-md mx-4 border border-accent/20 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-text-primary">Approve Tester</h2>
                                <p className="text-sm text-text-secondary">
                                    Assign a platform role for <strong>{approveModal.tester.name}</strong>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-text-muted mb-3">
                            Applied as: {roleBadge(approveModal.tester.role)}
                        </p>

                        <div className="space-y-2 mb-6">
                            {PLATFORM_ROLES.map(role => {
                                // Only superadmin can assign Admin role
                                const disabled = role === 'Admin' && currentUserRole !== 'superadmin';

                                return (
                                    <button
                                        key={role}
                                        disabled={disabled}
                                        onClick={() => setApproveModal({ ...approveModal, selectedRole: role })}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${approveModal.selectedRole === role
                                            ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                                            : disabled
                                                ? 'border-accent/5 opacity-40 cursor-not-allowed'
                                                : 'border-accent/10 hover:border-accent/30 hover:bg-accent/[0.03]'
                                            }`}
                                    >
                                        <span className="text-lg">
                                            {{ Patient: '🧑‍🤝‍🧑', Doctor: '👨‍⚕️', Locum: '🩺', Admin: '🛡️' }[role]}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-text-primary">{role}</p>
                                            <p className="text-xs text-text-muted">
                                                {{
                                                    Patient: 'Access to patient app with consultation features',
                                                    Doctor: 'Full doctor dashboard with case management',
                                                    Locum: 'Doctor access with locum onboarding pre-approved',
                                                    Admin: 'Admin panel access (superadmin only)',
                                                }[role]}
                                            </p>
                                        </div>
                                        {approveModal.selectedRole === role && (
                                            <Check className="w-5 h-5 text-accent shrink-0" />
                                        )}
                                        {disabled && (
                                            <span className="text-[10px] text-text-muted shrink-0">🔒 Superadmin</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10 mb-6">
                            <Key className="w-4 h-4 text-accent shrink-0" />
                            <p className="text-xs text-text-secondary">
                                A temporary password will be auto-generated and emailed to <strong>{approveModal.tester.email}</strong>.
                                Credentials are valid for <strong>15 days</strong>.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setApproveModal(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-accent/5 hover:bg-accent/10 text-text-secondary text-sm font-medium transition-all border border-accent/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-bold transition-all border border-emerald-500/20"
                            >
                                ✅ Approve as {approveModal.selectedRole}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
