'use client';

import { useState, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const SPECIALTIES = [
    'General Practice / Family Medicine',
    'Dermatology',
    'Internal Medicine',
    'Pediatrics',
    'Psychiatry',
    'Obstetrics & Gynecology',
    'Ophthalmology',
    'ENT (Otolaryngology)',
    'Orthopedics',
    'Cardiology',
    'Endocrinology',
    'Neurology',
    'Urology',
    'Emergency Medicine',
    'Other',
];

export default function TesterSignup() {
    const { t } = useI18n();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [role, setRole] = useState('');
    const [country, setCountry] = useState('');
    const [fileName, setFileName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setFileName('');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError(t('signup.file_too_large'));
            e.target.value = '';
            setFileName('');
            return;
        }
        setFileName(file.name);
        setError('');
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const data = new FormData(e.currentTarget);
        const selectedRole = data.get('role') as string;

        const payload: Record<string, string | null> = {
            name: data.get('name') as string,
            email: data.get('email') as string,
            role: selectedRole,
            message: (data.get('message') as string) || null,
        };

        // Doctor / Both fields
        if (selectedRole === 'Doctor' || selectedRole === 'Both') {
            payload.country = data.get('country') as string;
            payload.license_type = data.get('license_type') as string;
            payload.license_number = (data.get('license_number') as string) || null;
            payload.specialty = (data.get('specialty') as string) || null;

            // File upload
            const file = fileRef.current?.files?.[0];
            if (file) {
                try {
                    payload.credential_file = await fileToBase64(file);
                } catch {
                    console.warn('Could not read file');
                }
            }
        }

        // Investor fields
        if (selectedRole === 'Investor') {
            payload.linkedin_url = data.get('linkedin_url') as string;
            payload.organization = (data.get('organization') as string) || null;
            payload.portfolio_url = (data.get('portfolio_url') as string) || null;
            payload.preferred_call_time = (data.get('preferred_call_time') as string) || null;
        }

        // Patient motivation
        if (selectedRole === 'Patient') {
            payload.motivation = (data.get('motivation') as string) || null;
        }

        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/register-tester`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Request failed (${res.status})`);
            }

            setSubmitted(true);
        } catch (err) {
            console.error('Tester signup error:', err);
            setError(err instanceof Error ? err.message : t('signup.error_generic'));
        } finally {
            setLoading(false);
        }
    };

    // License types by country
    const licenseTypes = country === 'SA'
        ? [{ value: 'SCFHS', label: t('signup.license_scfhs') }]
        : country === 'AE'
            ? [
                { value: 'DHA', label: t('signup.license_dha') },
                { value: 'DOH', label: t('signup.license_doh') },
                { value: 'MOH', label: t('signup.license_moh') },
            ]
            : [];

    const inputClass = 'w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent focus:outline-none text-text-primary placeholder:text-text-muted transition-colors';
    const labelClass = 'block text-sm font-medium text-text-secondary mb-2';

    return (
        <section id="tester-signup" className="py-24 sm:py-32">
            <div className="max-w-3xl mx-auto px-6">
                <div className="reveal glass-strong rounded-3xl p-8 sm:p-12 glow-teal-strong">
                    {!submitted ? (
                        <>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">{t('signup.tag')}</span>
                                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                                    {t('signup.h2_1')} <span className="gradient-text">{t('signup.h2_2')}</span>
                                </h2>
                                <p className="text-text-secondary">{t('signup.sub')}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* ── Base Info ── */}
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="name" className={labelClass}>{t('signup.name')}</label>
                                        <input id="name" name="name" type="text" required placeholder={t('signup.name_ph')} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className={labelClass}>{t('signup.email')}</label>
                                        <input id="email" name="email" type="email" required placeholder={t('signup.email_ph')} className={inputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="role" className={labelClass}>{t('signup.role')}</label>
                                    <select
                                        id="role"
                                        name="role"
                                        required
                                        value={role}
                                        onChange={(e) => { setRole(e.target.value); setCountry(''); setFileName(''); setError(''); }}
                                        className={`${inputClass} appearance-none`}
                                    >
                                        <option value="">{t('signup.role_default')}</option>
                                        <option value="Patient">{t('signup.role_patient')}</option>
                                        <option value="Doctor">{t('signup.role_doctor')}</option>
                                        <option value="Both">{t('signup.role_both')}</option>
                                        <option value="Investor">{t('signup.role_investor')}</option>
                                    </select>
                                </div>

                                {/* ── Role-Specific Sections ── */}

                                {/* PATIENT */}
                                {role === 'Patient' && (
                                    <div className="space-y-4 p-5 rounded-2xl bg-accent/[0.04] border border-accent/10 animate-fadeIn">
                                        <div className="flex items-center gap-2 text-sm text-accent font-medium mb-1">
                                            <span className="text-lg">🧑‍🤝‍🧑</span> {t('signup.patient_section_title')}
                                        </div>
                                        <p className="text-xs text-text-muted">{t('signup.patient_info')}</p>
                                        <div>
                                            <label htmlFor="motivation" className={labelClass}>{t('signup.motivation')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                            <textarea id="motivation" name="motivation" rows={2} placeholder={t('signup.motivation_ph')} className={`${inputClass} resize-none`} />
                                        </div>
                                    </div>
                                )}

                                {/* DOCTOR / BOTH */}
                                {(role === 'Doctor' || role === 'Both') && (
                                    <div className="space-y-4 p-5 rounded-2xl bg-accent/[0.04] border border-accent/10 animate-fadeIn">
                                        <div className="flex items-center gap-2 text-sm text-accent font-medium mb-1">
                                            <span className="text-lg">👨‍⚕️</span> {t('signup.doctor_section_title')}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="country" className={labelClass}>{t('signup.country')}</label>
                                                <select
                                                    id="country"
                                                    name="country"
                                                    required
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value)}
                                                    className={`${inputClass} appearance-none`}
                                                >
                                                    <option value="">{t('signup.country_default')}</option>
                                                    <option value="SA">🇸🇦 {t('signup.country_sa')}</option>
                                                    <option value="AE">🇦🇪 {t('signup.country_ae')}</option>
                                                </select>
                                            </div>

                                            {country && (
                                                <div>
                                                    <label htmlFor="license_type" className={labelClass}>{t('signup.license_type')}</label>
                                                    <select id="license_type" name="license_type" required className={`${inputClass} appearance-none`}>
                                                        <option value="">{t('signup.license_default')}</option>
                                                        {licenseTypes.map(lt => (
                                                            <option key={lt.value} value={lt.value}>{lt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="license_number" className={labelClass}>{t('signup.license_number')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                                <input id="license_number" name="license_number" type="text" placeholder={t('signup.license_number_ph')} className={inputClass} />
                                            </div>
                                            <div>
                                                <label htmlFor="specialty" className={labelClass}>{t('signup.specialty')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                                <select id="specialty" name="specialty" className={`${inputClass} appearance-none`}>
                                                    <option value="">{t('signup.specialty_default')}</option>
                                                    {SPECIALTIES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* File Upload */}
                                        <div>
                                            <label className={labelClass}>{t('signup.credential_upload')}</label>
                                            <div
                                                className="relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-bg-tertiary/50 transition-colors cursor-pointer group"
                                                onClick={() => fileRef.current?.click()}
                                            >
                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                {fileName ? (
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="text-2xl">📎</span>
                                                        <div>
                                                            <p className="text-text-primary font-medium">{fileName}</p>
                                                            <p className="text-text-muted text-xs">{t('signup.file_click_change')}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-3xl mb-2 opacity-40 group-hover:opacity-70 transition-opacity">📄</span>
                                                        <p className="text-sm text-text-muted">{t('signup.file_drop')}</p>
                                                        <p className="text-xs text-text-muted mt-1">{t('signup.file_formats')}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/[0.06] border border-accent/15">
                                            <span className="text-sm mt-0.5">ℹ️</span>
                                            <p className="text-xs text-text-muted">{t('signup.doctor_note')}</p>
                                        </div>
                                    </div>
                                )}

                                {/* INVESTOR */}
                                {role === 'Investor' && (
                                    <div className="space-y-4 p-5 rounded-2xl bg-accent/[0.04] border border-accent/10 animate-fadeIn">
                                        <div className="flex items-center gap-2 text-sm text-accent font-medium mb-1">
                                            <span className="text-lg">💼</span> {t('signup.investor_section_title')}
                                        </div>

                                        <div>
                                            <label htmlFor="linkedin_url" className={labelClass}>{t('signup.linkedin')}</label>
                                            <input
                                                id="linkedin_url"
                                                name="linkedin_url"
                                                type="url"
                                                required
                                                placeholder={t('signup.linkedin_ph')}
                                                pattern="https://(www\.)?linkedin\.com/.*"
                                                title={t('signup.linkedin_title')}
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="organization" className={labelClass}>{t('signup.organization')}</label>
                                                <input id="organization" name="organization" type="text" placeholder={t('signup.organization_ph')} className={inputClass} />
                                            </div>
                                            <div>
                                                <label htmlFor="portfolio_url" className={labelClass}>{t('signup.portfolio')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                                <input id="portfolio_url" name="portfolio_url" type="url" placeholder={t('signup.portfolio_ph')} className={inputClass} />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="preferred_call_time" className={labelClass}>{t('signup.zoom_availability')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                            <textarea
                                                id="preferred_call_time"
                                                name="preferred_call_time"
                                                rows={2}
                                                placeholder={t('signup.zoom_ph')}
                                                className={`${inputClass} resize-none`}
                                            />
                                        </div>

                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/[0.06] border border-accent/15">
                                            <span className="text-sm mt-0.5">ℹ️</span>
                                            <p className="text-xs text-text-muted">{t('signup.investor_note')}</p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Message ── */}
                                <div>
                                    <label htmlFor="message" className={labelClass}>{t('signup.message')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                    <textarea id="message" name="message" rows={3} placeholder={t('signup.message_ph')} className={`${inputClass} resize-none`} />
                                </div>

                                {error && (
                                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-xl text-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {loading ? t('signup.sending') : t('signup.submit')}
                                </button>

                                <p className="text-center text-text-muted text-xs">{t('signup.note')}</p>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-6xl mb-6">🎉</div>
                            <h3 className="text-2xl font-bold mb-3">{t('signup.thanks')}</h3>
                            <p className="text-text-secondary mb-6">
                                {t('signup.thanks_msg')}{' '}
                                <a href="mailto:admin@cliniq.one" className="text-accent hover:underline">admin@cliniq.one</a>
                            </p>
                            <button onClick={() => { setSubmitted(false); setRole(''); setCountry(''); setFileName(''); }} className="px-6 py-3 border border-accent/30 hover:border-accent text-accent rounded-full text-sm font-medium transition-all">
                                {t('signup.another')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
