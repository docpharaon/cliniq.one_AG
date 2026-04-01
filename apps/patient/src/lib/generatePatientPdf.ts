/**
 * Patient-Facing Medical Report PDF Generator — cliniq.one
 *
 * Consultant-grade clinical report with:
 * - Severity assessment (VAS, BSA, IGA)
 * - Ranked differential diagnoses with clinical reasoning
 * - AI confidence indicator
 * - Treatment rationale & step-down plan
 * - Refill eligibility per medication
 * - Priority-coded warning signs (🔴🟠🟡)
 * - Clinical timeline visualization
 * - Escalation protocol
 * - Telemedicine consent note
 *
 * Works on web platform (uses DOM/canvas APIs).
 * On native, falls back to text-based report.
 */

// jsPDF uses AMD require() in its node bundle which crashes Metro web bundler.
// Lazy-load at runtime to avoid static analysis issues.
let _jsPDF: typeof import('jspdf').default | null = null;
let _autoTable: typeof import('jspdf-autotable').default | null = null;

async function getJsPDF() {
    if (!_jsPDF) {
        const mod = await import('jspdf');
        _jsPDF = mod.default;
    }
    return _jsPDF;
}

async function getAutoTable() {
    if (!_autoTable) {
        const mod = await import('jspdf-autotable');
        _autoTable = mod.default;
    }
    return _autoTable;
}

import type {
    Consultation,
    PrescriptionMedication,
    ConsultationReport,
    SeverityAssessment,
    RankedDifferential,
    PrioritizedWarningSign,
} from '@cliniqone/types';

// ── Colors ──────────────────────────────────
const TEAL          = [13, 148, 136] as const;
const DARK_TEAL     = [15, 118, 110] as const;
const BLACK         = [17, 24, 39]   as const;
const GRAY_700      = [55, 65, 81]   as const;
const GRAY_500      = [107, 114, 128] as const;
const GRAY_300      = [209, 213, 219] as const;
const LIGHT_TEAL_BG = [240, 253, 250] as const;
const WHITE         = [255, 255, 255] as const;
const BLUE          = [59, 130, 246]  as const;
const AMBER         = [217, 119, 6]   as const;
const RED           = [220, 38, 38]   as const;
const GREEN         = [22, 163, 74]   as const;
const PURPLE        = [124, 58, 237]  as const;

