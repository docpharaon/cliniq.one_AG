import { useState } from 'react';
import { colors, typography, spacing, radius, AlertTriangle, ClipboardList, Info, Gem, XCircle } from '@cliniqone/ui';
import { DOCTOR_REFUND_REASON_LABELS } from '@cliniqone/types';
import type { DoctorRefundReason } from '@cliniqone/types';
import { requestDoctorRefund } from '@cliniqone/api';
import { haptic } from '../hooks/useHaptics';
import type { CSSProperties } from 'react';

interface RefundRequestModalProps {
    visible: boolean; onClose: () => void; consultationId: string; doctorUserId: string; tokenCost: number; onSuccess?: () => void;
}

const REASONS = Object.entries(DOCTOR_REFUND_REASON_LABELS) as [DoctorRefundReason, { en: string; ar: string }][];

export function RefundRequestModal({ visible, onClose, consultationId, doctorUserId, tokenCost, onSuccess }: RefundRequestModalProps) {
    const [selectedReason, setSelectedReason] = useState<DoctorRefundReason | null>(null);
    const [explanation, setExplanation] = useState('');
    const [step, setStep] = useState<'reason' | 'confirm'>('reason');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const canProceed = selectedReason !== null && explanation.trim().length >= 20;

    function handleReset() { setSelectedReason(null); setExplanation(''); setStep('reason'); setError(''); setSubmitting(false); }
    function handleClose() { handleReset(); onClose(); }

    async function handleSubmit() {
        if (!selectedReason || !canProceed) return;
        setSubmitting(true); setError('');
        try {
            await requestDoctorRefund({ consultationId, doctorUserId, reasonCategory: selectedReason, reasonText: explanation.trim() });
            handleReset(); onSuccess?.(); onClose();
        } catch (err: any) { setError(err?.message || 'Failed to submit refund request'); }
        finally { setSubmitting(false); }
    }

    if (!visible) return null;

    return (
        <div style={s.overlay} onClick={handleClose}>
            <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={s.header}>
                    <div style={s.handle} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{step === 'reason' ? <><AlertTriangle size={18} color={colors.warning} /> Request Refund</> : <><ClipboardList size={18} color={colors.textPrimary} /> Confirm Refund</>}</span>
                        <button onClick={() => { haptic.light(); handleClose(); }}><span style={{ fontSize: 20, color: colors.textTertiary, padding: 8 }}>✕</span></button>
                    </div>
                    <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'block' }}>{step === 'reason' ? 'Select a reason for requesting a refund' : 'Review the details below'}</span>
                </div>

                <div style={s.body} className="scrollable">
                    {step === 'reason' ? (
                        <>
                            <span style={s.label}>Reason</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {REASONS.map(([key, labels]) => (
                                    <button key={key} style={{ ...s.reasonChip, ...(selectedReason === key ? s.reasonChipActive : {}) }} className="pressable" onClick={() => { haptic.select(); setSelectedReason(key); }}>
                                        <span style={{ fontSize: 13, color: selectedReason === key ? colors.warning : colors.textSecondary, fontWeight: selectedReason === key ? 600 : 400 }}>{labels.en}</span>
                                    </button>
                                ))}
                            </div>

                            <span style={s.label}>Explanation <span style={{ color: colors.warning, fontSize: 10 }}>(min 20 chars)</span></span>
                            <textarea style={s.textArea} placeholder="Describe why this consultation should be refunded..." value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={500} rows={4} />
                            <span style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'right', display: 'block', marginTop: 4 }}>{explanation.length}/500</span>

                            <button style={{ ...s.proceedBtn, opacity: canProceed ? 1 : 0.4 }} className="pressable" onClick={() => { haptic.medium(); setStep('confirm'); }} disabled={!canProceed}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: colors.bgPrimary }}>Review & Confirm</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={s.summaryCard}>
                                <div style={s.summaryRow}><span style={s.summaryLabel}>Reason</span><span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600 }}>{selectedReason ? DOCTOR_REFUND_REASON_LABELS[selectedReason].en : ''}</span></div>
                                <div style={s.divider} />
                                <div style={s.summaryRow}><span style={s.summaryLabel}>Refund Amount</span><span style={{ fontSize: typography.h4.fontSize, color: colors.accentTeal, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={16} color={colors.gold} /> {tokenCost} tokens</span></div>
                                <div style={s.divider} />
                                <div style={s.summaryRow}><span style={s.summaryLabel}>Explanation</span></div>
                                <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: '22px', marginTop: 4 }}>{explanation}</p>
                            </div>

                            <div style={s.impactNotice}>
                                <Info size={18} color={colors.info} />
                                <div style={{ flex: 1 }}>
                                    <span style={{ display: 'block', fontSize: 13, color: colors.info, fontWeight: 700, marginBottom: 4 }}>What happens next</span>
                                    <span style={{ fontSize: 11, color: colors.textSecondary, lineHeight: '18px' }}>
                                        • Request sent to admin for review<br />
                                        • Patient refunded {tokenCost} tokens upon approval<br />
                                        • Consultation marked as "refunded"<br />
                                        • Your earned tokens adjusted accordingly
                                    </span>
                                </div>
                            </div>

                            {error && <div style={s.errorBanner}><span style={{ fontSize: 13, color: colors.error, display: 'inline-flex', alignItems: 'center', gap: 4 }}><XCircle size={14} color={colors.error} /> {error}</span></div>}

                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button style={s.backBtn} className="pressable" onClick={() => { haptic.light(); setStep('reason'); }}><span style={{ fontSize: 14, color: colors.textSecondary }}>← Back</span></button>
                                <button style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }} className="pressable" onClick={() => { haptic.heavy(); handleSubmit(); }} disabled={submitting}>
                                    {submitting ? <div className="spinner" style={{ color: '#fff' }} /> : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Submit Refund Request</span>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', zIndex: 100 },
    sheet: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', display: 'flex', flexDirection: 'column' },
    header: { paddingInline: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, borderBottom: `1px solid ${colors.border}` },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, margin: '0 auto', marginBottom: spacing.md },
    body: { paddingInline: spacing.xl, paddingBlock: spacing.xl, flex: 1 },
    label: { display: 'block', fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
    reasonChip: { paddingInline: spacing.lg, paddingBlock: spacing.md, borderRadius: radius.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.bgCard },
    reasonChipActive: { borderColor: colors.warning, backgroundColor: colors.warningFaded },
    textArea: { display: 'block', width: '100%', color: colors.textPrimary, backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: spacing.lg, minHeight: 100, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' as any },
    proceedBtn: { width: '100%', backgroundColor: colors.warning, borderRadius: radius.lg, paddingBlock: spacing.lg, marginTop: 20 },
    summaryCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, border: `1px solid ${colors.border}` },
    summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBlock: 8 },
    summaryLabel: { fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase' as any, letterSpacing: 1 },
    divider: { height: 1, backgroundColor: colors.border, marginBlock: 4 },
    impactNotice: { display: 'flex', gap: 12, backgroundColor: colors.infoFaded, borderRadius: radius.lg, padding: spacing.lg, marginTop: 20 },
    errorBanner: { backgroundColor: colors.errorFaded, borderRadius: radius.md, padding: spacing.md, marginTop: 12 },
    backBtn: { flex: 1, border: `1px solid ${colors.border}`, borderRadius: radius.lg, paddingBlock: spacing.lg },
    submitBtn: { flex: 2, backgroundColor: colors.error, borderRadius: radius.lg, paddingBlock: spacing.lg },
};
