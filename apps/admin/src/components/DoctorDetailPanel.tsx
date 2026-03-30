'use client';

import { useState } from 'react';
import {
    X, Edit3, Save, Trash2, Shield, ShieldCheck, ShieldAlert, ShieldOff,
    MapPin, Building2, Languages, Star, Clock, Stethoscope, FileText,
    Loader2, AlertTriangle, CheckCircle2, ChevronDown, Key, Eye, EyeOff, Mail
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { editDoctor, removeDoctor, resetDoctorPasswordAction } from '@/lib/actions';

export type DoctorFull = {
    id: string;
    user_id: string;
    email: string | null;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: string;
    sub_specialty: string | null;
    years_experience: number | null;
    languages: string[];
    hospital: string | null;
    city: string | null;
    bio: string | null;
    avatar_url: string | null;
    status: string;
    daily_limit: number;
    rating_avg: number;
    rating_count: number;
    tokens_earned: number;
    is_accepting: boolean;
    must_change_password: boolean;
    verified_at: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
};

type Props = {
    doctor: DoctorFull;
    onClose: () => void;
    onUpdated: () => void;
};

const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    probation: 'info',
    suspended: 'error',
    inactive: 'neutral',
    limited: 'warning',
};

const STATUSES = ['active', 'pending', 'probation', 'suspended', 'inactive', 'limited'] as const;