// ── Layout Constants ────────────────────────
const PAGE_WIDTH    = 210;
const PAGE_HEIGHT   = 297;
const MARGIN_LEFT   = 18;
const MARGIN_RIGHT  = 18;
const MARGIN_BOTTOM = 28;
const MARGIN_TOP    = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ── Verification Code Generator ─────────────
function generateVerificationCode(consultationId: string, patientId: string, createdAt: string): string {
    const input = `${consultationId}:${patientId}:${createdAt}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let h = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
        code += chars[h % chars.length];
        h = Math.floor(h / chars.length);
    }
    return `VER-${code}`;
}

// ── Color helper ────────────────────────────
type RGB = readonly [number, number, number];

export async function generatePatientPdf(consultation: Consultation) {
    const jsPDF = await getJsPDF();
    const autoTable = await getAutoTable();
    const report = (consultation.report || {}) as ConsultationReport;
    if (!report.diagnosis && !consultation.chief_complaint) {
        throw new Error('No report available');
    }

    const caseId = consultation.id.slice(0, 8).toUpperCase();
    const verCode = generateVerificationCode(
        consultation.id,
        consultation.patient_id,
        consultation.created_at,
    );
    const createdDate = new Date(consultation.created_at);
    const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
    const reportTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
    });

    const doc = new jsPDF!({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN_TOP;

    // ── Helpers ──────────────────────────────
    function checkPageBreak(needed: number) {
        if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
            addFooter();
            doc.addPage();
            y = MARGIN_TOP;
        }
    }

    function sectionHeader(title: string) {
        checkPageBreak(14);
        y += 4;
        doc.setFillColor(...TEAL as unknown as [number, number, number]);
        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE as unknown as [number, number, number]);
        doc.text(title, MARGIN_LEFT + 3, y + 5);
        y += 10;
        doc.setTextColor(...BLACK as unknown as [number, number, number]);
    }

    function bodyText(text: string) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_700 as unknown as [number, number, number]);
        const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
        const lineHeight = 4.2;
        for (const line of lines) {
            checkPageBreak(lineHeight + 1);
            doc.text(line, MARGIN_LEFT, y);
            y += lineHeight;
        }
        y += 1;
    }

    function kvRow(key: string, value: string) {
        checkPageBreak(6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
        doc.text(key + ':', MARGIN_LEFT + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK as unknown as [number, number, number]);
        doc.text(value, MARGIN_LEFT + 42, y);
        y += 5;
    }

    function accentBox(title: string, text: string, bgColor: RGB, textColor: RGB, borderColor: RGB) {
        const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 12);
        const boxHeight = lines.length * 3.8 + 12;
        checkPageBreak(boxHeight + 2);
        doc.setFillColor(...bgColor as unknown as [number, number, number]);
        doc.setDrawColor(...borderColor as unknown as [number, number, number]);
        doc.setLineWidth(0.4);
        doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, boxHeight, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...textColor as unknown as [number, number, number]);
        doc.text(title, MARGIN_LEFT + 4, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let ly = y + 10;
        for (const line of lines) {
            doc.text(line, MARGIN_LEFT + 4, ly);
            ly += 3.8;
        }
        y += boxHeight + 2;
    }

    function addFooter() {
        const footerY = PAGE_HEIGHT - 16;
        doc.setDrawColor(...GRAY_300 as unknown as [number, number, number]);
        doc.setLineWidth(0.3);
        doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
        doc.text('Confidential Medical Document — cliniq.one', MARGIN_LEFT, footerY + 4);
        doc.text(`Generated: ${reportDate} ${reportTime}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 4, { align: 'right' });
        doc.setFontSize(6);
        doc.text(
            `Verification Code: ${verCode}  |  This document can be verified at cliniq.one/verify`,
            PAGE_WIDTH / 2, footerY + 8, { align: 'center' },
        );
    }

    // ══════════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════════
    doc.setFillColor(...LIGHT_TEAL_BG as unknown as [number, number, number]);
    doc.rect(0, 0, PAGE_WIDTH, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...DARK_TEAL as unknown as [number, number, number]);
    doc.text('Medical Consultation Report', MARGIN_LEFT, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
    doc.text('cliniq.one — Telemedicine Platform', MARGIN_LEFT, 22);
    doc.text(reportDate, MARGIN_LEFT, 27);

    // IDENTIFIER BAR
    y = 34;
    doc.setFillColor(...TEAL as unknown as [number, number, number]);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE as unknown as [number, number, number]);
    doc.text(`Case ID: ${caseId}`, MARGIN_LEFT + 4, y + 6);

    const specialtyStr = (consultation.specialty || 'General').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    doc.text(`Specialty: ${specialtyStr}`, MARGIN_LEFT + 65, y + 6);
    doc.text(`Verification: ${verCode}`, PAGE_WIDTH - MARGIN_RIGHT - 4, y + 6, { align: 'right' });
    y = 48;

    // ══════════════════════════════════════════
    // CONSULTATION DETAILS
    // ══════════════════════════════════════════
    sectionHeader('CONSULTATION DETAILS');
    kvRow('Case ID', caseId);
    kvRow('Date', createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    kvRow('Specialty', specialtyStr);
    kvRow('Status', (consultation.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    // ══════════════════════════════════════════
    // CHIEF COMPLAINT
    // ══════════════════════════════════════════
    sectionHeader('CHIEF COMPLAINT');
    bodyText(consultation.chief_complaint || 'No complaint provided.');

    // ══════════════════════════════════════════
    // SEVERITY ASSESSMENT (NEW)
    // ══════════════════════════════════════════
    const severity: SeverityAssessment | undefined = report.severity_assessment;
    if (severity) {
        sectionHeader('SEVERITY ASSESSMENT');
        const metrics: [string, string, string][] = [];
        if (severity.pruritus_vas != null) metrics.push(['Pruritus VAS', `${severity.pruritus_vas}/10`, 'Symptom severity']);
        if (severity.bsa_percentage != null) metrics.push(['BSA Involvement', `~${severity.bsa_percentage}%`, 'Body surface area']);
        if (severity.iga_score != null) metrics.push(['IGA Score', `${severity.iga_score}/5`, severity.severity_label || '']);
        if (severity.easi_score != null) metrics.push(['EASI Score', `${severity.easi_score}`, '']);

        if (metrics.length > 0) {
            const colWidth = CONTENT_WIDTH / metrics.length;
            for (let i = 0; i < metrics.length; i++) {
                const [label, value, desc] = metrics[i];
                const x = MARGIN_LEFT + i * colWidth;
                checkPageBreak(20);
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(...GRAY_300 as unknown as [number, number, number]);
                doc.setLineWidth(0.3);
                doc.roundedRect(x + 1, y, colWidth - 2, 18, 1.5, 1.5, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
                doc.text(label.toUpperCase(), x + colWidth / 2, y + 4, { align: 'center' });
                doc.setFontSize(14);
                doc.setTextColor(...AMBER as unknown as [number, number, number]);
                doc.text(value, x + colWidth / 2, y + 11, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
                doc.text(desc, x + colWidth / 2, y + 15, { align: 'center' });
            }
            y += 22;
        }
    }

    // ══════════════════════════════════════════
    // CLINICAL ASSESSMENT
    // ══════════════════════════════════════════
    if (report.diagnosis) {
        sectionHeader('CLINICAL ASSESSMENT');
        kvRow('Diagnosis', report.diagnosis);
        if (report.icd10) kvRow('ICD-10 Code', report.icd10);
        if (report.snomed_ct) kvRow('SNOMED-CT', report.snomed_ct);

        // AI Confidence
        if (report.ai_confidence != null) {
            kvRow('AI Confidence', `${report.ai_confidence}% — ${report.ai_confidence >= 80 ? 'High' : report.ai_confidence >= 60 ? 'Moderate' : 'Low'}`);
        }

        // Clinical Reasoning
        if (report.clinical_reasoning) {
            y += 1;
            accentBox(
                'CLINICAL REASONING',
                report.clinical_reasoning,
                [240, 249, 255] as const, // bg: sky-50
                [12, 74, 110] as const,   // text: sky-900
                [186, 230, 253] as const, // border: sky-200
            );
        }
    }

    // ══════════════════════════════════════════
    // RANKED DIFFERENTIAL DIAGNOSES (NEW)
    // ══════════════════════════════════════════
    const diffs: RankedDifferential[] = report.differential_diagnoses || [];
    if (diffs.length > 0) {
        sectionHeader('RANKED DIFFERENTIAL DIAGNOSES');
        for (let i = 0; i < diffs.length; i++) {
            const d = diffs[i];
            const rank = i + 1;
            const likelihoodLabel = d.likelihood === 'most_likely' ? 'Most likely' :
                d.likelihood === 'possible' ? 'Possible' :
                d.likelihood === 'less_likely' ? 'Less likely' : 'Unlikely';
            checkPageBreak(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...BLACK as unknown as [number, number, number]);
            doc.text(`${rank}. ${d.diagnosis}`, MARGIN_LEFT + 2, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
            doc.text(`(${likelihoodLabel})`, MARGIN_LEFT + 2, y + 4);
            if (d.reasoning) {
                doc.setTextColor(...GRAY_700 as unknown as [number, number, number]);
                doc.text(` — ${d.reasoning}`, MARGIN_LEFT + 30, y + 4);
            }
            y += 8;
        }
    }

    // ══════════════════════════════════════════
    // TREATMENT PLAN
    // ══════════════════════════════════════════
    if (report.treatment_plan) {
        sectionHeader('TREATMENT PLAN');

        // Treatment Rationale
        if (report.treatment_rationale) {
            accentBox(
                'CLINICAL RATIONALE',
                report.treatment_rationale,
                [240, 249, 255] as const,
                [12, 74, 110] as const,
                [186, 230, 253] as const,
            );
        }

        bodyText(report.treatment_plan);

        if (report.treatment_plan_ar) {
            bodyText('(العربية)');
            bodyText(report.treatment_plan_ar);
        }
    }

    // ══════════════════════════════════════════
    // PRESCRIPTION (with Refill + Potency)
    // ══════════════════════════════════════════
    const meds: PrescriptionMedication[] = consultation.prescription?.medications || (report as any).prescriptions || [];
    if (meds.length > 0) {
        sectionHeader('E-PRESCRIPTION');
        checkPageBreak(10 + meds.length * 12);

        autoTable!(doc, {
            startY: y,
            margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
            head: [['#', 'Medication', 'Type', 'Dosage', 'Duration', 'Refill']],
            body: meds.map((med, i) => {
                const typeLabel = med.medication_type === 'otc' ? 'OTC' : 'Rx';
                let refillLabel = '—';
                if (med.refill_eligible === true) {
                    refillLabel = `✓ Yes${med.refill_count ? ` (${med.refill_count}×)` : ''}`;
                } else if (med.refill_eligible === false) {
                    refillLabel = `✕ No${med.refill_reason_blocked ? `\n${med.refill_reason_blocked}` : ''}`;
                } else if (med.medication_type === 'otc') {
                    refillLabel = 'N/A (OTC)';
                }

                const nameWithClass = med.potency_class
                    ? `${med.name || med.dosage || ''}\n[${med.potency_class}]`
                    : med.name || med.dosage || '';

                return [
                    (i + 1).toString(),
                    nameWithClass,
                    typeLabel,
                    `${med.dose || med.dosage || ''}\n${med.frequency || ''}`,
                    med.duration || '',
                    refillLabel,
                ];
            }),
            styles: {
                fontSize: 8, cellPadding: 2.5,
                textColor: GRAY_700 as unknown as [number, number, number],
                lineColor: GRAY_300 as unknown as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: DARK_TEAL as unknown as [number, number, number],
                textColor: WHITE as unknown as [number, number, number],
                fontStyle: 'bold', fontSize: 8,
            },
            alternateRowStyles: { fillColor: LIGHT_TEAL_BG as unknown as [number, number, number] },
            columnStyles: {
                0: { cellWidth: 8 },
                5: { cellWidth: 22, halign: 'center' },
            },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Medication warnings
        const medsWithWarnings = meds.filter(m => m.warnings && m.warnings.length > 0);
        if (medsWithWarnings.length > 0) {
            for (const med of medsWithWarnings) {
                checkPageBreak(8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(...AMBER as unknown as [number, number, number]);
                doc.text(`⚠ ${med.name}:`, MARGIN_LEFT + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...GRAY_700 as unknown as [number, number, number]);
                doc.text(med.warnings!.join('; '), MARGIN_LEFT + 50, y);
                y += 5;
            }
        }
    }

    // ══════════════════════════════════════════
    // STEP-DOWN PLAN (NEW)
    // ══════════════════════════════════════════
    if (report.step_down_plan) {
        accentBox(
            '⬇ STEP-DOWN PLAN',
            report.step_down_plan,
            [254, 252, 232] as const, // bg: yellow-50
            [113, 63, 18] as const,   // text: yellow-900
            [253, 230, 138] as const, // border: yellow-300
        );
    }

    // ══════════════════════════════════════════
    // PATIENT EDUCATION
    // ══════════════════════════════════════════
    if (report.patient_education) {
        sectionHeader('PATIENT EDUCATION');
        bodyText(report.patient_education);
        if (report.patient_education_ar) {
            bodyText('(العربية)');
            bodyText(report.patient_education_ar);
        }
    }

    // ══════════════════════════════════════════
    // NON-PHARMACOLOGIC TREATMENT
    // ══════════════════════════════════════════
    if (report.non_pharmacologic) {
        sectionHeader('NON-PHARMACOLOGIC TREATMENT');
        bodyText(report.non_pharmacologic);
        if (report.non_pharmacologic_ar) {
            bodyText('(العربية)');
            bodyText(report.non_pharmacologic_ar);
        }
    }

    // ══════════════════════════════════════════
    // PRIORITY-CODED WARNING SIGNS (NEW)
    // ══════════════════════════════════════════
    const priorityWarnings: PrioritizedWarningSign[] = report.warning_signs_priority || [];
    const legacyWarnings = report.warning_signs;

    if (priorityWarnings.length > 0) {
        sectionHeader('WARNING SIGNS — PRIORITIZED ACTION GUIDE');
        const levelColors: Record<string, { bg: RGB; text: RGB; label: string }> = {
            emergency: { bg: [254, 226, 226], text: [153, 27, 27], label: '🔴 EMERGENCY' },
            urgent:    { bg: [255, 247, 237], text: [154, 52, 18], label: '🟠 URGENT' },
            monitor:   { bg: [254, 249, 195], text: [133, 77, 14], label: '🟡 MONITOR' },
        };
        for (const ws of priorityWarnings) {
            const lc = levelColors[ws.level] || levelColors.monitor;
            checkPageBreak(8);
            doc.setFillColor(...lc.bg as unknown as [number, number, number]);
            doc.roundedRect(MARGIN_LEFT, y - 1, CONTENT_WIDTH, 7, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...lc.text as unknown as [number, number, number]);
            doc.text(`${lc.label}: ${ws.symptom}`, MARGIN_LEFT + 3, y + 3);
            doc.setFont('helvetica', 'normal');
            doc.text(`→ ${ws.action}`, MARGIN_LEFT + 95, y + 3);
            y += 9;
        }
    } else if (legacyWarnings && (Array.isArray(legacyWarnings) ? legacyWarnings.length > 0 : legacyWarnings)) {
        sectionHeader('WARNING SIGNS');
        const wsText = Array.isArray(legacyWarnings) ? legacyWarnings.join(', ') : legacyWarnings;
        bodyText(wsText);
        if (report.warning_signs_ar) {
            bodyText('(العربية)');
            bodyText(report.warning_signs_ar);
        }
    }

    // ══════════════════════════════════════════
    // ESCALATION PROTOCOL (NEW)
    // ══════════════════════════════════════════
    if (report.escalation_protocol) {
        accentBox(
            '⚡ ESCALATION PROTOCOL',
            report.escalation_protocol,
            [255, 241, 242] as const, // bg: rose-50
            [136, 19, 55] as const,   // text: rose-900
            [254, 205, 211] as const, // border: rose-200
        );
    }

    // ══════════════════════════════════════════
    // FOLLOW-UP
    // ══════════════════════════════════════════
    if (report.follow_up || report.follow_up_timeframe) {
        sectionHeader('FOLLOW-UP RECOMMENDATIONS');
        if (report.follow_up) bodyText(report.follow_up);
        if (report.follow_up_ar) {
            bodyText('(العربية)');
            bodyText(report.follow_up_ar);
        }
        if (report.follow_up_timeframe) kvRow('Timeframe', report.follow_up_timeframe);
    }

    // ══════════════════════════════════════════
    // TELEMEDICINE CONSENT NOTE (NEW)
    // ══════════════════════════════════════════
    const consentNote = report.telemedicine_consent_note ||
        'This report is generated from a telemedicine consultation conducted via the cliniq.one platform. ' +
        'Diagnosis was made via asynchronous teleconsultation based on patient-submitted information and AI-assisted medical history. ' +
        'Limitations of remote assessment have been disclosed to the patient. Physical examination was not performed; ' +
        'findings are based on visual assessment of submitted images only.';

    accentBox(
        '📋 TELEMEDICINE MODALITY & CONSENT',
        consentNote,
        [245, 243, 255] as const, // bg: violet-50
        [91, 33, 182] as const,   // text: violet-800
        [221, 214, 254] as const, // border: violet-200
    );

    // ══════════════════════════════════════════
    // LEGAL DISCLAIMER
    // ══════════════════════════════════════════
    const disclaimerText =
        'TELEMEDICINE DISCLAIMER: This report is generated from a telemedicine consultation conducted via the cliniq.one platform. ' +
        'This consultation does not constitute an in-person medical examination. The medical opinion provided is based solely on ' +
        'patient-reported information and any digital media shared during the consultation. This document does not replace an ' +
        'in-person clinical evaluation, and the patient is advised to seek immediate in-person medical attention for any emergency ' +
        'or worsening symptoms. cliniq.one and the consulting physician are not liable for outcomes resulting from reliance on ' +
        'this telemedicine consultation in lieu of an in-person visit. All medical data is processed in compliance with applicable ' +
        'data protection regulations. By using this service, the patient acknowledges the inherent limitations of telemedicine consultations.';

    const disclaimerLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 8);
    const disclaimerHeight = disclaimerLines.length * 3.2 + 8;
    checkPageBreak(disclaimerHeight + 6);
    y += 4;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...GRAY_300 as unknown as [number, number, number]);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, disclaimerHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
    doc.text('Legal Disclaimer', MARGIN_LEFT + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    let dy = y + 9;
    for (const line of disclaimerLines) {
        doc.text(line, MARGIN_LEFT + 4, dy);
        dy += 3.2;
    }
    y += disclaimerHeight + 2;

    // ══════════════════════════════════════════
    // ADD FOOTERS TO ALL PAGES
    // ══════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as unknown as [number, number, number]);
        doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
    }

    return doc;
}

/**
 * Generate and download PDF on web, or return text for native.
 */
export async function downloadPatientPdf(consultation: Consultation, _lang?: string): Promise<boolean> {
    try {
        const doc = await generatePatientPdf(consultation);
        const caseId = consultation.id.slice(0, 8).toLowerCase();
        doc.save(`cliniq-report-${caseId}.pdf`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate PDF blob for sharing on web.
 */
export async function getPatientPdfBlob(consultation: Consultation, _lang?: string): Promise<Blob | null> {
    try {
        const doc = await generatePatientPdf(consultation);
        return doc.output('blob');
    } catch {
        return null;
    }
}
