'use client';

import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, Plus, X, Send,
    Stethoscope, Pill, BookOpen, CalendarCheck, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchConsultationDetail, submitReportAction } from '@/lib/actions';

type Medication = {
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    notes: string;
};

const EMPTY_MED: Medication = { name: '', dose: '', frequency: '', duration: '', route: 'Oral', notes: '' };

const ROUTES = ['Oral', 'Topical', 'Injectable', 'Inhaled', 'Sublingual', 'Rectal', 'Ophthalmic', 'Otic'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed (PRN)', 'Weekly', 'Once'];

export default function RespondPage() {
    const params = useParams();
    const router = useRouter();
    const consultationId = params.id as string;

    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Form fields
    const [diagnosis, setDiagnosis] = useState('');
    const [icd10, setIcd10] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState('');
    const [medications, setMedications] = useState<Medication[]>([{ ...EMPTY_MED }]);
    const [patientEducation, setPatientEducation] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [followUpTimeframe, setFollowUpTimeframe] = useState('');
    const [doctorNotes, setDoctorNotes] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchConsultationDetail(consultationId);
                setConsultation(data);

                // Pre-fill if report already exists
                if (data?.report) {
                    const r = data.report;
                    setDiagnosis(r.diagnosis || '');
                    setIcd10(r.icd10 || '');
                    setTreatmentPlan(r.treatment_plan || '');
                    setPatientEducation(r.patient_education || '');
                    setFollowUp(r.follow_up || '');
                    setFollowUpTimeframe(r.follow_up_timeframe || '');
                    setDoctorNotes(r.doctor_notes || '');
                    if (r.prescription?.medications?.length) {
                        setMedications(r.prescription.medications);
                    }
                }
            } catch (err) {
                console.error('Load error:', err);
            }
            setLoading(false);
        }
        load();
    }, [consultationId]);

    function addMedication() {
        setMedications(prev => [...prev, { ...EMPTY_MED }]);
    }

    function removeMedication(index: number) {
        setMedications(prev => prev.filter((_, i) => i !== index));
    }

    function updateMedication(index: number, field: keyof Medication, value: string) {
        setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
    }

    async function handleSubmit() {
        setError('');

        if (!diagnosis.trim()) {
            setError('Please enter a primary diagnosis.');
            return;
        }
        if (!treatmentPlan.trim()) {
            setError('Please enter a treatment plan.');
            return;
        }

        setSubmitting(true);
        try {
            const validMeds = medications.filter(m => m.name.trim());

            const report = {
                diagnosis: diagnosis.trim(),
                icd10: icd10.trim(),
                treatment_plan: treatmentPlan.trim(),
                patient_education: patientEducation.trim(),
                follow_up: followUp.trim(),
                follow_up_timeframe: followUpTimeframe.trim(),
                doctor_notes: doctorNotes.trim(),
                submitted_at: new Date().toISOString(),
            };

            const prescription = validMeds.length > 0
                ? { medications: validMeds, prescribed_at: new Date().toISOString() }
                : undefined;

            const result = await submitReportAction(consultationId, report, prescription);

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push(`/dashboard/consultation/${consultationId}`);
                }, 1500);
            }
        } catch {
            setError('Failed to submit report. Please try again.');
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <>
                <Header title="Compose Response" subtitle="Loading..." />
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            </>
        );
    }

    if (success) {
        return (
            <>
                <Header title="Response Submitted" subtitle="Redirecting..." />
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="w-20 h-20 rounded-2xl bg-success-faded flex items-center justify-center mb-4">
                        <Send className="w-10 h-10 text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Report Submitted!</h2>
                    <p className="text-text-muted text-sm">Your medical response has been saved and sent to the patient.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="Compose Response"
                subtitle={consultation?.chief_complaint || 'Medical Response'}
            />

            <div className="p-8 max-w-[900px] mx-auto space-y-6 pb-32">
                {/* Back */}
                <Link
                    href={`/dashboard/consultation/${consultationId}`}
                    className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Case
                </Link>

                {/* AI Summary Preview */}
                {consultation?.ai_summary?.summary && (
                    <div className="glass rounded-2xl p-5 border-l-4 border-purple">
                        <p className="text-xs text-purple font-semibold uppercase tracking-wider mb-2">AI Summary (reference)</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{consultation.ai_summary.summary}</p>
                    </div>
                )}

                {/* Diagnosis Section */}
                <div className="glass rounded-2xl p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Clinical Assessment</h3>
                            <p className="text-xs text-text-muted">Primary diagnosis and classification</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                Primary Diagnosis *
                            </label>
                            <input
                                type="text"
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                                placeholder="e.g. Acne Vulgaris, Mild"
                                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                ICD-10 Code
                            </label>
                            <input
                                type="text"
                                value={icd10}
                                onChange={e => setIcd10(e.target.value)}
                                placeholder="e.g. L70.0"
                                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                            Treatment Plan *
                        </label>
                        <textarea
                            value={treatmentPlan}
                            onChange={e => setTreatmentPlan(e.target.value)}
                            placeholder="Describe the recommended treatment approach..."
                            rows={4}
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Prescription Section */}
                <div className="glass rounded-2xl p-6 animate-fade-in space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-info-faded flex items-center justify-center">
                                <Pill className="w-5 h-5 text-info" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Prescription</h3>
                                <p className="text-xs text-text-muted">{medications.length} medication{medications.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={addMedication}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent text-bg-primary font-semibold hover:shadow-[0_2px_8px_rgba(45,212,191,0.3)] transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>

                    <div className="space-y-3">
                        {medications.map((med, index) => (
                            <div key={index} className="bg-bg-elevated rounded-xl p-4 border border-border space-y-3 relative group">
                                {medications.length > 1 && (
                                    <button
                                        onClick={() => removeMedication(index)}
                                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-error-faded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/20"
                                    >
                                        <X className="w-3.5 h-3.5 text-error" />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={med.name}
                                        onChange={e => updateMedication(index, 'name', e.target.value)}
                                        placeholder="Medication name"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={med.dose}
                                        onChange={e => updateMedication(index, 'dose', e.target.value)}
                                        placeholder="Dose (e.g. 500mg)"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <select
                                        value={med.frequency}
                                        onChange={e => updateMedication(index, 'frequency', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    >
                                        <option value="">Frequency</option>
                                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={med.duration}
                                        onChange={e => updateMedication(index, 'duration', e.target.value)}
                                        placeholder="Duration (e.g. 7 days)"
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    />
                                    <select
                                        value={med.route}
                                        onChange={e => updateMedication(index, 'route', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                    >
                                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <input
                                    type="text"
                                    value={med.notes}
                                    onChange={e => updateMedication(index, 'notes', e.target.value)}
                                    placeholder="Notes (e.g. Take with food)"
                                    className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Patient Education */}
                <div className="glass rounded-2xl p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-faded flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Patient Education</h3>
                            <p className="text-xs text-text-muted">Instructions and advice for the patient</p>
                        </div>
                    </div>

                    <textarea
                        value={patientEducation}
                        onChange={e => setPatientEducation(e.target.value)}
                        placeholder="Provide clear instructions, lifestyle recommendations, warning signs to watch for..."
                        rows={4}
                        className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                    />
                </div>

                {/* Follow-up */}
                <div className="glass rounded-2xl p-6 animate-fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning-faded flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Follow-up</h3>
                            <p className="text-xs text-text-muted">Recommendations for next steps</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
                            placeholder="Follow-up recommendation"
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                        />
                        <input
                            type="text"
                            value={followUpTimeframe}
                            onChange={e => setFollowUpTimeframe(e.target.value)}
                            placeholder="Timeframe (e.g. 2 weeks)"
                            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                        />
                    </div>

                    <textarea
                        value={doctorNotes}
                        onChange={e => setDoctorNotes(e.target.value)}
                        placeholder="Internal notes (not visible to patient)"
                        rows={2}
                        className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-error text-sm px-4 py-3 bg-error-faded rounded-xl border border-[rgba(239,68,68,0.3)]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Submit Bar */}
                <div className="fixed bottom-0 left-[260px] right-0 bg-bg-primary/90 backdrop-blur-xl border-t border-border px-8 py-4">
                    <div className="max-w-[900px] mx-auto flex items-center justify-between">
                        <p className="text-xs text-text-muted">
                            Fields marked with * are required
                        </p>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,212,191,0.4)] transition-all disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting…
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
