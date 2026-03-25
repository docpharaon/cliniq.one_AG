/**
 * Medical Report PDF Generator — cliniq.one
 *
 * Generates a branded, professional PDF medical report with:
 * - cliniq.one logo header
 * - Case ID + Verification Code identifiers
 * - All clinical sections (patient info, complaint, diagnosis, prescription, etc.)
 * - Legal telemedicine disclaimer
 * - Page numbers and confidentiality footer
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
    Consultation,
    User as UserType,
    ConsultationReport,
    PrescriptionMedication,
    Intervention,
    AISummary,
} from '@cliniqone/types';

// ── Colors ──────────────────────────────────
const TEAL          = [13, 148, 136];   // #0D9488
const DARK_TEAL     = [15, 118, 110];   // #0F766E
const BLACK         = [17, 24, 39];     // #111827
const GRAY_700      = [55, 65, 81];     // #374151
const GRAY_500      = [107, 114, 128];  // #6B7280
const GRAY_300      = [209, 213, 219];  // #D1D5DB
const LIGHT_TEAL_BG = [240, 253, 250];  // #F0FDFA
const WHITE         = [255, 255, 255];

// ── Layout Constants ────────────────────────
const PAGE_WIDTH    = 210; // A4 mm
const PAGE_HEIGHT   = 297;
const MARGIN_LEFT   = 18;
const MARGIN_RIGHT  = 18;
const MARGIN_TOP    = 16;
const MARGIN_BOTTOM = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ── Types ───────────────────────────────────
export interface MedicalPdfData {
    consultation: Consultation & { patient?: UserType | null };
    report: ConsultationReport;
    interventions?: Intervention[];
    doctorName?: string;
    /** 'full' = all sections (doctor/admin), 'patient' = simplified */
    variant?: 'full' | 'patient';
}

