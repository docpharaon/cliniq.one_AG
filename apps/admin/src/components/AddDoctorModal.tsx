'use client';

import { useState } from 'react';
import { X, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { addDoctor } from '@/lib/actions';

type DoctorForm = {
    email: string;
    password: string;
    phone: string;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: 'dermatology' | 'family_medicine';
    sub_specialty: string;
    years_experience: string;
    languages: string[];
    hospital: string;
    city: string;
    bio: string;
    daily_limit: string;
    is_accepting: boolean;
    doctor_type: 'permanent' | 'locum';
};

type Props = {
    onClose: () => void;
    onSaved: () => void;
};

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

const LICENSE_AUTHORITIES = [
    'Saudi Commission for Health Specialties (SCFHS)',
    'Dubai Health Authority (DHA)',
    'Health Authority Abu Dhabi (HAAD)',
    'Ministry of Health (MOH)',
    'Other',
];

const initialForm: DoctorForm = {
    email: '',
    password: '',
    phone: '',
    full_name: '',
    display_name: '',
    license_number: '',
    license_authority: LICENSE_AUTHORITIES[0],
    specialty: 'dermatology',
    sub_specialty: '',
    years_experience: '',
    languages: ['en'],
    hospital: '',
    city: '',
    bio: '',
    daily_limit: '8',
    is_accepting: true,
    doctor_type: 'permanent',
};

export default function AddDoctorModal({ onClose, onSaved }: Props) {
    const [form, setForm] = useState<DoctorForm>(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    function updateField<K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    }

    function toggleLanguage(lang: string) {
        setForm(prev => {
            const has = prev.languages.includes(lang);
            return {
                ...prev,
                languages: has
                    ? prev.languages.filter(l => l !== lang)
                    : [...prev.languages, lang],
            };
        });
    }

    async function handleSave() {
        // Validation
        if (!form.email.trim()) { setError('Email is required'); return; }
        if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        if (!form.full_name.trim()) { setError('Full name is required'); return; }
        if (!form.display_name.trim()) { setError('Display name is required'); return; }
        if (!form.license_number.trim()) { setError('License number is required'); return; }
        if (!form.license_authority.trim()) { setError('License authority is required'); return; }

        setSaving(true);
        setError('');
        try {
            const res = await addDoctor({
                email: form.email.trim(),
                password: form.password,
                phone: form.phone.trim() || undefined,
                full_name: form.full_name.trim(),
                display_name: form.display_name.trim(),
                license_number: form.license_number.trim(),
                license_authority: form.license_authority.trim(),
                specialty: form.specialty,
                sub_specialty: form.sub_specialty.trim() || undefined,
                years_experience: form.years_experience ? parseInt(form.years_experience, 10) : undefined,
                languages: form.languages.length > 0 ? form.languages : ['en'],
                hospital: form.hospital.trim() || undefined,
                city: form.city.trim() || undefined,
                bio: form.bio.trim() || undefined,
                daily_limit: form.daily_limit ? parseInt(form.daily_limit, 10) : 8,
                is_accepting: form.is_accepting,
                doctor_type: form.doctor_type,
            });
            if (res.error) throw new Error(res.error);
            setSuccess('Doctor created successfully!');
            setTimeout(() => { onSaved(); onClose(); }, 800);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create doctor');
        }
        setSaving(false);
    }

    const inputCls = 'w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all';
    const labelCls = 'text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                style={{ pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-[720px] max-h-[92vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in"
                style={{
                    pointerEvents: 'auto',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FA 100%)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
                }}
            >
                {/* ── Header ──────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent-faded flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Add New Doctor</h3>
                            <p className="text-xs text-text-muted">Create a new doctor account with credentials</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Body ────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Section: Account Credentials */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</span>
                            Account Credentials
                        </h4>

                        {/* Doctor Type Toggle */}
                        <div className="mb-4">
                            <label className={labelCls}>Doctor Type <span className="text-error">*</span></label>
                            <div className="flex gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => updateField('doctor_type', 'permanent')}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${form.doctor_type === 'permanent'
                                        ? 'bg-accent-faded border-accent/40 text-accent'
                                        : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    🟢 Permanent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField('doctor_type', 'locum')}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${form.doctor_type === 'locum'
                                        ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                                        : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    🟡 Locum (Temporary)
                                </button>
                            </div>
                            {form.doctor_type === 'locum' && (
                                <div className="mt-2 px-3 py-2 rounded-lg text-[11px] text-yellow-400/80" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                    ⚠ Locum doctors are sandboxed — only patients who enter their code/QR can consult them. Credentials expire in 7 days and require admin renewal.
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Email <span className="text-error">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => updateField('email', e.target.value)}
                                    placeholder="doctor@cliniq.one"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Temporary Password <span className="text-error">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => updateField('password', e.target.value)}
                                        placeholder="Min 6 characters"
                                        className={`${inputCls} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-text-muted mt-1.5">Doctor will be required to change this on first login.</p>
                            </div>
                            <div>
                                <label className={labelCls}>Phone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => updateField('phone', e.target.value)}
                                    placeholder="+966 5XX XXX XXXX"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50" />

                    {/* Section: Personal Information */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">2</span>
                            Personal Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Full Name <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => updateField('full_name', e.target.value)}
                                    placeholder="Dr. Ahmed Al-Rashid"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Display Name <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.display_name}
                                    onChange={e => updateField('display_name', e.target.value)}
                                    placeholder="Dr. Al-Rashid"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>City</label>
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={e => updateField('city', e.target.value)}
                                    placeholder="Riyadh"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Hospital / Clinic</label>
                                <input
                                    type="text"
                                    value={form.hospital}
                                    onChange={e => updateField('hospital', e.target.value)}
                                    placeholder="King Faisal Specialist Hospital"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50" />

                    {/* Section: Medical Credentials */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">3</span>
                            Medical Credentials
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Specialty <span className="text-error">*</span>
                                </label>
                                <select
                                    value={form.specialty}
                                    onChange={e => updateField('specialty', e.target.value as DoctorForm['specialty'])}
                                    className={`${inputCls} appearance-none cursor-pointer`}
                                >
                                    {SPECIALTIES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Sub-Specialty</label>
                                <input
                                    type="text"
                                    value={form.sub_specialty}
                                    onChange={e => updateField('sub_specialty', e.target.value)}
                                    placeholder="e.g. Cosmetic Dermatology"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    License Number <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.license_number}
                                    onChange={e => updateField('license_number', e.target.value)}
                                    placeholder="SCFHS-12345"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    License Authority <span className="text-error">*</span>
                                </label>
                                <select
                                    value={form.license_authority}
                                    onChange={e => updateField('license_authority', e.target.value)}
                                    className={`${inputCls} appearance-none cursor-pointer`}
                                >
                                    {LICENSE_AUTHORITIES.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Years of Experience</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={form.years_experience}
                                    onChange={e => updateField('years_experience', e.target.value)}
                                    placeholder="10"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Daily Consultation Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={form.daily_limit}
                                    onChange={e => updateField('daily_limit', e.target.value)}
                                    placeholder="8"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50" />

                    {/* Section: Languages & Settings */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">4</span>
                            Languages & Settings
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Languages Spoken</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {LANGUAGES.map(lang => {
                                        const selected = form.languages.includes(lang.value);
                                        return (
                                            <button
                                                key={lang.value}
                                                type="button"
                                                onClick={() => toggleLanguage(lang.value)}
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
                            </div>
                            <div className="flex items-center gap-3">
                                <label className={`${labelCls} mb-0`}>Accepting Patients</label>
                                <button
                                    type="button"
                                    onClick={() => updateField('is_accepting', !form.is_accepting)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-all ${form.is_accepting
                                        ? 'bg-success-faded border-success/30 text-success'
                                        : 'bg-bg-elevated border-border text-text-muted'
                                        }`}
                                >
                                    {form.is_accepting ? '● Yes' : '○ No'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50" />

                    {/* Bio */}
                    <div>
                        <label className={labelCls}>Bio / About</label>
                        <textarea
                            value={form.bio}
                            onChange={e => updateField('bio', e.target.value)}
                            placeholder="Brief professional biography..."
                            rows={3}
                            className={`${inputCls} resize-y`}
                        />
                    </div>
                </div>

                {/* ── Footer ──────────────────────── */}
                <div className="px-6 py-4 border-t border-border bg-bg-secondary/30 flex items-center justify-between">
                    <div>
                        {error && (
                            <span className="text-xs text-error font-medium max-w-[300px] truncate block">{error}</span>
                        )}
                        {success && (
                            <span className="text-xs text-success font-medium">{success}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            {saving ? 'Creating...' : 'Create Doctor'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scale-in animation */}
            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
