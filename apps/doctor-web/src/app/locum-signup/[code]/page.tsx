'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    validateInvitation,
    submitLocumSignup,
    uploadLocumDocument,
    finalizeLocumOnboarding,
} from '@/lib/locum-actions';
import {
    CheckCircle, Upload, FileText, Shield, User, Loader2,
    AlertTriangle, ArrowRight, ArrowLeft, Eye, EyeOff,
} from 'lucide-react';

type Step = 'validate' | 'disclaimer' | 'account' | 'documents' | 'done';

export default function LocumSignupPage() {
    const params = useParams();
    const code = (params.code as string)?.toUpperCase() || '';

    // ── State ────────────────────────────────
    const [step, setStep] = useState<Step>('validate');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invitation, setInvitation] = useState<{ id: string; specialty: string } | null>(null);

    // Account form
    const [fullName, setFullName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    // After signup
    const [doctorId, setDoctorId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Documents
    const [nationalId, setNationalId] = useState<File | null>(null);
    const [medicalLicense, setMedicalLicense] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

    // ── Validate Invitation ──────────────────
    useEffect(() => {
        async function validate() {
            setLoading(true);
            const res = await validateInvitation(code);
            if (res.valid && res.invitation) {
                setInvitation({ id: res.invitation.id, specialty: res.invitation.specialty });
                setStep('disclaimer');
            } else {
                setError(res.error || 'Invalid invitation');
            }
            setLoading(false);
        }
        if (code) validate();
    }, [code]);

    // ── File Helpers ─────────────────────────
    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // strip data:...;base64,
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ── Submit Account ───────────────────────
    async function handleAccountSubmit() {
        if (!fullName || !displayName || !email || !password) {
            setError('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        setError('');

        const res = await submitLocumSignup({
            inviteCode: code,
            fullName,
            displayName,
            email,
            phone,
            password,
            specialty: invitation?.specialty || 'dermatology',
        });

        if (res.error) {
            setError(res.error);
            setSubmitting(false);
            return;
        }

        setDoctorId(res.doctorId!);
        setStep('documents');
        setSubmitting(false);
    }

    // ── Upload Documents ─────────────────────
    async function handleDocumentUpload() {
        setSubmitting(true);
        setError('');

        try {
            if (nationalId) {
                setUploadProgress(p => ({ ...p, national_id: true }));
                const b64 = await fileToBase64(nationalId);
                const res = await uploadLocumDocument(doctorId, 'national_id', nationalId.name, b64, nationalId.size);
                if (res.error) throw new Error(res.error);
                setUploadProgress(p => ({ ...p, national_id: false }));
            }

            if (medicalLicense) {
                setUploadProgress(p => ({ ...p, medical_license: true }));
                const b64 = await fileToBase64(medicalLicense);
                const res = await uploadLocumDocument(doctorId, 'medical_license', medicalLicense.name, b64, medicalLicense.size);
                if (res.error) throw new Error(res.error);
                setUploadProgress(p => ({ ...p, medical_license: false }));
            }

            // Mark as disclaimer signed
            const disclaimerContent = btoa(JSON.stringify({
                accepted: true,
                timestamp: new Date().toISOString(),
                name: fullName,
            }));
            await uploadLocumDocument(doctorId, 'disclaimer_signed', 'disclaimer.json', disclaimerContent, disclaimerContent.length);

            // Finalize onboarding
            await finalizeLocumOnboarding(doctorId);
            setStep('done');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        }

        setSubmitting(false);
    }

    // ── Render ────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
        );
    }

    if (step === 'validate' && error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
                <div className="glass-premium rounded-3xl p-10 max-w-md text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-error mx-auto" />
                    <h1 className="text-2xl font-bold text-text-primary">Invalid Invitation</h1>
                    <p className="text-text-secondary">{error}</p>
                    <p className="text-xs text-text-muted">Code: {code}</p>
                </div>
            </div>
        );
    }

    const stepIndex = ['disclaimer', 'account', 'documents', 'done'].indexOf(step);

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-lg space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-accent">cliniq.one</div>
                    <h1 className="text-xl font-semibold text-text-primary">Locum Doctor Registration</h1>
                    <p className="text-sm text-text-secondary capitalize">
                        Specialty: {invitation?.specialty?.replace('_', ' ')} • Code: {code}
                    </p>
                </div>

                {/* Progress Steps */}
                {step !== 'done' && (
                    <div className="flex items-center justify-center gap-2">
                        {['Disclaimer', 'Account', 'Documents'].map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    i < stepIndex ? 'bg-accent text-bg-primary' :
                                    i === stepIndex ? 'bg-accent/20 text-accent border-2 border-accent' :
                                    'bg-bg-elevated text-text-muted'
                                }`}>
                                    {i < stepIndex ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs font-semibold hidden sm:inline ${i === stepIndex ? 'text-accent' : 'text-text-muted'}`}>{label}</span>
                                {i < 2 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-accent' : 'bg-bg-elevated'}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && step !== 'validate' && (
                    <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* ── Step 1: Disclaimer ── */}
                {step === 'disclaimer' && (
                    <div className="glass-premium rounded-2xl p-6 space-y-5 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-accent" />
                            <h2 className="text-lg font-bold text-text-primary">Terms & Disclaimer</h2>
                        </div>

                        <div className="bg-bg-elevated rounded-xl p-4 max-h-64 overflow-y-auto text-sm text-text-secondary leading-relaxed space-y-3">
                            <p><strong className="text-text-primary">1. Professional Standards</strong><br />
                            You agree to uphold all professional medical standards and comply with the regulations of your licensing authority while using the cliniq.one platform.</p>
                            <p><strong className="text-text-primary">2. Credential Verification</strong><br />
                            You confirm that all credentials, licenses, and identification documents submitted are authentic, valid, and current. Falsification will result in immediate account termination.</p>
                            <p><strong className="text-text-primary">3. Data Responsibility</strong><br />
                            cliniq.one operates a zero-retention policy for patient medical data. You acknowledge that you are responsible for maintaining your own clinical records as required by law.</p>
                            <p><strong className="text-text-primary">4. Account Terms</strong><br />
                            Locum accounts require weekly credential renewal by the administrator. Your account may be suspended if credentials expire. Only patients who select you directly will be routed to your queue.</p>
                            <p><strong className="text-text-primary">5. Platform Fees</strong><br />
                            Consultation fees are token-based. You may set your rate within admin-defined limits. Platform fees and payment terms are outlined in your onboarding agreement.</p>
                            <p><strong className="text-text-primary">6. Liability</strong><br />
                            cliniq.one acts as a platform facilitator. Clinical liability rests with the treating physician. You agree to carry appropriate professional indemnity insurance.</p>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={disclaimerAccepted}
                                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded accent-accent"
                            />
                            <span className="text-sm text-text-secondary">
                                I have read, understood, and agree to the above terms and conditions. I confirm that I am a licensed medical professional.
                            </span>
                        </label>

                        <button
                            onClick={() => setStep('account')}
                            disabled={!disclaimerAccepted}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm disabled:opacity-30 hover:bg-accent-dark transition-all"
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── Step 2: Account Details ── */}
                {step === 'account' && (
                    <div className="glass-premium rounded-2xl p-6 space-y-5 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <User className="w-6 h-6 text-accent" />
                            <h2 className="text-lg font-bold text-text-primary">Account Details</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Full Name *</label>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Dr. John Smith"
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Display Name *</label>
                                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Dr. Smith"
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Email *</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="doctor@email.com"
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Phone</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+966 5XX XXX XXXX"
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Password *</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none transition-colors pr-10" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep('disclaimer')}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button onClick={handleAccountSubmit} disabled={submitting || !fullName || !displayName || !email || !password}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm disabled:opacity-30 hover:bg-accent-dark transition-all">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                {submitting ? 'Creating Account...' : 'Create Account & Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Document Upload ── */}
                {step === 'documents' && (
                    <div className="glass-premium rounded-2xl p-6 space-y-5 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <Upload className="w-6 h-6 text-accent" />
                            <h2 className="text-lg font-bold text-text-primary">Upload Documents</h2>
                        </div>
                        <p className="text-sm text-text-secondary">Upload your identification and medical license for verification.</p>

                        <div className="space-y-4">
                            {/* National ID */}
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">National ID / Passport *</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent transition-colors">
                                        <FileText className="w-5 h-5 text-text-muted" />
                                        <span className="text-sm text-text-secondary truncate">
                                            {nationalId ? nationalId.name : 'Choose file...'}
                                        </span>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setNationalId(e.target.files?.[0] || null)} />
                                    </label>
                                    {uploadProgress.national_id && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
                                </div>
                            </div>

                            {/* Medical License */}
                            <div className="bg-bg-elevated rounded-xl p-4">
                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Medical License *</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent transition-colors">
                                        <FileText className="w-5 h-5 text-text-muted" />
                                        <span className="text-sm text-text-secondary truncate">
                                            {medicalLicense ? medicalLicense.name : 'Choose file...'}
                                        </span>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setMedicalLicense(e.target.files?.[0] || null)} />
                                    </label>
                                    {uploadProgress.medical_license && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDocumentUpload}
                            disabled={submitting || !nationalId || !medicalLicense}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm disabled:opacity-30 hover:bg-accent-dark transition-all"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {submitting ? 'Uploading...' : 'Submit Documents for Review'}
                        </button>
                    </div>
                )}

                {/* ── Step 4: Done ── */}
                {step === 'done' && (
                    <div className="glass-premium rounded-2xl p-10 text-center space-y-5 animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary">Application Submitted!</h2>
                        <p className="text-text-secondary">
                            Your locum doctor application is now under review. The admin team will verify your credentials and activate your account.
                        </p>
                        <div className="bg-bg-elevated rounded-xl p-4 text-sm text-text-secondary space-y-1">
                            <p>📧 You&apos;ll be notified at <strong className="text-text-primary">{email}</strong></p>
                            <p>⏱ Typical review time: <strong className="text-text-primary">24 hours</strong></p>
                        </div>
                        <a
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/10 text-accent font-semibold text-sm hover:bg-accent/20 transition-all"
                        >
                            Go to Doctor Login
                        </a>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-text-muted">
                    cliniq.one — Secure Telehealth Platform
                </p>
            </div>
        </div>
    );
}