const SPECIALTIES = [
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'family_medicine', label: 'Family Medicine' },
];

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'fr', label: 'French' },
    { value: 'ur', label: 'Urdu' },
    { value: 'hi', label: 'Hindi' },
];

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export default function DoctorDetailPanel({ doctor, onClose, onUpdated }: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [showResetPw, setShowResetPw] = useState(false);
    const [resettingPw, setResettingPw] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Editable fields
    const [fullName, setFullName] = useState(doctor.full_name);
    const [displayName, setDisplayName] = useState(doctor.display_name);
    const [specialty, setSpecialty] = useState(doctor.specialty);
    const [subSpecialty, setSubSpecialty] = useState(doctor.sub_specialty ?? '');
    const [licenseNumber, setLicenseNumber] = useState(doctor.license_number);
    const [licenseAuthority, setLicenseAuthority] = useState(doctor.license_authority);
    const [yearsExperience, setYearsExperience] = useState(String(doctor.years_experience ?? ''));
    const [hospital, setHospital] = useState(doctor.hospital ?? '');
    const [city, setCity] = useState(doctor.city ?? '');
    const [bio, setBio] = useState(doctor.bio ?? '');
    const [dailyLimit, setDailyLimit] = useState(String(doctor.daily_limit));
    const [langs, setLangs] = useState<string[]>(doctor.languages ?? ['en']);

    function toggleLang(l: string) {
        setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
    }

    async function handleSave() {
        if (!fullName.trim() || !displayName.trim()) { setError('Name fields are required'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await editDoctor(doctor.id, {
                full_name: fullName.trim(),
                display_name: displayName.trim(),
                specialty,
                sub_specialty: subSpecialty.trim() || null,
                license_number: licenseNumber.trim(),
                license_authority: licenseAuthority.trim(),
                years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
                hospital: hospital.trim() || null,
                city: city.trim() || null,
                bio: bio.trim() || null,
                daily_limit: dailyLimit ? parseInt(dailyLimit, 10) : 8,
                languages: langs.length > 0 ? langs : ['en'],
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
            const updates: Record<string, unknown> = { status: newStatus };
            if (newStatus === 'active' && !doctor.verified_at) {
                updates.verified_at = new Date().toISOString();
            }
            const res = await editDoctor(doctor.id, updates);
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
            const res = await removeDoctor(doctor.id);
            if (!res.success) throw new Error(res.error ?? 'Failed to delete');
            setSuccess('Doctor deleted');
            setTimeout(() => { onUpdated(); onClose(); }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
        setDeleting(false);
    }

    async function handleResetPassword() {
        if (!resetPassword || resetPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setResettingPw(true);
        setError('');
        try {
            const res = await resetDoctorPasswordAction(doctor.id, resetPassword);
            if (!res.success) throw new Error(res.error ?? 'Failed to reset password');
            setSuccess('Password reset! Doctor must change it on next login.');
            setResetPassword('');
            setShowResetPassword(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password');
        }
        setResettingPw(false);
    }

    const inputCls = 'w-full bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all';
    const labelCls = 'text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block';
    const valCls = 'text-sm text-text-primary';
    const sectionCls = 'border-t border-border/50 pt-4';

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
                        {getInitials(doctor.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-text-primary truncate">{doctor.display_name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-accent capitalize">{doctor.specialty?.replace('_', ' ')}</span>
                            <StatusBadge
                                label={doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                                variant={statusMap[doctor.status] ?? 'neutral'}
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

                    {/* Section: Personal Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Stethoscope className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-text-primary">Personal Information</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Full Name</span>
                                {editing ? (
                                    <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={valCls}>{doctor.full_name}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Display Name</span>
                                {editing ? (
                                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={valCls}>{doctor.display_name}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>City</span>
                                {editing ? (
                                    <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="City" />
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <MapPin className="w-3.5 h-3.5 text-text-muted" />
                                        {doctor.city || '—'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Hospital</span>
                                {editing ? (
                                    <input value={hospital} onChange={e => setHospital(e.target.value)} className={inputCls} placeholder="Hospital" />
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <Building2 className="w-3.5 h-3.5 text-text-muted" />
                                        {doctor.hospital || '—'}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <span className={labelCls}>Email</span>
                                <p className={`${valCls} flex items-center gap-1`}>
                                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                                    {doctor.email || '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Medical Credentials */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-bold text-text-primary">Medical Credentials</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Specialty</span>
                                {editing ? (
                                    <select value={specialty} onChange={e => setSpecialty(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                        {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                ) : (
                                    <p className={`${valCls} text-accent capitalize`}>{doctor.specialty?.replace('_', ' ')}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Sub-Specialty</span>
                                {editing ? (
                                    <input value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} className={inputCls} placeholder="Sub-specialty" />
                                ) : (
                                    <p className={valCls}>{doctor.sub_specialty || '—'}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>License Number</span>
                                {editing ? (
                                    <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={`${valCls} font-mono text-xs`}>{doctor.license_number}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>License Authority</span>
                                {editing ? (
                                    <input value={licenseAuthority} onChange={e => setLicenseAuthority(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={`${valCls} text-xs`}>{doctor.license_authority}</p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Experience</span>
                                {editing ? (
                                    <input type="number" min="0" max="60" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={`${valCls} flex items-center gap-1`}>
                                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                                        {doctor.years_experience ? `${doctor.years_experience} years` : '—'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <span className={labelCls}>Daily Limit</span>
                                {editing ? (
                                    <input type="number" min="1" max="50" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} className={inputCls} />
                                ) : (
                                    <p className={valCls}>{doctor.daily_limit}/day</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Languages */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Languages className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-text-primary">Languages</span>
                        </div>
                        {editing ? (
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map(lang => {
                                    const selected = langs.includes(lang.value);
                                    return (
                                        <button
                                            key={lang.value}
                                            type="button"
                                            onClick={() => toggleLang(lang.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selected
                                                ? 'bg-accent-faded border-accent/40 text-accent'
                                                : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary hover:border-border/80'
                                                }`}
                                        >
                                            {lang.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {(doctor.languages ?? []).map(l => (
                                    <span key={l} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-faded text-accent border border-accent/20">
                                        {LANGUAGES.find(x => x.value === l)?.label ?? l}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Statistics */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-text-primary">Statistics</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-bg-elevated rounded-xl p-3 text-center border border-border/50">
                                <p className="text-lg font-bold text-yellow-400 flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4" />
                                    {Number(doctor.rating_avg).toFixed(1)}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5">{doctor.rating_count} reviews</p>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-3 text-center border border-border/50">
                                <p className="text-lg font-bold text-accent">{doctor.tokens_earned ?? 0}</p>
                                <p className="text-[10px] text-text-muted mt-0.5">Tokens earned</p>
                            </div>
                            <div className="bg-bg-elevated rounded-xl p-3 text-center border border-border/50">
                                <p className="text-lg font-bold text-text-primary">{doctor.daily_limit}</p>
                                <p className="text-[10px] text-text-muted mt-0.5">Daily limit</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Bio */}
                    <div className={sectionCls}>
                        <span className={labelCls}>Bio</span>
                        {editing ? (
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                rows={3}
                                className={`${inputCls} resize-y`}
                                placeholder="Brief professional biography..."
                            />
                        ) : (
                            <p className="text-sm text-text-secondary">{doctor.bio || 'No bio provided.'}</p>
                        )}
                    </div>

                    {/* Section: Dates */}
                    <div className={sectionCls}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className={labelCls}>Joined</span>
                                <p className="text-xs text-text-secondary">{formatDate(doctor.created_at)}</p>
                            </div>
                            <div>
                                <span className={labelCls}>Verified</span>
                                <p className="text-xs text-text-secondary">{formatDate(doctor.verified_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Reset Password */}
                    <div className={sectionCls}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-bold text-text-primary">Password</span>
                            </div>
                            {doctor.must_change_password && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/15 text-warning border border-warning/25">
                                    Must change on login
                                </span>
                            )}
                        </div>
                        {showResetPassword ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showResetPw ? 'text' : 'password'}
                                        value={resetPassword}
                                        onChange={e => setResetPassword(e.target.value)}
                                        placeholder="New temporary password (min 6 chars)"
                                        className={`${inputCls} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPw(!showResetPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-text-muted">Doctor will be forced to change this password on their next login.</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={resettingPw}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
                                    >
                                        {resettingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                        {resettingPw ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                    <button
                                        onClick={() => { setShowResetPassword(false); setResetPassword(''); }}
                                        className="px-3 py-2 rounded-xl border border-border text-xs text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowResetPassword(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/10 transition-all"
                            >
                                <Key className="w-3.5 h-3.5" />
                                Reset Password
                            </button>
                        )}
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
                                        probation: <ShieldAlert className="w-3.5 h-3.5 text-info" />,
                                        suspended: <ShieldOff className="w-3.5 h-3.5 text-error" />,
                                        inactive: <ShieldOff className="w-3.5 h-3.5 text-text-muted" />,
                                        limited: <ShieldAlert className="w-3.5 h-3.5 text-warning" />,
                                    };
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChange(s)}
                                            disabled={s === doctor.status}
                                            className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${s === doctor.status
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