// ── Verification Code Generator ─────────────
function generateVerificationCode(consultationId: string, patientId: string, createdAt: string): string {
    // Simple hash-based code from consultation data
    const input = `${consultationId}:${patientId}:${createdAt}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32-bit int
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for readability
    let code = '';
    let h = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
        code += chars[h % chars.length];
        h = Math.floor(h / chars.length);
    }
    return `VER-${code}`;
}

// ── Logo Loader ─────────────────────────────
async function loadLogoAsBase64(): Promise<string | null> {
    try {
        const response = await fetch('/cliniq-logo.png');
        if (!response.ok) return null;
        const blob = await response.blob();
        // Resize to 80x80 for PDF
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 160; // render at 2x for clarity
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(blob);
        });
    } catch {
        return null;
    }
}

// ── Main Generator ──────────────────────────
export async function generateMedicalPdf(data: MedicalPdfData): Promise<jsPDF> {
    const {
        consultation,
        report,
        interventions = [],
        doctorName,
        variant = 'full',
    } = data;

    const patient = consultation.patient;
    const caseId = consultation.id.slice(0, 8).toUpperCase();
    const verCode = generateVerificationCode(
        consultation.id,
        consultation.patient_id,
        consultation.created_at,
    );
    const createdDate = new Date(consultation.created_at);
    const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const reportTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN_TOP;

    // Load logo
    const logoBase64 = await loadLogoAsBase64();

    // ──────────────────────────────────────────
    // HELPER: Section Header
    // ──────────────────────────────────────────
    function sectionHeader(title: string) {
        checkPageBreak(14);
        y += 4;
        // Teal bar
        doc.setFillColor(...TEAL as [number, number, number]);
        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
        // Title text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE as [number, number, number]);
        doc.text(title, MARGIN_LEFT + 3, y + 5);
        y += 10;
        doc.setTextColor(...BLACK as [number, number, number]);
    }

    // ──────────────────────────────────────────
    // HELPER: Body Text
    // ──────────────────────────────────────────
    function bodyText(text: string, opts?: { bold?: boolean; color?: number[]; indent?: number }) {
        const color = opts?.color || GRAY_700;
        const indent = opts?.indent || 0;
        doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...color as [number, number, number]);
        const maxWidth = CONTENT_WIDTH - indent;
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = 4.2;
        for (const line of lines) {
            checkPageBreak(lineHeight + 1);
            doc.text(line, MARGIN_LEFT + indent, y);
            y += lineHeight;
        }
        y += 1;
    }

    // ──────────────────────────────────────────
    // HELPER: Key-Value Row
    // ──────────────────────────────────────────
    function kvRow(key: string, value: string) {
        checkPageBreak(6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text(key + ':', MARGIN_LEFT + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK as [number, number, number]);
        doc.text(value, MARGIN_LEFT + 42, y);
        y += 5;
    }

    // ──────────────────────────────────────────
    // HELPER: Page Break Check
    // ──────────────────────────────────────────
    function checkPageBreak(needed: number) {
        if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
            addFooter();
            doc.addPage();
            y = MARGIN_TOP;
        }
    }

    // ──────────────────────────────────────────
    // HELPER: Footer (per page)
    // ──────────────────────────────────────────
    function addFooter() {
        const footerY = PAGE_HEIGHT - 16;
        // Separator line
        doc.setDrawColor(...GRAY_300 as [number, number, number]);
        doc.setLineWidth(0.3);
        doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        // Left: confidentiality
        doc.text('Confidential Medical Document — cliniq.one', MARGIN_LEFT, footerY + 4);
        // Right: generation time
        doc.text(`Generated: ${reportDate} ${reportTime}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 4, { align: 'right' });
        // Center: page number (added at the end for total page count)
        // Bottom line: verification
        doc.setFontSize(6);
        doc.text(
            `Verification Code: ${verCode}  |  This document can be verified at cliniq.one/verify`,
            PAGE_WIDTH / 2,
            footerY + 8,
            { align: 'center' },
        );
    }

    // ══════════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════════
    // Light background
    doc.setFillColor(...LIGHT_TEAL_BG as [number, number, number]);
    doc.rect(0, 0, PAGE_WIDTH, 42, 'F');

    // Logo
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', MARGIN_LEFT, 4, 28, 28);
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...DARK_TEAL as [number, number, number]);
    doc.text('Medical Consultation Report', logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
    doc.text('cliniq.one — Telemedicine Platform', logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 22);
    doc.text(reportDate, logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 27);

    // ══════════════════════════════════════════
    // IDENTIFIER BAR
    // ══════════════════════════════════════════
    y = 38;
    doc.setFillColor(...TEAL as [number, number, number]);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE as [number, number, number]);
    doc.text(`Case ID: ${caseId}`, MARGIN_LEFT + 4, y + 6);

    const specialtyStr = (consultation.specialty || 'General').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    doc.text(`Specialty: ${specialtyStr}`, MARGIN_LEFT + 65, y + 6);

    doc.text(`Verification: ${verCode}`, PAGE_WIDTH - MARGIN_RIGHT - 4, y + 6, { align: 'right' });

    y = 52;

    // ══════════════════════════════════════════
    // SECTION 1: PATIENT INFORMATION
    // ══════════════════════════════════════════
    sectionHeader('PATIENT INFORMATION');
    if (patient) {
        const age = patient.year_of_birth
            ? `${new Date().getFullYear() - patient.year_of_birth} years`
            : 'N/A';
        kvRow('Patient', patient.nickname || 'N/A');
        kvRow('Age', age);
        kvRow('Gender', (patient.gender || 'N/A').replace(/\b\w/g, c => c.toUpperCase()));
        if (patient.city) {
            kvRow('Location', `${patient.city}${patient.country ? ', ' + patient.country : ''}`);
        }
        kvRow('Language', (patient.language || 'N/A').toUpperCase());
    } else {
        bodyText('Patient information not available.');
    }

    // ══════════════════════════════════════════
    // SECTION 2: CONSULTATION DETAILS
    // ══════════════════════════════════════════
    sectionHeader('CONSULTATION DETAILS');
    kvRow('Case ID', caseId);
    kvRow('Date', createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    kvRow('Time', createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    kvRow('Specialty', specialtyStr);
    kvRow('Priority', (consultation.priority || 'routine').replace(/\b\w/g, c => c.toUpperCase()));
    kvRow('Status', (consultation.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    if (doctorName) {
        kvRow('Attending Physician', doctorName);
    }

    // ══════════════════════════════════════════
    // SECTION 3: CHIEF COMPLAINT
    // ══════════════════════════════════════════
    sectionHeader('CHIEF COMPLAINT');
    bodyText(consultation.chief_complaint || 'No complaint provided.');

    // ══════════════════════════════════════════
    // SECTION 4: CLINICAL ASSESSMENT
    // ══════════════════════════════════════════
    if (report.diagnosis) {
        sectionHeader('CLINICAL ASSESSMENT');
        kvRow('Primary Diagnosis', report.diagnosis);
        if (report.icd10) {
            kvRow('ICD-10 Code', report.icd10);
        }
    }

    // ══════════════════════════════════════════
    // SECTION 5: TREATMENT PLAN
    // ══════════════════════════════════════════
    if (report.treatment_plan) {
        sectionHeader('TREATMENT PLAN');
        bodyText(report.treatment_plan);
    }

    // ══════════════════════════════════════════
    // SECTION 6: PRESCRIPTION
    // ══════════════════════════════════════════
    const meds = consultation.prescription?.medications;
    if (meds && meds.length > 0) {
        sectionHeader('PRESCRIPTION');
        checkPageBreak(10 + meds.length * 8);

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
            head: [['#', 'Medication', 'Dose', 'Frequency', 'Duration', 'Route', 'Notes']],
            body: meds.map((med: PrescriptionMedication, i: number) => [
                (i + 1).toString(),
                med.name || '',
                med.dose || med.dosage || '',
                med.frequency || '',
                med.duration || '',
                med.route || '',
                med.notes || med.instructions || '',
            ]),
            styles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: GRAY_700 as [number, number, number],
                lineColor: GRAY_300 as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: DARK_TEAL as [number, number, number],
                textColor: WHITE as [number, number, number],
                fontStyle: 'bold',
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: LIGHT_TEAL_BG as [number, number, number],
            },
            theme: 'grid',
        });

        y = (doc as any).lastAutoTable.finalY + 4;
    }

    // ══════════════════════════════════════════
    // SECTION 7: PATIENT EDUCATION
    // ══════════════════════════════════════════
    if (report.patient_education) {
        sectionHeader('PATIENT EDUCATION');
        bodyText(report.patient_education);
    }

    // ══════════════════════════════════════════
    // SECTION 8: FOLLOW-UP
    // ══════════════════════════════════════════
    if (report.follow_up || report.follow_up_timeframe) {
        sectionHeader('FOLLOW-UP RECOMMENDATIONS');
        if (report.follow_up) {
            bodyText(report.follow_up);
        }
        if (report.follow_up_timeframe) {
            kvRow('Timeframe', report.follow_up_timeframe);
        }
    }

    // ══════════════════════════════════════════
    // SECTION 9: REFERRAL NOTES (full variant only)
    // ══════════════════════════════════════════
    if (variant === 'full' && report.referral_notes) {
        sectionHeader('REFERRAL NOTES');
        bodyText(report.referral_notes);
    }

    // ══════════════════════════════════════════
    // SECTION 10: ORDERED INTERVENTIONS (full variant only)
    // ══════════════════════════════════════════
    if (variant === 'full' && interventions.length > 0) {
        sectionHeader('ORDERED INTERVENTIONS');
        checkPageBreak(10 + interventions.length * 8);

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
            head: [['#', 'Intervention', 'Type', 'Category', 'Priority', 'Status']],
            body: interventions.map((intv, i) => [
                (i + 1).toString(),
                intv.title || '',
                (intv.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                intv.category || '',
                (intv.priority || '').replace(/\b\w/g, c => c.toUpperCase()),
                (intv.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            ]),
            styles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: GRAY_700 as [number, number, number],
                lineColor: GRAY_300 as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: DARK_TEAL as [number, number, number],
                textColor: WHITE as [number, number, number],
                fontStyle: 'bold',
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: LIGHT_TEAL_BG as [number, number, number],
            },
            theme: 'grid',
        });

        y = (doc as any).lastAutoTable.finalY + 4;
    }

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

    checkPageBreak(26);
    y += 4;
    // Subtle disclaimer box
    doc.setDrawColor(...GRAY_300 as [number, number, number]);
    doc.setLineWidth(0.3);
    const disclaimerLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 8);
    const disclaimerHeight = disclaimerLines.length * 3.2 + 8;
    checkPageBreak(disclaimerHeight + 2);

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, disclaimerHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
    doc.text('⚖ Legal Disclaimer', MARGIN_LEFT + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    let disclaimerY = y + 9;
    for (const line of disclaimerLines) {
        doc.text(line, MARGIN_LEFT + 4, disclaimerY);
        disclaimerY += 3.2;
    }
    y += disclaimerHeight + 2;

    // ══════════════════════════════════════════
    // ADD FOOTERS TO ALL PAGES
    // ══════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter();
        // Page numbers
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
    }

    return doc;
}

// ══════════════════════════════════════════════
// CONVENIENCE: Download PDF
// ══════════════════════════════════════════════
export async function downloadMedicalPdf(data: MedicalPdfData): Promise<void> {
    const doc = await generateMedicalPdf(data);
    const caseId = data.consultation.id.slice(0, 8).toLowerCase();
    doc.save(`cliniq-report-${caseId}.pdf`);
}

// ══════════════════════════════════════════════
// CONVENIENCE: Open in new tab
// ══════════════════════════════════════════════
export async function previewMedicalPdf(data: MedicalPdfData): Promise<void> {
    const doc = await generateMedicalPdf(data);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}
