'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import {
    doCreateLocumInvitation,
    fetchLocumInvitations,
    doRevokeLocumInvitation,
    fetchPendingLocumOnboarding,
    fetchLocumDocuments,
    doApproveLocumOnboarding,
    doRejectLocumOnboarding,
    fetchLocumPricingLimits,
    doSetLocumPricingLimits,
    fetchActiveLocums,
    doSuspendLocum,
    doToggleSandbox,
    doRenewLocumCredential,
} from '@/lib/actions';
import {
    Plus, QrCode, Copy, Trash2, Check, X, Loader2, ArrowLeft,
    Users, Clock, ShieldCheck, DollarSign, FileText, ExternalLink,
    ChevronDown, ChevronUp, Eye, ShieldAlert, RefreshCw, ToggleLeft, ToggleRight,
    UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

// ── Types ────────────────────────────────────
type Invitation = {
    id: string;
    invite_code: string;
    qr_payload: string;
    specialty: string;
    status: string;
    notes: string | null;
    expires_at: string;
    created_at: string;
    claimed_by: string | null;
};

type PendingDoctor = {
    id: string;
    display_name: string;
    full_name: string;
    specialty: string;
    identifier_code: string;
    onboarding_status: string;
    created_at: string;
};

type LocumDocument = {
    id: string;
    doctor_id: string;
    document_type: string;
    file_name: string;
    storage_path: string;
    file_size_bytes: number;
    verified: boolean;
    verified_by: string | null;
    verified_at: string | null;
    rejection_reason: string | null;
    uploaded_at: string;
};

type ActiveLocum = {
    id: string;
    display_name: string;
    full_name: string;
    specialty: string;
    identifier_code: string;
    credential_expires_at: string | null;
    sandbox_mode: boolean;
    status: string;
    consultation_fee_tokens: number;
    consultation_count: number;
    created_at: string;
};

// ── QR Code Component ────────────────────────
function QRCodeImage({ data, size = 160 }: { data: string; size?: number }) {
    const [src, setSrc] = useState('');
    useEffect(() => {
        QRCode.toDataURL(data, { width: size, margin: 1, color: { dark: '#0D1117', light: '#FFFFFF' } })
            .then(setSrc)
            .catch(console.error);
    }, [data, size]);
    if (!src) return <div className="w-40 h-40 bg-bg-elevated rounded-xl animate-pulse" />;
    return <img src={src} alt="QR Code" className="rounded-xl" style={{ width: size, height: size }} />;
}

// ── Credential Expiry Badge ──────────────────
function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
    if (!expiresAt) return <span className="text-xs text-text-muted">No expiry</span>;
    const now = new Date();
    const exp = new Date(expiresAt);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return <span className="px-2 py-0.5 rounded-lg bg-error/10 text-error text-[10px] font-bold">EXPIRED ({Math.abs(daysLeft)}d ago)</span>;
    }
    if (daysLeft <= 2) {
        return <span className="px-2 py-0.5 rounded-lg bg-error/10 text-error text-[10px] font-bold">⚠️ {daysLeft}d LEFT</span>;
    }
    if (daysLeft <= 7) {
        return <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">{daysLeft}d LEFT</span>;
    }
    return <span className="px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] font-bold">{daysLeft}d LEFT</span>;
}

