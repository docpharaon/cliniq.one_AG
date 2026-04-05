import React, { useRef, useState, useCallback } from 'react';
import { useIntakeStore, type UploadedReport } from '../stores/intakeStore';
import { analyzeReport, type ReportAnalysis } from '../services/aiService';
import { supabase } from '@cliniqone/api';
import { FileText, CheckCircle, XCircle, AlertTriangle, Paperclip, Search } from '@cliniqone/ui';

interface ReportUploadProps {
    specialty: string;
    language: 'en' | 'ar';
    sessionId: string | null;
    onComplete: (reports: UploadedReport[]) => void;
    onDecline: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.heic';

const SPECIALTY_PROMPTS: Record<string, { title: string; examples: string[] }> = {
    orthopedics: {
        title: 'Orthopedic Reports',
        examples: ['X-ray reports or images', 'MRI / CT scan reports', 'Bone density (DEXA) scans', 'Physical therapy notes', 'Blood tests (ESR, CRP, vitamin D)'],
    },
    psychiatry: {
        title: 'Psychiatric Reports',
        examples: ['Previous psychiatric evaluations', 'PHQ-9 / MMPI test results', 'Therapy progress notes', 'Blood tests (thyroid, lithium levels)', 'Brain imaging (EEG, MRI)'],
    },
    family_medicine: {
        title: 'Medical Reports',
        examples: ['Blood test results (CBC, metabolic panel)', 'HbA1c / cholesterol / thyroid tests', 'ECG or heart test results', 'Previous doctor reports'],
    },
    pediatrics: {
        title: 'Pediatric Reports',
        examples: ['Growth charts', 'Vaccination records', 'Developmental assessments', 'Pediatric blood work', 'Newborn screening results'],
    },
    dermatology: {
        title: 'Dermatology Reports',
        examples: ['Skin biopsy / pathology results', 'Allergy patch test results', 'Previous treatment records', 'Blood work (ANA panel)'],
    },
    diet: {
        title: 'Nutrition Reports',
        examples: ['Blood tests (metabolic panel, vitamins)', 'HbA1c / lipid panel / thyroid', 'Body composition (DEXA) data', 'Food allergy / intolerance results'],
    },
    diet_nutrition: {
        title: 'Nutrition Reports',
        examples: ['Blood tests (metabolic panel, vitamins)', 'HbA1c / lipid panel / thyroid', 'Body composition (DEXA) data', 'Food allergy / intolerance results'],
    },
};

function getStatusBadge(status: UploadedReport['status'], analysis: ReportAnalysis | null) {
    switch (status) {
        case 'uploading':
            return { icon: '⏳', label: 'Uploading...', color: '#6b7280', bg: '#6b728015' };
        case 'analyzing':
            return { icon: '🔬', label: 'AI Analyzing...', color: '#3b82f6', bg: '#3b82f615' };
        case 'verified':
            return { icon: '✅', label: 'Verified', color: '#10b981', bg: '#10b98115' };
        case 'rejected':
            return { icon: '❌', label: 'Rejected', color: '#ef4444', bg: '#ef444415' };
        case 'outdated':
            return { icon: '⚠️', label: 'Outdated', color: '#f59e0b', bg: '#f59e0b15' };
        default:
            return { icon: '📎', label: 'Pending', color: '#6b7280', bg: '#6b728015' };
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportUpload({ specialty, language, sessionId, onComplete, onDecline }: ReportUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { uploadedReports, reportConsentGiven, addUploadedReport, updateUploadedReport, removeUploadedReport, setReportConsentGiven } = useIntakeStore();
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const prompt = SPECIALTY_PROMPTS[specialty] || SPECIALTY_PROMPTS.family_medicine;

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError('');

        const remaining = MAX_FILES - uploadedReports.length;
        if (remaining <= 0) {
            setError(`Maximum ${MAX_FILES} files allowed.`);
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remaining);

        for (const file of filesToProcess) {
            // Validate size
            if (file.size > MAX_FILE_SIZE) {
                setError(`"${file.name}" is too large (max 20MB).`);
                continue;
            }
            // Validate type
            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError(`"${file.name}" is not a supported format. Use PDF, JPG, PNG, or WebP.`);
                continue;
            }

            const tempId = crypto.randomUUID();

            // Add to store immediately (uploading state)
            addUploadedReport({
                id: tempId,
                fileUrl: '',
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                status: 'uploading',
                analysis: null,
            });

            // Upload to Supabase Storage
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const filePath = `${user.id}/${sessionId || 'unsorted'}/${Date.now()}_${file.name}`;
                const { error: uploadErr } = await supabase.storage
                    .from('consultation-reports')
                    .upload(filePath, file, { contentType: file.type });

                if (uploadErr) throw uploadErr;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('consultation-reports')
                    .getPublicUrl(filePath);

                const fileUrl = urlData?.publicUrl || filePath;

                updateUploadedReport(tempId, { fileUrl, status: 'analyzing' });

                // Read file as base64 for AI analysis
                const base64 = await fileToBase64(file);

                // Call AI Vision analysis
                const analysis = await analyzeReport(
                    base64,
                    'general',
                    specialty,
                    language,
                );

                // Determine final status
                let finalStatus: UploadedReport['status'] = 'verified';
                if (!analysis.isValidDocument) {
                    finalStatus = 'rejected';
                } else if (analysis.dateRelevance === 'outdated') {
                    finalStatus = 'outdated';
                }

                updateUploadedReport(tempId, {
                    fileUrl,
                    status: finalStatus,
                    analysis,
                });

            } catch (err) {
                console.error('[ReportUpload] Upload/analysis failed:', err);
                updateUploadedReport(tempId, {
                    status: 'rejected',
                    analysis: {
                        isValidDocument: false,
                        documentType: 'unknown',
                        documentDate: null,
                        dateRelevance: 'unknown',
                        documentLanguage: 'en',
                        extractedData: { title: '', institution: null, orderingPhysician: null, patientName: null, keyFindings: [], values: [], diagnoses: [], recommendations: [] },
                        summary: 'Upload or analysis failed',
                        confidence: 0,
                        rejectionReason: err instanceof Error ? err.message : 'Upload failed',
                    },
                });
            }
        }
    }, [uploadedReports.length, specialty, language, sessionId, addUploadedReport, updateUploadedReport]);

    const allDone = uploadedReports.length > 0 && uploadedReports.every(r => r.status !== 'uploading' && r.status !== 'analyzing');
    const hasAny = uploadedReports.length > 0;

    function handleDone() {
        setIsProcessing(true);
        onComplete(uploadedReports);
    }

    return (
        <div style={s.overlay}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <Paperclip size={20} color="#1A8A9E" />
                    <h3 style={s.title}>📎 {prompt.title}</h3>
                </div>

                <p style={s.subtitle}>
                    Upload any existing reports that might help your doctor:
                </p>

                {/* Specialty-specific examples */}
                <div style={s.exampleBox}>
                    {prompt.examples.map((ex, i) => (
                        <div key={i} style={s.exampleItem}>
                            <span style={s.exampleBullet}>•</span>
                            <span style={s.exampleText}>{ex}</span>
                        </div>
                    ))}
                </div>

                {/* Consent checkbox (first time only) */}
                {!reportConsentGiven && (
                    <label style={s.consentLabel}>
                        <input
                            type="checkbox"
                            checked={reportConsentGiven}
                            onChange={(e) => setReportConsentGiven(e.target.checked)}
                            style={s.checkbox}
                        />
                        <span style={s.consentText}>
                            I consent to my documents being analyzed by AI to extract key information for my doctor.
                        </span>
                    </label>
                )}

                {/* Upload zone */}
                {reportConsentGiven && uploadedReports.length < MAX_FILES && (
                    <div
                        style={s.dropZone}
                        onClick={() => inputRef.current?.click()}
                    >
                        <Paperclip size={28} color="#1A8A9E" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        <span style={s.dropText}>Tap to select files</span>
                        <span style={s.dropHint}>
                            PDF, JPG, PNG • Max 20MB • Up to {MAX_FILES - uploadedReports.length} more
                        </span>
                    </div>
                )}

                {/* File list */}
                {uploadedReports.length > 0 && (
                    <div style={s.fileList}>
                        {uploadedReports.map((report) => {
                            const badge = getStatusBadge(report.status, report.analysis);
                            return (
                                <div key={report.id} style={s.fileCard}>
                                    <div style={s.fileRow}>
                                        <div style={s.fileIcon}>
                                            {report.fileType.startsWith('image/') ?
                                                <FileText size={18} color="#1A8A9E" /> :
                                                <FileText size={18} color="#1A8A9E" />
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={s.fileName}>{report.fileName}</p>
                                            <p style={s.fileSize}>{formatFileSize(report.fileSize)}</p>
                                        </div>
                                        <span style={{ ...s.statusBadge, color: badge.color, backgroundColor: badge.bg }}>
                                            {badge.icon} {badge.label}
                                        </span>
                                        {(report.status !== 'uploading' && report.status !== 'analyzing') && (
                                            <button style={s.removeBtn} onClick={() => removeUploadedReport(report.id)}>✕</button>
                                        )}
                                        {report.status === 'analyzing' && <div style={s.spinner} />}
                                    </div>

                                    {/* AI Analysis Result */}
                                    {report.analysis && report.status !== 'uploading' && report.status !== 'analyzing' && (
                                        <div style={{
                                            ...s.analysisBox,
                                            borderColor: report.status === 'verified' ? '#10b98130' :
                                                report.status === 'outdated' ? '#f59e0b30' : '#ef444430',
                                            backgroundColor: report.status === 'verified' ? '#10b98108' :
                                                report.status === 'outdated' ? '#f59e0b08' : '#ef444408',
                                        }}>
                                            {report.status === 'verified' && (
                                                <>
                                                    <div style={s.analysisSummary}>
                                                        <CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                                        <strong style={{ color: '#10b981', fontSize: 12 }}>
                                                            {report.analysis.documentType?.replace(/_/g, ' ').toUpperCase()}
                                                        </strong>
                                                        {report.analysis.extractedData?.institution && (
                                                            <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6 }}>
                                                                — {report.analysis.extractedData.institution}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={s.summaryText}>{report.analysis.summary}</p>
                                                    {report.analysis.documentDate && (
                                                        <p style={s.dateText}>📅 Report date: {report.analysis.documentDate}</p>
                                                    )}
                                                </>
                                            )}
                                            {report.status === 'rejected' && (
                                                <div style={s.analysisSummary}>
                                                    <XCircle size={14} color="#ef4444" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                                    <span style={{ color: '#ef4444', fontSize: 12 }}>
                                                        {report.analysis.rejectionReason || 'This document could not be verified as a medical report.'}
                                                    </span>
                                                </div>
                                            )}
                                            {report.status === 'outdated' && (
                                                <>
                                                    <div style={s.analysisSummary}>
                                                        <AlertTriangle size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                                        <span style={{ color: '#f59e0b', fontSize: 12 }}>
                                                            This report may be outdated ({report.analysis.documentDate || 'date unknown'})
                                                        </span>
                                                    </div>
                                                    <p style={s.summaryText}>{report.analysis.summary}</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {error && (
                    <p style={s.error}>
                        <AlertTriangle size={12} color="#ef4444" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div style={s.actions}>
                    {hasAny && allDone && (
                        <button style={s.doneBtn} onClick={handleDone} disabled={isProcessing}>
                            <CheckCircle size={16} color="#fff" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            Done — Continue
                        </button>
                    )}
                    <button style={s.skipBtn} onClick={onDecline}>
                        {hasAny ? 'Cancel' : 'Skip — No reports to upload'}
                    </button>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                />
            </div>
        </div>
    );
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Failed to read file'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
    },
    modal: {
        backgroundColor: 'var(--bg-primary, #111827)',
        borderRadius: 20, padding: 24,
        maxWidth: 440, width: '100%',
        maxHeight: '85vh', overflowY: 'auto' as const,
        border: '1px solid var(--border, #1f2937)',
    },
    header: {
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
    },
    title: {
        color: 'var(--text-primary, #f9fafb)', fontSize: 18, fontWeight: 700, margin: 0,
    },
    subtitle: {
        color: 'var(--text-secondary, #9ca3af)', fontSize: 14, lineHeight: '20px', marginBottom: 16,
    },
    exampleBox: {
        backgroundColor: 'var(--bg-secondary, #1f2937)',
        borderRadius: 12, padding: 14, marginBottom: 16,
        border: '1px solid var(--border, #374151)',
    },
    exampleItem: { display: 'flex', gap: 6, paddingBlock: 3 },
    exampleBullet: { color: '#1A8A9E', fontSize: 13, fontWeight: 700 },
    exampleText: { color: 'var(--text-secondary, #9ca3af)', fontSize: 13 },
    consentLabel: {
        display: 'flex', gap: 10, padding: 14,
        backgroundColor: '#1A8A9E10', borderRadius: 12,
        border: '1px solid #1A8A9E30', marginBottom: 16, cursor: 'pointer',
        alignItems: 'flex-start',
    },
    checkbox: { marginTop: 2, accentColor: '#1A8A9E', width: 18, height: 18, flexShrink: 0 },
    consentText: { color: 'var(--text-secondary, #9ca3af)', fontSize: 12, lineHeight: '18px' },
    dropZone: {
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        padding: 28, borderRadius: 14,
        border: '2px dashed var(--border, #374151)',
        backgroundColor: 'var(--bg-tertiary, #0f172a)',
        cursor: 'pointer', marginBottom: 16,
        transition: 'all 0.2s ease',
    },
    dropText: { fontSize: 14, fontWeight: 600, color: 'var(--text-secondary, #9ca3af)', marginBottom: 4 },
    dropHint: { fontSize: 11, color: 'var(--text-tertiary, #6b7280)' },
    fileList: { display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 16 },
    fileCard: {
        backgroundColor: 'var(--bg-card, #1f2937)',
        border: '1px solid var(--border, #374151)',
        borderRadius: 14, padding: 12,
    },
    fileRow: { display: 'flex', alignItems: 'center', gap: 10 },
    fileIcon: { flexShrink: 0 },
    fileName: {
        fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f9fafb)',
        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    fileSize: { fontSize: 11, color: 'var(--text-tertiary, #6b7280)', margin: 0 },
    statusBadge: {
        fontSize: 10, fontWeight: 700, padding: '3px 8px',
        borderRadius: 8, whiteSpace: 'nowrap' as const, flexShrink: 0,
    },
    removeBtn: {
        width: 24, height: 24, borderRadius: 12,
        border: '1px solid var(--border, #374151)',
        backgroundColor: 'transparent', color: 'var(--text-tertiary, #6b7280)',
        fontSize: 11, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    spinner: {
        width: 18, height: 18,
        border: '2px solid var(--border, #374151)',
        borderTop: '2px solid #1A8A9E',
        borderRadius: '50%', flexShrink: 0,
        animation: 'spin 1s linear infinite',
    },
    analysisBox: {
        marginTop: 10, padding: 10, borderRadius: 10,
        border: '1px solid',
    },
    analysisSummary: { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const },
    summaryText: { fontSize: 12, color: 'var(--text-secondary, #9ca3af)', marginTop: 6, marginBottom: 0, lineHeight: '18px' },
    dateText: { fontSize: 11, color: 'var(--text-tertiary, #6b7280)', marginTop: 4, marginBottom: 0 },
    error: { fontSize: 12, color: '#ef4444', marginBottom: 12 },
    actions: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
    doneBtn: {
        width: '100%', padding: '14px 20px', borderRadius: 14,
        backgroundColor: '#1A8A9E', color: '#fff', border: 'none',
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    skipBtn: {
        width: '100%', padding: '12px 20px', borderRadius: 14,
        backgroundColor: 'transparent', color: 'var(--text-tertiary, #6b7280)',
        border: 'none', fontSize: 14, cursor: 'pointer',
    },
};
