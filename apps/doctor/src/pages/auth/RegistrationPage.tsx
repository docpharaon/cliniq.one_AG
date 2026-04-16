import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@cliniqone/i18n';
import { colors, spacing, radius, Stethoscope, Doctor, Brain, Bone, Hospital, User, Key, FileText, AlertTriangle, CheckCircle, Lightbulb, Info, Globe, Send, Refresh, PartyPopper, Edit } from '@cliniqone/ui';
import { supabase, createApplication, uploadApplicationDocument, acceptDisclaimer, submitApplication } from '@cliniqone/api';
import type { ApplicationData } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { DocumentUploader } from '../../components/DocumentUploader';
import { NoInternetOverlay } from '../../components/NoInternetOverlay';

const SPECIALTIES_RAW = [
    { value: 'dermatology', labelKey: 'doctor.specialties.dermatology', Icon: Stethoscope },
    { value: 'family_medicine', labelKey: 'doctor.specialties.family_medicine', Icon: Doctor },
    { value: 'psychiatry', labelKey: 'doctor.specialties.psychiatry', Icon: Brain },
    { value: 'orthopedics', labelKey: 'doctor.specialties.orthopedics', Icon: Bone },
];

const LANGUAGES_RAW = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
    { value: 'fr', label: 'Français' },
    { value: 'ur', label: 'اردو' },
];

const DOCUMENT_TYPES_RAW = [
    { key: 'national_id', labelKey: 'doctor.registration.docs.national_id', required: true },
    { key: 'medical_license', labelKey: 'doctor.registration.docs.medical_license', required: true },
    { key: 'cv', labelKey: 'doctor.registration.docs.cv', required: false },
    { key: 'specialization_cert', labelKey: 'doctor.registration.docs.specialization_cert', required: false },
];