export default function LocumManagementPage() {
    const [adminId, setAdminId] = useState('');

    useEffect(() => {
        const sb = createBrowserSupabase();
        sb.auth.getSession().then(({ data }) => {
            setAdminId(data.session?.user?.id || '');
        });
    }, []);

    // ── State ────────────────────────────────
    const [tab, setTab] = useState<'invitations' | 'pending' | 'active' | 'pricing'>('invitations');
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
    const [activeLocums, setActiveLocums] = useState<ActiveLocum[]>([]);
    const [pricingLimits, setPricingLimits] = useState({ min: 2, max: 10 });
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // Create invitation form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newSpecialty, setNewSpecialty] = useState('dermatology');
    const [newExpiry, setNewExpiry] = useState(14);
    const [newNotes, setNewNotes] = useState('');

    // Document viewer state
    const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
    const [doctorDocs, setDoctorDocs] = useState<Record<string, LocumDocument[]>>({});
    const [loadingDocs, setLoadingDocs] = useState<string | null>(null);

    // ── Data Loading ─────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        const [inv, pending, active, limits] = await Promise.all([
            fetchLocumInvitations(),
            fetchPendingLocumOnboarding(),
            fetchActiveLocums(),
            fetchLocumPricingLimits(),
        ]);
        setInvitations(inv as Invitation[]);
        setPendingDoctors(pending as PendingDoctor[]);
        setActiveLocums(active as ActiveLocum[]);
        setPricingLimits(limits);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Load documents for a doctor ──────────
    async function loadDoctorDocs(doctorId: string) {
        if (expandedDoctor === doctorId) {
            setExpandedDoctor(null);
            return;
        }
        setLoadingDocs(doctorId);
        const docs = await fetchLocumDocuments(doctorId);
        setDoctorDocs(prev => ({ ...prev, [doctorId]: docs as LocumDocument[] }));
        setExpandedDoctor(doctorId);
        setLoadingDocs(null);
    }

    // ── Actions ──────────────────────────────
    async function handleCreate() {
        setCreating(true);
        const res = await doCreateLocumInvitation(adminId, newSpecialty, newExpiry, newNotes || undefined);
        if (!res.error) {
            setShowCreateForm(false);
            setNewNotes('');
            loadData();
        }
        setCreating(false);
    }

    async function handleRevoke(id: string) {
        await doRevokeLocumInvitation(id);
        loadData();
    }

    async function handleApprove(doctorId: string) {
        await doApproveLocumOnboarding(doctorId, adminId);
        loadData();
    }

    async function handleReject(doctorId: string) {
        const reason = prompt('Rejection reason:');
        if (reason) {
            await doRejectLocumOnboarding(doctorId, reason);
            loadData();
        }
    }

    async function handleSavePricing() {
        await doSetLocumPricingLimits(pricingLimits.min, pricingLimits.max);
    }

    async function handleSuspend(doctorId: string) {
        await doSuspendLocum(doctorId);
        loadData();
    }

    async function handleToggleSandbox(doctorId: string, current: boolean) {
        await doToggleSandbox(doctorId, !current);
        loadData();
    }

    async function handleRenewCredential(doctorId: string) {
        await doRenewLocumCredential(doctorId);
        loadData();
    }

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    }

    function docTypeLabel(type: string) {
        switch (type) {
            case 'national_id': return '🪪 National ID';
            case 'medical_license': return '🏥 Medical License';
            case 'cv': return '📄 CV';
            case 'disclaimer_signed': return '✅ Disclaimer';
            default: return '📎 ' + type;
        }
    }

    // ── Render ────────────────────────────────
    const tabCls = (t: string) => `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/doctors" className="p-2 rounded-lg hover:bg-bg-elevated transition-colors">
                    <ArrowLeft className="w-5 h-5 text-text-secondary" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Locum Management</h1>
                    <p className="text-sm text-text-secondary">Invite, onboard, and manage locum doctors</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                <button className={tabCls('invitations')} onClick={() => setTab('invitations')}>
                    <QrCode className="w-4 h-4" /> Invitations
                    {invitations.filter(i => i.status === 'pending').length > 0 && (
                        <span className="bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {invitations.filter(i => i.status === 'pending').length}
                        </span>
                    )}
                </button>
                <button className={tabCls('pending')} onClick={() => setTab('pending')}>
                    <Users className="w-4 h-4" /> Pending Reviews
                    {pendingDoctors.length > 0 && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {pendingDoctors.length}
                        </span>
                    )}
                </button>
                <button className={tabCls('active')} onClick={() => setTab('active')}>
                    <UserCheck className="w-4 h-4" /> Active Locums
                    {activeLocums.length > 0 && (
                        <span className="bg-success/20 text-success text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {activeLocums.length}
                        </span>
                    )}
                </button>
                <button className={tabCls('pricing')} onClick={() => setTab('pricing')}>
                    <DollarSign className="w-4 h-4" /> Pricing Limits
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
            ) : (
                <>
                    {/* ── Invitations Tab ── */}
                    {tab === 'invitations' && (
                        <div className="space-y-4">
                            {/* Create Button */}
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm hover:bg-accent/90 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Create Invitation
                            </button>

                            {/* Create Form */}
                            {showCreateForm && (
                                <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4 max-w-lg">
                                    <h3 className="text-lg font-semibold text-text-primary">New Locum Invitation</h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Specialty</label>
                                        <select
                                            value={newSpecialty}
                                            onChange={(e) => setNewSpecialty(e.target.value)}
                                            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary"
                                        >
                                            <option value="dermatology">Dermatology</option>
                                            <option value="family_medicine">Family Medicine</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Invitation Expiry</label>
                                        <select
                                            value={newExpiry}
                                            onChange={(e) => setNewExpiry(Number(e.target.value))}
                                            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary"
                                        >
                                            <option value={7}>7 days</option>
                                            <option value={14}>14 days</option>
                                            <option value={30}>30 days</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Notes (optional)</label>
                                        <input
                                            type="text"
                                            value={newNotes}
                                            onChange={(e) => setNewNotes(e.target.value)}
                                            placeholder="e.g. Dr. Hassan referral"
                                            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCreate}
                                            disabled={creating}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary font-semibold text-sm disabled:opacity-50"
                                        >
                                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                            Generate QR & Link
                                        </button>
                                        <button onClick={() => setShowCreateForm(false)} className="px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Invitations List */}
                            <div className="grid gap-4">
                                {invitations.length === 0 && (
                                    <div className="text-center py-16 text-text-muted text-sm">No invitations yet. Create one above.</div>
                                )}
                                {invitations.map((inv) => {
                                    const isExpired = new Date(inv.expires_at) < new Date();
                                    const isPending = inv.status === 'pending' && !isExpired;
                                    return (
                                        <div key={inv.id} className={`bg-bg-card border rounded-2xl p-5 flex gap-5 items-start ${isPending ? 'border-accent/20' : 'border-border opacity-60'}`}>
                                            {/* QR */}
                                            <div className="flex-shrink-0">
                                                {isPending ? (
                                                    <QRCodeImage data={inv.qr_payload} size={120} />
                                                ) : (
                                                    <div className="w-[120px] h-[120px] bg-bg-elevated rounded-xl flex items-center justify-center">
                                                        <QrCode className="w-8 h-8 text-text-muted" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lg font-bold text-text-primary">{inv.invite_code}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                        isPending ? 'bg-accent/10 text-accent' :
                                                        inv.status === 'claimed' ? 'bg-yellow-500/10 text-yellow-400' :
                                                        inv.status === 'revoked' ? 'bg-error/10 text-error' :
                                                        'bg-bg-elevated text-text-muted'
                                                    }`}>
                                                        {isExpired ? 'EXPIRED' : inv.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-secondary capitalize">
                                                    {inv.specialty.replace('_', ' ')} • Expires {new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                {inv.notes && <p className="text-xs text-text-muted">📝 {inv.notes}</p>}

                                                {/* Actions */}
                                                {isPending && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => copyToClipboard(inv.qr_payload, inv.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-elevated text-text-secondary hover:text-accent transition-all"
                                                        >
                                                            {copied === inv.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                                            {copied === inv.id ? 'Copied!' : 'Copy Link'}
                                                        </button>
                                                        <a
                                                            href={inv.qr_payload}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-elevated text-text-secondary hover:text-accent transition-all"
                                                        >
                                                            <ExternalLink className="w-3 h-3" /> Open Link
                                                        </a>
                                                        <button
                                                            onClick={() => handleRevoke(inv.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-error hover:bg-error/10 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Revoke
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Pending Reviews Tab ── */}
                    {tab === 'pending' && (
                        <div className="space-y-4">
                            {pendingDoctors.length === 0 ? (
                                <div className="text-center py-16 text-text-muted text-sm">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-text-muted/30" />
                                    No pending applications
                                </div>
                            ) : (
                                pendingDoctors.map((doc) => (
                                    <div key={doc.id} className="bg-bg-card border border-yellow-500/20 rounded-2xl overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-text-primary">{doc.display_name}</h3>
                                                    <p className="text-sm text-text-secondary capitalize">{doc.specialty.replace('_', ' ')} • {doc.identifier_code}</p>
                                                    <p className="text-xs text-text-muted mt-1">
                                                        Applied {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        <span className="ml-2 px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">
                                                            {doc.onboarding_status === 'documents_pending' ? '📄 DOCS PENDING' : '🔍 REVIEW PENDING'}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => loadDoctorDocs(doc.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bg-elevated text-text-secondary text-sm font-semibold hover:text-accent transition-all"
                                                    >
                                                        {loadingDocs === doc.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : expandedDoctor === doc.id ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                        {expandedDoctor === doc.id ? 'Hide Docs' : 'View Docs'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(doc.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-success/10 text-success text-sm font-semibold hover:bg-success/20 transition-all"
                                                    >
                                                        <Check className="w-4 h-4" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(doc.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-all"
                                                    >
                                                        <X className="w-4 h-4" /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Document Viewer */}
                                        {expandedDoctor === doc.id && (
                                            <div className="border-t border-border bg-bg-elevated/50 p-5">
                                                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-accent" /> Uploaded Documents
                                                </h4>
                                                {(doctorDocs[doc.id] ?? []).length === 0 ? (
                                                    <p className="text-sm text-text-muted">No documents uploaded yet.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {(doctorDocs[doc.id] ?? []).map((d) => (
                                                            <div key={d.id} className="bg-bg-card border border-border rounded-xl p-4 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-semibold text-text-primary">
                                                                        {docTypeLabel(d.document_type)}
                                                                    </span>
                                                                    {d.verified ? (
                                                                        <span className="px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] font-bold">✅ VERIFIED</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDING</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-text-muted truncate" title={d.file_name}>
                                                                    📎 {d.file_name}
                                                                </p>
                                                                <p className="text-xs text-text-muted">
                                                                    {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(1)} KB` : '—'} •
                                                                    {' '}{new Date(d.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── Active Locums Tab ── */}
                    {tab === 'active' && (
                        <div className="space-y-4">
                            {activeLocums.length === 0 ? (
                                <div className="text-center py-16 text-text-muted text-sm">
                                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-text-muted/30" />
                                    No active locum doctors
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {activeLocums.map((doc) => {
                                        const isSuspended = doc.status === 'suspended';
                                        return (
                                            <div key={doc.id} className={`bg-bg-card border rounded-2xl p-5 ${isSuspended ? 'border-error/20 opacity-70' : 'border-border'}`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <h3 className="text-lg font-semibold text-text-primary">{doc.display_name}</h3>
                                                            {isSuspended && (
                                                                <span className="px-2 py-0.5 rounded-lg bg-error/10 text-error text-[10px] font-bold">SUSPENDED</span>
                                                            )}
                                                            {doc.sandbox_mode && (
                                                                <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">🧪 SANDBOX</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-text-secondary capitalize">
                                                            {doc.specialty.replace('_', ' ')} • <span className="font-mono">{doc.identifier_code}</span>
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs text-text-muted mt-1">
                                                            <span>💎 {doc.consultation_fee_tokens} tokens</span>
                                                            <span>📋 {doc.consultation_count} consultations</span>
                                                            <ExpiryBadge expiresAt={doc.credential_expires_at} />
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleRenewCredential(doc.id)}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated text-text-secondary text-xs font-semibold hover:text-accent transition-all"
                                                            title="Renew credentials (+7 days)"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" /> Renew
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleSandbox(doc.id, doc.sandbox_mode)}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated text-text-secondary text-xs font-semibold hover:text-yellow-400 transition-all"
                                                            title={doc.sandbox_mode ? 'Disable sandbox' : 'Enable sandbox'}
                                                        >
                                                            {doc.sandbox_mode ? <ToggleRight className="w-3.5 h-3.5 text-yellow-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                                            Sandbox
                                                        </button>
                                                        <button
                                                            onClick={() => handleSuspend(doc.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                                isSuspended
                                                                    ? 'bg-success/10 text-success hover:bg-success/20'
                                                                    : 'bg-error/10 text-error hover:bg-error/20'
                                                            }`}
                                                        >
                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                            {isSuspended ? 'Activate' : 'Suspend'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Pricing Limits Tab ── */}
                    {tab === 'pricing' && (
                        <div className="bg-bg-card border border-border rounded-2xl p-6 max-w-lg space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-text-primary">Locum Pricing Limits</h3>
                                <p className="text-sm text-text-secondary mt-1">Set the min and max consultation fee (in tokens) that locum doctors can charge</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Minimum Fee (tokens)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={1}
                                            max={pricingLimits.max - 1}
                                            value={pricingLimits.min}
                                            onChange={(e) => setPricingLimits(p => ({ ...p, min: Number(e.target.value) }))}
                                            className="flex-1 accent-accent"
                                        />
                                        <span className="font-mono text-lg font-bold text-accent min-w-[2rem] text-center">{pricingLimits.min}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Maximum Fee (tokens)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min={pricingLimits.min + 1}
                                            max={20}
                                            value={pricingLimits.max}
                                            onChange={(e) => setPricingLimits(p => ({ ...p, max: Number(e.target.value) }))}
                                            className="flex-1 accent-accent"
                                        />
                                        <span className="font-mono text-lg font-bold text-accent min-w-[2rem] text-center">{pricingLimits.max}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-bg-elevated">
                                <DollarSign className="w-5 h-5 text-accent" />
                                <p className="text-sm text-text-secondary">
                                    Locum doctors can set their consultation fee between <strong className="text-text-primary">{pricingLimits.min}</strong> and <strong className="text-text-primary">{pricingLimits.max}</strong> tokens.
                                    Auto-assigned consultations remain at the flat rate of 3 tokens.
                                </p>
                            </div>

                            <button
                                onClick={handleSavePricing}
                                className="px-6 py-2.5 rounded-xl bg-accent text-bg-primary font-semibold text-sm hover:bg-accent/90 transition-all"
                            >
                                Save Limits
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
