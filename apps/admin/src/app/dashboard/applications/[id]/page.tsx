

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createBrowserSupabase } from '@/lib/supabase';
import {
    fetchApplicationById,
    doMoveToDocumentsReview,
    doScheduleInterview,
    doCompleteInterview,
    doApproveApplication,
    doRejectApplication,
    doRequestResubmission,
    fetchDocumentSignedUrl,
} from '@/lib/actions';
import {
    ArrowLeft, Loader2, Check, X, RotateCcw, Calendar,
    FileText, Eye, Download, Clock, User, Stethoscope,
    MapPin, Languages, Building2, Phone, Mail, Shield,
    CheckCircle2, XCircle, Video, PhoneCall,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type DocApp = {
    id: string;
    user_id: string;
    email: string;
    phone: string | null;
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
    status: string;
    interview_scheduled_at: string | null;
    interview_type: string | null;
    interview_meeting_url: string | null;
    interview_phone_number: string | null;
    interview_notes: string | null;
    interview_completed_at: string | null;
    reviewed_by: string | null;
    review_notes: string | null;
    rejection_reason: string | null;
    resubmission_feedback: string | null;
    disclaimer_accepted_at: string | null;
    submitted_at: string | null;
    created_at: string;
    documents: {
        id: string;
        document_type: string;
        file_name: string;
        storage_path: string;
        file_size_bytes: number | null;
        verified: boolean;
        rejection_reason: string | null;
        uploaded_at: string;
    }[];
    audit: {
        id: string;
        action: string;
        old_status: string | null;
        new_status: string | null;
        metadata: Record<string, unknown>;
        created_at: string;
    }[];
};

const DOC_TYPE_LABELS: Record<string, string> = {
    national_id: '🪪 National ID / Iqama',
    medical_license: '🏥 Medical License',
    cv: '📄 CV / Resume',
    specialization_cert: '🎓 Specialization Certificate',
    disclaimer_signed: '✅ Disclaimer',
    other: '📎 Other',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-bg-elevated', text: 'text-text-muted', label: 'Draft' },
    submitted: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Submitted' },
    documents_review: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Documents Review' },
    interview_scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Interview Scheduled' },
    interview_completed: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Interview Completed' },
    approved: { bg: 'bg-success/20', text: 'text-success', label: 'Approved' },
    rejected: { bg: 'bg-error/20', text: 'text-error', label: 'Rejected' },
    resubmission_requested: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Resubmission Requested' },
};

export default function ApplicationDetailPage() {
    const params = useParams();
    const appId = params.id as string;
    const [adminId, setAdminId] = useState('');
    const [app, setApp] = useState<DocApp | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    // Interview form
    const [showInterview, setShowInterview] = useState(false);
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewTime, setInterviewTime] = useState('');
    const [interviewType, setInterviewType] = useState<'video_call' | 'phone_call'>('video_call');
    const [meetingUrl, setMeetingUrl] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [interviewNotes, setInterviewNotes] = useState('');

    useEffect(() => {
        const sb = createBrowserSupabase();
        sb.auth.getSession().then(({ data }) => setAdminId(data.session?.user?.id || ''));
    }, []);

    const loadApp = useCallback(async () => {
        setLoading(true);
        const result = await fetchApplicationById(appId);
        setApp(result as DocApp);
        setLoading(false);
    }, [appId]);

    useEffect(() => { loadApp(); }, [loadApp]);

    async function handleMoveToReview() {
        setActing(true);
        await doMoveToDocumentsReview(appId, adminId);
        await loadApp();
        setActing(false);
    }

    async function handleScheduleInterview() {
        if (!interviewDate || !interviewTime) return;
        setActing(true);
        const scheduledAt = new Date(`${interviewDate}T${interviewTime}`).toISOString();
        await doScheduleInterview(
            appId, adminId, scheduledAt, interviewType,
            interviewType === 'video_call' ? meetingUrl : undefined,
            interviewType === 'phone_call' ? phoneNumber : undefined,
            interviewNotes || undefined,
        );
        setShowInterview(false);
        await loadApp();
        setActing(false);
    }

    async function handleCompleteInterview() {
        const notes = prompt('Interview notes (optional):');
        setActing(true);
        await doCompleteInterview(appId, adminId, notes || undefined);
        await loadApp();
        setActing(false);
    }

    async function handleApprove() {
        if (!confirm('Approve this doctor? This will create an active doctor account.')) return;
        const notes = prompt('Review notes (optional):');
        setActing(true);
        await doApproveApplication(appId, adminId, notes || undefined);
        await loadApp();
        setActing(false);
    }

    async function handleReject() {
        const reason = prompt('Rejection reason (required):');
        if (!reason) return;
        setActing(true);
        await doRejectApplication(appId, adminId, reason);
        await loadApp();
        setActing(false);
    }

    async function handleRequestResubmit() {
        const feedback = prompt('What changes are needed?');
        if (!feedback) return;
        setActing(true);
        await doRequestResubmission(appId, adminId, feedback);
        await loadApp();
        setActing(false);
    }

    async function handleViewDocument(storagePath: string) {
        const url = await fetchDocumentSignedUrl(storagePath);
        if (url) window.open(url, '_blank');
    }

    if (loading) return (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
    );

    if (!app) return (
        <div className="text-center py-20">
            <p className="text-text-muted">Application not found</p>
            <Link to="/dashboard/applications" className="text-accent text-sm mt-2 inline-block">← Back to Applications</Link>
        </div>
    );

    const statusStyle = STATUS_STYLES[app.status] || STATUS_STYLES.draft;
    const canApprove = ['submitted', 'documents_review', 'interview_completed'].includes(app.status);
    const canSchedule = ['submitted', 'documents_review'].includes(app.status);
    const canReject = !['approved', 'rejected'].includes(app.status);
    const canResubmit = ['submitted', 'documents_review'].includes(app.status);

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/dashboard/applications" className="p-2 rounded-lg hover:bg-bg-elevated transition-colors">
                    <ArrowLeft className="w-5 h-5 text-text-secondary" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-text-primary">{app.display_name}</h1>
                        <span className={`px-3 py-1 rounded-xl ${statusStyle.bg} ${statusStyle.text} text-xs font-bold uppercase`}>
                            {statusStyle.label}
                        </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">{app.full_name} • {app.email}</p>
                </div>
            </div>

            {/* Action Bar */}
            {app.status !== 'approved' && app.status !== 'rejected' && (
                <div className="flex gap-2 flex-wrap p-4 rounded-2xl bg-bg-card border border-border">
                    {app.status === 'submitted' && (
                        <button onClick={handleMoveToReview} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 transition-all disabled:opacity-50">
                            <Eye className="w-4 h-4" /> Start Documents Review
                        </button>
                    )}
                    {canSchedule && (
                        <button onClick={() => setShowInterview(true)} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-semibold hover:bg-purple-500/20 transition-all disabled:opacity-50">
                            <Calendar className="w-4 h-4" /> Schedule Interview
                        </button>
                    )}
                    {app.status === 'interview_scheduled' && (
                        <button onClick={handleCompleteInterview} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-50">
                            <CheckCircle2 className="w-4 h-4" /> Mark Interview Complete
                        </button>
                    )}
                    {canApprove && (
                        <button onClick={handleApprove} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-success/10 text-success text-sm font-semibold hover:bg-success/20 transition-all disabled:opacity-50">
                            <Check className="w-4 h-4" /> Approve
                        </button>
                    )}
                    {canReject && (
                        <button onClick={handleReject} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-all disabled:opacity-50">
                            <X className="w-4 h-4" /> Reject
                        </button>
                    )}
                    {canResubmit && (
                        <button onClick={handleRequestResubmit} disabled={acting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500/10 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-all disabled:opacity-50">
                            <RotateCcw className="w-4 h-4" /> Request Changes
                        </button>
                    )}
                </div>
            )}

            {/* Interview Scheduler Modal */}
            {showInterview && (
                <div className="bg-bg-card border border-purple-500/30 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" /> Schedule Interview
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Date *</label>
                            <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Time *</label>
                            <input type="time" value={interviewTime} onChange={e => setInterviewTime(e.target.value)}
                                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Interview Type</label>
                        <div className="flex gap-3">
                            <button onClick={() => setInterviewType('video_call')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    interviewType === 'video_call'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : 'bg-bg-elevated text-text-secondary border border-border'
                                }`}>
                                <Video className="w-4 h-4" /> Video Call
                            </button>
                            <button onClick={() => setInterviewType('phone_call')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    interviewType === 'phone_call'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : 'bg-bg-elevated text-text-secondary border border-border'
                                }`}>
                                <PhoneCall className="w-4 h-4" /> Phone Call
                            </button>
                        </div>
                    </div>
                    {interviewType === 'video_call' && (
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Meeting URL (Google Meet / Zoom)</label>
                            <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary" />
                        </div>
                    )}
                    {interviewType === 'phone_call' && (
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Phone Number</label>
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                                placeholder="+966 5X XXX XXXX"
                                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary" />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Notes for Doctor</label>
                        <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)}
                            placeholder="e.g., Please have your license documents ready..."
                            className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary min-h-[60px]" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleScheduleInterview} disabled={acting || !interviewDate || !interviewTime}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-semibold text-sm disabled:opacity-50">
                            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                            Schedule & Notify Doctor
                        </button>
                        <button onClick={() => setShowInterview(false)}
                            className="px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Profile + Documents */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <User className="w-5 h-5 text-accent" /> Applicant Profile
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow icon={<User className="w-4 h-4" />} label="Full Name" value={app.full_name} />
                            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={app.email} />
                            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={app.phone || '—'} />
                            <InfoRow icon={<MapPin className="w-4 h-4" />} label="City" value={app.city || '—'} />
                            <InfoRow icon={<Stethoscope className="w-4 h-4" />} label="Specialty" value={app.specialty.replace('_', ' ')} />
                            <InfoRow icon={<Stethoscope className="w-4 h-4" />} label="Sub-Specialty" value={app.sub_specialty || '—'} />
                            <InfoRow icon={<Shield className="w-4 h-4" />} label="License" value={`${app.license_number} (${app.license_authority})`} />
                            <InfoRow icon={<Clock className="w-4 h-4" />} label="Experience" value={app.years_experience ? `${app.years_experience} years` : '—'} />
                            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Hospital" value={app.hospital || '—'} />
                            <InfoRow icon={<Languages className="w-4 h-4" />} label="Languages" value={(app.languages || []).join(', ')} />
                        </div>
                        {app.bio && (
                            <div className="mt-4 p-4 bg-bg-elevated rounded-xl">
                                <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Bio</p>
                                <p className="text-sm text-text-primary whitespace-pre-wrap">{app.bio}</p>
                            </div>
                        )}
                    </div>

                    {/* Documents Card */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <FileText className="w-5 h-5 text-accent" /> Documents ({app.documents?.length || 0})
                        </h3>
                        {(!app.documents || app.documents.length === 0) ? (
                            <p className="text-sm text-text-muted">No documents uploaded</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {app.documents.map(doc => (
                                    <div key={doc.id} className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-text-primary">
                                                {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                                            </span>
                                            {doc.verified ? (
                                                <span className="px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] font-bold">✅ VERIFIED</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">PENDING</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-text-muted truncate" title={doc.file_name}>📎 {doc.file_name}</p>
                                        <p className="text-xs text-text-muted">
                                            {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : '—'} •{' '}
                                            {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                        <button
                                            onClick={() => handleViewDocument(doc.storage_path)}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" /> View / Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Interview Info (if scheduled) */}
                    {app.interview_scheduled_at && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 space-y-3">
                            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-400" /> Interview
                                {app.interview_completed_at && <span className="px-2 py-0.5 rounded-lg bg-success/10 text-success text-[10px] font-bold">COMPLETED</span>}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <InfoRow icon={<Clock className="w-4 h-4" />} label="Date & Time"
                                    value={new Date(app.interview_scheduled_at).toLocaleString('en-US', {
                                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })} />
                                <InfoRow icon={app.interview_type === 'video_call' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                                    label="Type" value={app.interview_type === 'video_call' ? 'Video Call' : 'Phone Call'} />
                            </div>
                            {app.interview_meeting_url && (
                                <a href={app.interview_meeting_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-semibold hover:bg-purple-500/30 transition-all">
                                    <Video className="w-4 h-4" /> Open Meeting Link
                                </a>
                            )}
                            {app.interview_phone_number && (
                                <p className="text-sm text-text-primary">📞 {app.interview_phone_number}</p>
                            )}
                            {app.interview_notes && (
                                <div className="p-3 bg-bg-elevated rounded-xl">
                                    <p className="text-xs text-text-muted mb-1">Notes</p>
                                    <p className="text-sm text-text-primary">{app.interview_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Status + Audit */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-3">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase">Status</h3>
                        <span className={`inline-block px-4 py-2 rounded-xl ${statusStyle.bg} ${statusStyle.text} text-sm font-bold`}>
                            {statusStyle.label}
                        </span>
                        {app.submitted_at && (
                            <p className="text-xs text-text-muted">Submitted {new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        )}
                        {app.disclaimer_accepted_at && (
                            <p className="text-xs text-text-muted">✅ Disclaimer accepted</p>
                        )}
                        {app.rejection_reason && (
                            <div className="p-3 bg-error/5 border border-error/20 rounded-xl mt-2">
                                <p className="text-xs font-semibold text-error mb-1">Rejection Reason</p>
                                <p className="text-sm text-text-secondary">{app.rejection_reason}</p>
                            </div>
                        )}
                        {app.resubmission_feedback && (
                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl mt-2">
                                <p className="text-xs font-semibold text-orange-400 mb-1">Resubmission Feedback</p>
                                <p className="text-sm text-text-secondary">{app.resubmission_feedback}</p>
                            </div>
                        )}
                    </div>

                    {/* Audit Trail */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-3">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase">Activity Log</h3>
                        {(!app.audit || app.audit.length === 0) ? (
                            <p className="text-xs text-text-muted">No activity yet</p>
                        ) : (
                            <div className="space-y-3">
                                {app.audit
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map(entry => (
                                    <div key={entry.id} className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-text-primary font-medium capitalize">
                                                {entry.action.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-[11px] text-text-muted">
                                                {new Date(entry.created_at).toLocaleString('en-US', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-text-muted mt-0.5">{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">{label}</p>
                <p className="text-sm text-text-primary font-medium capitalize">{value}</p>
            </div>
        </div>
    );
}