export function RegistrationPage() {
    const navigate = useNavigate();
    const { t, isRTL } = useI18n();
    const { session, clear } = useAuthStore();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Doctor type
    const [doctorType, setDoctorType] = useState<'permanent' | 'locum' | null>(null);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteValid, setInviteValid] = useState<boolean | null>(null);
    const [inviteChecking, setInviteChecking] = useState(false);
    const [inviteSpecialty, setInviteSpecialty] = useState<string | null>(null);

    const STEPS_PERMANENT = [
        t('doctor.registration.steps.type'),
        t('doctor.registration.steps.personal'),
        t('doctor.registration.steps.professional'),
        t('doctor.registration.steps.documents'),
        t('doctor.registration.steps.review')
    ];
    const STEPS_LOCUM = [
        t('doctor.registration.steps.type'),
        t('doctor.registration.steps.invite'),
        t('doctor.registration.steps.personal'),
        t('doctor.registration.steps.professional'),
        t('doctor.registration.steps.documents'),
        t('doctor.registration.steps.review')
    ];

    const steps = doctorType === 'locum' ? STEPS_LOCUM : STEPS_PERMANENT;

    // Form state
    const [form, setForm] = useState<ApplicationData>({
        full_name: '',
        display_name: '',
        email: session?.user?.email || '',
        phone: '',
        license_number: '',
        license_authority: 'SCFHS',
        specialty: 'dermatology',
        sub_specialty: '',
        years_experience: undefined,
        languages: ['en'],
        hospital: '',
        city: '',
        bio: '',
    });

    // Document files (local before upload)
    const [files, setFiles] = useState<Record<string, File | null>>({
        national_id: null,
        medical_license: null,
        cv: null,
        specialization_cert: null,
    });

    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    function updateForm(key: string, value: unknown) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function toggleLanguage(lang: string) {
        setForm(prev => ({
            ...prev,
            languages: prev.languages?.includes(lang)
                ? prev.languages.filter(l => l !== lang)
                : [...(prev.languages || []), lang],
        }));
    }

    // ── Invite code validation ──

    async function checkInviteCode() {
        if (!inviteCode.trim()) { setError(t('common.required')); return; }
        setInviteChecking(true);
        setError('');
        try {
            const { data, error: err } = await supabase
                .from('locum_invitations')
                .select('id, specialty, status, expires_at')
                .eq('invite_code', inviteCode.trim().toUpperCase())
                .single();

            if (err || !data) {
                setInviteValid(false);
                setError(t('doctor.registration.invalidCode'));
                return;
            }
            if (data.status !== 'pending') {
                setInviteValid(false);
                setError(t('doctor.registration.invalidCode')); // Or more specific if added later
                return;
            }
            if (new Date(data.expires_at) < new Date()) {
                setInviteValid(false);
                setError(t('doctor.registration.invalidCode')); // Or more specific
                return;
            }
            setInviteValid(true);
            setInviteSpecialty(data.specialty);
            // Pre-fill specialty from invitation
            updateForm('specialty', data.specialty);
        } catch {
            setInviteValid(false);
            setError('Failed to validate invite code.');
        } finally {
            setInviteChecking(false);
        }
    }

    // ── Step name resolution ──
    // Maps the current step index to a logical step name based on doctor type
    function getStepName(s: number): string {
        return steps[s] || '';
    }

    // ── Validation ──

    function validateStep(s: number): string | null {
        const name = getStepName(s);
        switch (name) {
            case t('doctor.registration.steps.type'):
                if (!doctorType) return t('doctor.registration.howToJoin');
                return null;
            case t('doctor.registration.steps.invite'):
                if (!inviteValid) return t('doctor.registration.invalidCode');
                return null;
            case t('doctor.registration.steps.personal'):
                if (!form.full_name.trim()) return t('common.required');
                if (!form.display_name.trim()) return t('common.required');
                if (!form.email.trim()) return t('common.required');
                return null;
            case t('doctor.registration.steps.professional'):
                if (!form.license_number.trim()) return t('common.required');
                if (!form.license_authority.trim()) return t('common.required');
                return null;
            case t('doctor.registration.steps.documents'):
                if (!files.national_id) return t('common.required');
                if (!files.medical_license) return t('common.required');
                return null;
            case t('doctor.registration.steps.review'):
                if (!disclaimerAccepted) return t('common.required');
                return null;
            default:
                return null;
        }
    }

    function handleNext() {
        const err = validateStep(step);
        if (err) { setError(err); return; }
        setError('');
        setStep(s => s + 1);
    }

    function handleBack() {
        setError('');
        if (step === 1 && doctorType) {
            // Going back from step 1 to type selection — reset type
            setStep(0);
            return;
        }
        setStep(s => s - 1);
    }

    // ── Submit ──

    async function handleSubmit() {
        const err = validateStep(steps.length - 1);
        if (err) { setError(err); return; }
        if (!session?.user) { setError('Session expired'); return; }

        setSubmitting(true);
        setError('');

        try {
            // 1. Create application
            const app = await createApplication(session.user.id, {
                ...form,
                doctor_type: doctorType || 'permanent',
                locum_invite_code: doctorType === 'locum' ? inviteCode.trim().toUpperCase() : undefined,
            });

            // 2. Upload documents
            for (const [type, file] of Object.entries(files)) {
                if (file) {
                    await uploadApplicationDocument(app.id, file, type);
                }
            }

            // 3. Accept disclaimer
            await acceptDisclaimer(app.id);

            // 4. Submit
            await submitApplication(app.id);

            // 5. Redirect to tracker
            await useAuthStore.getState().initialize();
            navigate('/auth/application-status', { replace: true });
        } catch (err: any) {
            console.error('[Registration] Submit error:', err);
            setError(err?.message || t('doctor.auth.loginFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        clear();
        navigate('/auth/landing', { replace: true });
    }

    // ── Render steps ──

    function renderTypeStep() {
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PartyPopper size={20} color={colors.accentTeal} /> {t('doctor.registration.welcomeDoctor')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.howToJoin')}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        style={{
                            ...s.typeCard,
                            ...(doctorType === 'permanent' ? s.typeCardActive : {}),
                        }}
                        onClick={() => { setDoctorType('permanent'); setError(''); }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Hospital size={36} color={colors.accentTeal} /></div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary, marginBottom: 4 }}>
                            {t('doctor.registration.fullTimeDoctor')}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: '18px' }}>
                            {t('doctor.registration.fullTimeDesc')}
                        </div>
                    </button>

                    <button
                        style={{
                            ...s.typeCard,
                            ...(doctorType === 'locum' ? s.typeCardActive : {}),
                        }}
                        onClick={() => { setDoctorType('locum'); setError(''); }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Stethoscope size={36} color={colors.purple} /></div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary, marginBottom: 4 }}>
                            {t('doctor.registration.locumDoctor')}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: '18px' }}>
                            {t('doctor.registration.locumDesc')}
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    function renderInviteStep() {
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Key size={20} color={colors.accentTeal} /> {t('doctor.registration.inviteTitle')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.inviteDesc')}</p>

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.inviteLabel')}</label>
                <div style={{ display: 'flex', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <input
                        style={{ ...s.input, flex: 1, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, fontSize: 18, textAlign: isRTL ? 'right' : 'left' }}
                        value={inviteCode}
                        onChange={e => { setInviteCode(e.target.value); setInviteValid(null); setError(''); }}
                        placeholder={t('doctor.registration.invitePlaceholder')}
                        maxLength={20}
                    />
                    <button
                        style={{
                            ...s.nextBtn,
                            padding: '12px 20px',
                            opacity: inviteChecking ? 0.6 : 1,
                        }}
                        onClick={checkInviteCode}
                        disabled={inviteChecking}
                    >
                        {inviteChecking ? '...' : `✓ ${t('doctor.registration.verify')}`}
                    </button>
                </div>

                {inviteValid === true && (
                    <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: `${colors.success}10`, borderRadius: radius.md, border: `1px solid ${colors.success}30` }}>
                        <span style={{ fontSize: 13, color: colors.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <CheckCircle size={14} color={colors.success} /> 
                            {t('doctor.registration.validInvite', { specialty: SPECIALTIES_RAW.find(sp => sp.value === inviteSpecialty)?.labelKey ? t(SPECIALTIES_RAW.find(sp => sp.value === inviteSpecialty)!.labelKey) : inviteSpecialty })}
                        </span>
                    </div>
                )}

                {inviteValid === false && (
                    <div style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: '#dc262610', borderRadius: radius.md, border: '1px solid #dc262630' }}>
                        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <AlertTriangle size={14} color="#dc2626" /> {error || t('doctor.registration.invalidCode')}
                        </span>
                    </div>
                )}

                <div style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.bgTertiary, borderRadius: radius.md }}>
                    <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary, lineHeight: '18px', textAlign: isRTL ? 'right' : 'left' }}>
                        <Lightbulb size={14} color={colors.accentTeal} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.registration.noCodeHint')}
                    </p>
                </div>
            </div>
        );
    }

    function renderPersonalStep() {
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={20} color={colors.accentTeal} /> {t('doctor.registration.personalInfo')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.tellUsAboutYourslef')}</p>

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.fullName')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.full_name}
                    onChange={e => updateForm('full_name', e.target.value)}
                    placeholder="Dr. Mohammed Ali Hassan"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.displayName')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.display_name}
                    onChange={e => updateForm('display_name', e.target.value)}
                    placeholder="Dr. Mohammed"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.auth.email')} *</label>
                <input
                    style={{ ...s.input, opacity: 0.7, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.email}
                    readOnly
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.phoneNumber')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    placeholder="+966 5X XXX XXXX"
                    type="tel"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.city')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.city}
                    onChange={e => updateForm('city', e.target.value)}
                    placeholder="Riyadh"
                />
            </div>
        );
    }

    function renderProfessionalStep() {
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stethoscope size={20} color={colors.accentTeal} /> {t('doctor.registration.professionalDetails')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.credentials')}</p>

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.specialty')} *</label>
                {/* If locum, specialty is pre-filled from invite and locked */}
                {doctorType === 'locum' && inviteSpecialty ? (
                    <div style={{ ...s.input, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <span>{SPECIALTIES_RAW.find(sp => sp.value === form.specialty)?.labelKey ? t(SPECIALTIES_RAW.find(sp => sp.value === form.specialty)!.labelKey) : form.specialty}</span>
                        <span style={{ fontSize: 10, color: colors.textTertiary }}>({t('doctor.registration.inviteTitle')})</span>
                    </div>
                ) : (
                    <div style={s.specialtyGrid}>
                        {SPECIALTIES_RAW.map(sp => (
                            <button
                                key={sp.value}
                                style={{
                                    ...s.specialtyBtn,
                                    ...(form.specialty === sp.value ? s.specialtyBtnActive : {}),
                                    textAlign: isRTL ? 'right' : 'left',
                                }}
                                onClick={() => updateForm('specialty', sp.value)}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}><sp.Icon size={14} color={form.specialty === sp.value ? colors.accentTeal : colors.textSecondary} /> {t(sp.labelKey)}</span>
                            </button>
                        ))}
                    </div>
                )}

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.licenseNumber')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.license_number}
                    onChange={e => updateForm('license_number', e.target.value)}
                    placeholder="e.g. 12345678"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.licenseAuthority')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.license_authority}
                    onChange={e => updateForm('license_authority', e.target.value)}
                    placeholder="SCFHS"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.subspecialty')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.sub_specialty}
                    onChange={e => updateForm('sub_specialty', e.target.value)}
                    placeholder="e.g. Pediatric Dermatology"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.experience')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    type="number"
                    min={0}
                    max={60}
                    value={form.years_experience ?? ''}
                    onChange={e => updateForm('years_experience', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g. 8"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.hospital')}</label>
                <input
                    style={{ ...s.input, textAlign: isRTL ? 'right' : 'left' }}
                    value={form.hospital}
                    onChange={e => updateForm('hospital', e.target.value)}
                    placeholder="e.g. King Fahad Medical City"
                />

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.languages')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    {LANGUAGES_RAW.map(lang => (
                        <button
                            key={lang.value}
                            style={{
                                ...s.langBtn,
                                ...(form.languages?.includes(lang.value) ? s.langBtnActive : {}),
                            }}
                            onClick={() => toggleLanguage(lang.value)}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>

                <label style={{ ...s.label, textAlign: isRTL ? 'right' : 'left' }}>{t('doctor.registration.bio')}</label>
                <textarea
                    style={{ ...s.input, minHeight: 80, resize: 'vertical', textAlign: isRTL ? 'right' : 'left' }}
                    value={form.bio}
                    onChange={e => updateForm('bio', e.target.value)}
                    placeholder={t('doctor.registration.bioPlaceholder')}
                />
            </div>
        );
    }

    function renderDocumentsStep() {
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={20} color={colors.accentTeal} /> {t('doctor.registration.documentsTitle')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.documentsDesc')}</p>

                {DOCUMENT_TYPES_RAW.map(dt => (
                    <DocumentUploader
                        key={dt.key}
                        label={`${t(dt.labelKey)}${dt.required ? ' *' : ''}`}
                        documentType={dt.key}
                        file={files[dt.key]}
                        onFileSelect={(f) => setFiles(prev => ({ ...prev, [dt.key]: f }))}
                        onRemove={() => setFiles(prev => ({ ...prev, [dt.key]: null }))}
                    />
                ))}
            </div>
        );
    }

    function renderReviewStep() {
        const typeLabel = doctorType === 'locum' ? t('doctor.registration.locumDoctor') : t('doctor.registration.fullTimeDoctor');
        return (
            <div style={{ ...s.stepContent, textAlign: isRTL ? 'right' : 'left' }}>
                <h2 style={{ ...s.stepTitle, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={20} color={colors.success} /> {t('doctor.registration.reviewTitle')}
                </h2>
                <p style={s.stepSubtitle}>{t('doctor.registration.reviewDesc')}</p>

                {/* Summary card */}
                <div style={{ ...s.summaryCard, textAlign: isRTL ? 'right' : 'left' }}>
                    <div style={s.summarySection}>
                        <h3 style={s.summaryLabel}>{t('doctor.registration.steps.type')}</h3>
                        <p style={s.summaryValue}>{typeLabel}</p>
                        {doctorType === 'locum' && (
                            <p style={s.summaryMuted}>{t('doctor.registration.inviteLabel')} {inviteCode.toUpperCase()}</p>
                        )}
                    </div>
                    <div style={s.divider} />
                    <div style={s.summarySection}>
                        <h3 style={s.summaryLabel}>{t('doctor.registration.personalInfo')}</h3>
                        <p style={s.summaryValue}>{form.full_name}</p>
                        <p style={s.summaryMuted}>{form.email} {form.phone ? `• ${form.phone}` : ''}</p>
                        {form.city && <p style={s.summaryMuted}><Globe size={12} color={colors.textTertiary} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {form.city}</p>}
                    </div>
                    <div style={s.divider} />
                    <div style={s.summarySection}>
                        <h3 style={s.summaryLabel}>{t('doctor.registration.professionalDetails')}</h3>
                        <p style={s.summaryValue}>
                            {SPECIALTIES_RAW.find(sp => sp.value === form.specialty)?.labelKey ? t(SPECIALTIES_RAW.find(sp => sp.value === form.specialty)!.labelKey) : form.specialty}
                        </p>
                        <p style={s.summaryMuted}>{t('doctor.registration.licenseNumber')} {form.license_number} ({form.license_authority})</p>
                        {form.years_experience && <p style={s.summaryMuted}>{form.years_experience} {t('doctor.registration.experience')}</p>}
                        {form.hospital && <p style={{ ...s.summaryMuted, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 4 }}><Hospital size={12} color={colors.textTertiary} /> {form.hospital}</p>}
                    </div>
                    <div style={s.divider} />
                    <div style={s.summarySection}>
                        <h3 style={s.summaryLabel}>{t('doctor.registration.documentsTitle')}</h3>
                        {Object.entries(files).filter(([, f]) => f).map(([type, f]) => (
                            <p key={type} style={{ ...s.summaryMuted, flexDirection: isRTL ? 'row-reverse' : 'row', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={12} color={colors.success} /> 
                                {DOCUMENT_TYPES_RAW.find(d => d.key === type)?.labelKey ? t(DOCUMENT_TYPES_RAW.find(d => d.key === type)!.labelKey) : type} — {f!.name}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Locum info */}
                {doctorType === 'locum' && (
                    <div style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: `${colors.accentTeal}08`, border: `1px solid ${colors.accentTeal}20`, borderRadius: radius.lg }}>
                        <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary, lineHeight: '18px', textAlign: isRTL ? 'right' : 'left' }}>
                            <Info size={14} color={colors.accentTeal} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.registration.locumValidityMsg')}
                        </p>
                    </div>
                )}

                {/* Disclaimer */}
                <div style={s.disclaimerCard}>
                    <label style={{ ...s.disclaimerRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <input
                            type="checkbox"
                            checked={disclaimerAccepted}
                            onChange={e => setDisclaimerAccepted(e.target.checked)}
                            style={{ width: 20, height: 20, accentColor: colors.accentTeal }}
                        />
                        <span style={{ fontSize: 13, color: colors.textSecondary, lineHeight: '18px', textAlign: isRTL ? 'right' : 'left' }}>
                            {t('doctor.registration.confirmAccurate')}
                        </span>
                    </label>
                </div>
            </div>
        );
    }

    // ── Map step index to render function ──
    function renderCurrentStep() {
        const name = getStepName(step);
        switch (name) {
            case t('doctor.registration.steps.type'): return renderTypeStep();
            case t('doctor.registration.steps.invite'): return renderInviteStep();
            case t('doctor.registration.steps.personal'): return renderPersonalStep();
            case t('doctor.registration.steps.professional'): return renderProfessionalStep();
            case t('doctor.registration.steps.documents'): return renderDocumentsStep();
            case t('doctor.registration.steps.review'): return renderReviewStep();
            default: return null;
        }
    }

    return (
        <div style={s.container}>
            <div style={s.scrollWrapper}>
                {/* Header */}
                <div style={s.header}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: colors.accentTeal }}>cliniq.one</span>
                    <span style={{ fontSize: 13, color: colors.textSecondary }}>{t('doctor.registration.doctorRegistration')}</span>
                </div>

                {/* Stepper */}
                <div style={{ ...s.stepper, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    {steps.map((label, i) => (
                        <div key={label + i} style={s.stepDot}>
                            <div style={{
                                ...s.dot,
                                ...(i < step ? s.dotDone : i === step ? s.dotActive : {}),
                            }}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: i <= step ? colors.textPrimary : colors.textTertiary,
                                marginTop: 4,
                            }}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <div style={s.formCard}>
                    {renderCurrentStep()}

                    {/* Error */}
                    {error && getStepName(step) !== t('doctor.registration.steps.invite') && (
                        <div style={{ ...s.errorBox, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <span style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}><AlertTriangle size={14} color="#dc2626" /> {error}</span>
                        </div>
                    )}

                    {/* Navigation */}
                    <div style={{ ...s.navRow, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        {step > 0 ? (
                            <button style={s.backBtn} onClick={handleBack}>
                                {isRTL ? 'التالي ←' : '← Back'}
                            </button>
                        ) : (
                            <button style={s.backBtn} onClick={handleLogout}>
                                {isRTL ? 'تسجيل الخروج ←' : '← Sign Out'}
                            </button>
                        )}

                        {step < steps.length - 1 ? (
                            <button style={s.nextBtn} onClick={handleNext}>
                                {isRTL ? '→ التالي' : 'Next →'}
                            </button>
                        ) : (
                            <button
                                style={{ ...s.nextBtn, ...(submitting ? { opacity: 0.6 } : {}) }}
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? '...' : <><Send size={14} color={colors.bgPrimary} style={{ verticalAlign: 'middle', [isRTL ? 'marginLeft' : 'marginRight']: 4 }} /> {t('doctor.registration.submitApplication')}</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.bgPrimary,
    },
    scrollWrapper: {
        flex: 1,
        overflowY: 'auto',
        padding: spacing.lg,
        paddingBottom: 40,
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: spacing.xl,
        gap: 4,
    },
    stepper: {
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginBottom: spacing.xl,
        flexWrap: 'wrap' as const,
    },
    stepDot: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    dot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: colors.bgTertiary,
        color: colors.textTertiary,
        border: `2px solid ${colors.border}`,
        transition: 'all 0.3s ease',
    },
    dotActive: {
        backgroundColor: colors.accentTeal,
        color: colors.bgPrimary,
        borderColor: colors.accentTeal,
        boxShadow: `0 0 12px ${colors.accentTeal}40`,
    },
    dotDone: {
        backgroundColor: colors.success,
        color: '#fff',
        borderColor: colors.success,
    },
    formCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radius.xl,
        padding: spacing.xl,
        border: `1px solid ${colors.border}`,
    },
    stepContent: {
        marginBottom: spacing.lg,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: 700,
        color: colors.textPrimary,
        margin: 0,
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        margin: 0,
        marginBottom: spacing.xl,
    },
    label: {
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: colors.textSecondary,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        marginBottom: 6,
        marginTop: spacing.md,
    },
    input: {
        width: '100%',
        backgroundColor: colors.bgTertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: '12px 16px',
        fontSize: 14,
        color: colors.textPrimary,
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    typeCard: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: spacing.xl,
        borderRadius: radius.xl,
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.bgTertiary,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    typeCardActive: {
        borderColor: colors.accentTeal,
        backgroundColor: `${colors.accentTeal}08`,
        boxShadow: `0 0 16px ${colors.accentTeal}20`,
    },
    specialtyGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: spacing.md,
    },
    specialtyBtn: {
        padding: '12px 16px',
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgTertiary,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'all 0.2s ease',
    },
    specialtyBtnActive: {
        borderColor: colors.accentTeal,
        backgroundColor: `${colors.accentTeal}10`,
        color: colors.accentTeal,
        boxShadow: `0 0 0 1px ${colors.accentTeal}`,
    },
    langBtn: {
        padding: '8px 16px',
        borderRadius: radius.full,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgTertiary,
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
    },
    langBtnActive: {
        borderColor: colors.accentTeal,
        backgroundColor: `${colors.accentTeal}10`,
        color: colors.accentTeal,
    },
    summaryCard: {
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
        marginBottom: spacing.lg,
    },
    summarySection: {
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: 600,
        color: colors.accentTeal,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        margin: 0,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: 600,
        color: colors.textPrimary,
        margin: 0,
    },
    summaryMuted: {
        fontSize: 12,
        color: colors.textSecondary,
        margin: 0,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        margin: `${spacing.md}px 0`,
    },
    disclaimerCard: {
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        border: `1px solid ${colors.border}`,
    },
    disclaimerRow: {
        display: 'flex',
        gap: spacing.md,
        alignItems: 'flex-start',
        cursor: 'pointer',
    },
    errorBox: {
        backgroundColor: '#dc262610',
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    navRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    backBtn: {
        padding: '14px 24px',
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
    },
    nextBtn: {
        padding: '14px 32px',
        borderRadius: radius.md,
        border: 'none',
        backgroundColor: colors.accentTeal,
        color: colors.bgPrimary,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
    },
};
