import { useState } from 'react';
import {
    X, Edit3, Save, Trash2, Shield, ShieldCheck, ShieldOff,
    MapPin, Mail, Phone, Globe, Calendar, Coins, CreditCard,
    Loader2, AlertTriangle, CheckCircle2, ChevronDown, User
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { editUser, removeUser } from '@/lib/actions';

export type UserFull = {
    id: string;
    email: string;
    phone: string | null;
    nickname: string;
    year_of_birth: number | null;
    gender: string | null;
    country: string | null;
    city: string | null;
    language: string | null;
    role: string;
    status: string;
    tokens_balance: number;
    avatar_url: string | null;
    insurance_provider: string | null;
    insurance_policy_number: string | null;
    onboarding_completed: boolean;
    legal_accepted_at: string | null;
    created_at: string;
    updated_at: string;
};

type Props = {
    user: UserFull;
    onClose: () => void;
    onUpdated: () => void;
};

const statusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    blocked: 'error',
    inactive: 'neutral',
};

const STATUSES = ['active', 'pending', 'blocked', 'inactive'] as const;
const ROLES = ['patient', 'doctor', 'admin'] as const;
const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
];

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PatientDetailPanel({ user, onClose, onUpdated }: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Editable fields
    const [nickname, setNickname] = useState(user.nickname);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [yearOfBirth, setYearOfBirth] = useState(String(user.year_of_birth ?? ''));
    const [gender, setGender] = useState(user.gender ?? '');
    const [country, setCountry] = useState(user.country ?? '');
    const [city, setCity] = useState(user.city ?? '');
    const [language, setLanguage] = useState(user.language ?? 'en');
    const [tokensBalance, setTokensBalance] = useState(String(user.tokens_balance));
    const [insuranceProvider, setInsuranceProvider] = useState(user.insurance_provider ?? '');
    const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(user.insurance_policy_number ?? '');

    async function handleSave() {
        if (!nickname.trim()) { setError('Nickname is required'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await editUser(user.id, {
                nickname: nickname.trim(),
                phone: phone.trim() || null,
                year_of_birth: yearOfBirth ? parseInt(yearOfBirth, 10) : null,
                gender: gender || null,
                country: country.trim() || null,
                city: city.trim() || null,
                language,
                tokens_balance: parseInt(tokensBalance, 10) || 0,
                insurance_provider: insuranceProvider.trim() || null,
                insurance_policy_number: insurancePolicyNumber.trim() || null,
            });
            if (res.error) throw new Error(res.error);
            setSuccess('Saved!');
            setEditing(false);
            setTimeout(() => { setSuccess(''); onUpdated(); }, 600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
        setSaving(false);
    }

    async function handleStatusChange(newStatus: string) {
        setShowStatusMenu(false);
        setSaving(true);
        setError('');
        try {
            const res = await editUser(user.id, { status: newStatus });
            if (res.error) throw new Error(res.error);
            setSuccess(`Status changed to ${newStatus}`);
            setTimeout(() => { setSuccess(''); onUpdated(); }, 600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change status');
        }
        setSaving(false);
    }

    async function handleDelete() {
        setDeleting(true);
        setError('');
        try {
            const res = await removeUser(user.id);
            if (!res.success) throw new Error(res.error ?? 'Failed to delete');
            setSuccess('User deleted');
            setTimeout(() => { onUpdated(); onClose(); }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
        setDeleting(false);
    }

    const inputCls = 'w-full bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all';
    const labelCls = 'text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block';
    const valCls = 'text-sm text-text-primary';
    const sectionCls = 'border-t border-border/50 pt-4';

    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const roleColor = user.role === 'admin' ? 'text-purple-400' : user.role === 'doctor' ? 'text-blue-400' : 'text-accent';

    return (
        <div className="fixed inset-0 z-[80] flex justify-end" style={{ pointerEvents: 'none' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                style={{ pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="relative w-full max-w-[520px] h-full flex flex-col overflow-hidden"
                style={{
                    pointerEvents: 'auto',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FA 100%)',
                    borderLeft: '1px solid var(--color-border)',
                    boxShadow: '-24px 0 80px rgba(0, 0, 0, 0.5)',
                    animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
            >
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-accent/15">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">
                        {getInitials(user.nickname)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-text-primary truncate">{user.nickname}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-semibold ${roleColor}`}>{roleLabel}</span>
                            <StatusBadge
                                label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                variant={statusMap[user.status] ?? 'neutral'}
                            />
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Messages */}
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error-faded border border-error/20 text-error text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success-faded border border-success/20 text-success text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Section: Account Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-text-primary">Account Information</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Nickname</span>
                                {editing ? (
                                    <input value={nickname} onChange={e => setNickname(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={valCls}>{user.nickname}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Email</span>
                                <p className={`${valCls} flex items-center gap-1`}>
                                    <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </p>
                            </div>
                            <div>
                                <span className={labelCls}>Phone</span>
                                {editing ? (
                                    <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+1234567890" />
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <Phone className="w-3.5 h-3.5 text-text-muted" />
                                        {user.phone || '—'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Language</span>
                                {editing ? (
                                    <select value={language} onChange={e => setLanguage(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <Globe className="w-3.5 h-3.5 text-text-muted" />
                                        {LANGUAGES.find(l => l.value === user.language)?.label ?? user.language ?? '—'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Personal Details */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-bold text-text-primary">Personal Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Year of Birth</span>
                                {editing ? (
                                    <input type="number" min="1920" max="2020" value={yearOfBirth} onChange={e => setYearOfBirth(e.target.value)} className={inputCls} placeholder="1990" />
                                ) : (
                                    <p className={valCls}>{user.year_of_birth ?? '—'}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Gender</span>
                                {editing ? (
                                    <select value={gender} onChange={e => setGender(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                        <option value="">Not set</option>
                                        {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                ) : (
                                    <p className={`${valCls} capitalize`}>{user.gender?.replace('_', ' ') ?? '—'}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Country</span>
                                {editing ? (
                                    <input value={country} onChange={e => setCountry(e.target.value)} className={inputCls} placeholder="Country" />
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <MapPin className="w-3.5 h-3.5 text-text-muted" />
                                        {user.country || '—'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>City</span>
                                {editing ? (
                                    <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="City" />
                                ) : (
                                    <p className={valCls}>{user.city || '—'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Wallet & Insurance */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-text-primary">Wallet & Insurance</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-bg-elevated rounded-xl p-3 text-center border border-border/50">
                                <p className="text-lg font-bold text-yellow-400 flex items-center justify-center gap-1">
                                    <Coins className="w-4 h-4" />
                                    {editing ? (
                                        <input type="number" min="0" value={tokensBalance} onChange={e => setTokensBalance(e.target.value)} className="w-20 bg-transparent border-b border-yellow-400/40 text-center text-lg font-bold text-yellow-400 focus:outline-none" />
                                    ) : (
                                        user.tokens_balance
                                    )}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5">Token Balance</p>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-3 border border-border/50">
                                <span className={labelCls}>Insurance</span>
                                {editing ? (
                                    <div className="space-y-1.5 mt-1">
                                        <input value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} className={`${inputCls} !py-1.5 text-xs`} placeholder="Provider" />
                                        <input value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)} className={`${inputCls} !py-1.5 text-xs`} placeholder="Policy #" />
                                    </div>
                                ) : (
                                    <p className={`text-xs text-text-secondary mt-1 flex items-center gap-1`}>
                                        <CreditCard className="w-3 h-3 text-text-muted" />
                                        {user.insurance_provider ? `${user.insurance_provider} (${user.insurance_policy_number ?? 'N/A'})` : 'None'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: System */}
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Joined</span>
                                <p className="text-xs text-text-secondary">{formatDate(user.created_at)}</p>
                            </div>
                            <div>
                                <span className={labelCls}>Legal Accepted</span>
                                <p className="text-xs text-text-secondary">{formatDate(user.legal_accepted_at)}</p>
                            </div>
                            <div>
                                <span className={labelCls}>Onboarding</span>
                                <p className={`text-xs font-semibold ${user.onboarding_completed ? 'text-success' : 'text-warning'}`}>
                                    {user.onboarding_completed ? 'Completed' : 'Incomplete'}
                                </p>
                            </div>
                            <div>
                                <span className={labelCls}>User ID</span>
                                <p className="text-[10px] text-text-muted font-mono break-all">{user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-border bg-bg-secondary/30 flex items-center gap-2">
                    {/* Status Change */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Status
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showStatusMenu && (
                            <div className="absolute bottom-full left-0 mb-1 w-40 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10">
                                {STATUSES.map(s => {
                                    const icons: Record<string, React.ReactNode> = {
                                        active: <ShieldCheck className="w-3.5 h-3.5 text-success" />,
                                        pending: <Shield className="w-3.5 h-3.5 text-warning" />,
                                        blocked: <ShieldOff className="w-3.5 h-3.5 text-error" />,
                                        inactive: <ShieldOff className="w-3.5 h-3.5 text-text-muted" />,
                                    };
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChange(s)}
                                            disabled={s === user.status}
                                            className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${s === user.status
                                                ? 'bg-accent-faded text-accent font-semibold'
                                                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                                                }`}
                                        >
                                            {icons[s]}
                                            <span className="capitalize">{s}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Delete */}
                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-error font-medium">Confirm?</span>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-2.5 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:bg-error/80 transition-colors disabled:opacity-50"
                            >
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, Delete'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-error/30 text-xs text-error hover:bg-error-faded transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    )}

                    <div className="flex-1" />

                    {/* Edit / Save */}
                    {editing ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="px-3 py-2 rounded-xl border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary text-xs font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary text-xs font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Animation */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
