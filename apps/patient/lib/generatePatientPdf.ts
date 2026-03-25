/**
 * Patient-Facing Medical Report PDF Generator — cliniq.one
 *
 * Simplified version of the medical report PDF for patients.
 * Omits internal clinical notes and AI assessment data.
 * Works on web platform only (uses DOM/canvas APIs).
 * On native, falls back to text-based report.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Consultation, PrescriptionMedication } from '@cliniqone/types';

// ── Colors ──────────────────────────────────
const TEAL          = [13, 148, 136];
const DARK_TEAL     = [15, 118, 110];
const BLACK         = [17, 24, 39];
const GRAY_700      = [55, 65, 81];
const GRAY_500      = [107, 114, 128];
const GRAY_300      = [209, 213, 219];
const LIGHT_TEAL_BG = [240, 253, 250];
const WHITE         = [255, 255, 255];

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

export function generatePatientPdf(consultation: Consultation): jsPDF {
    const report = consultation.report as Record<string, any> | null;
    if (!report) throw new Error('No report available');

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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
        doc.setFillColor(...TEAL as [number, number, number]);
        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE as [number, number, number]);
        doc.text(title, MARGIN_LEFT + 3, y + 5);
        y += 10;
        doc.setTextColor(...BLACK as [number, number, number]);
    }

    function bodyText(text: string) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_700 as [number, number, number]);
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
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text(key + ':', MARGIN_LEFT + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK as [number, number, number]);
        doc.text(value, MARGIN_LEFT + 42, y);
        y += 5;
    }

    function addFooter() {
        const footerY = PAGE_HEIGHT - 16;
        doc.setDrawColor(...GRAY_300 as [number, number, number]);
        doc.setLineWidth(0.3);
        doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
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
    doc.setFillColor(...LIGHT_TEAL_BG as [number, number, number]);
    doc.rect(0, 0, PAGE_WIDTH, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...DARK_TEAL as [number, number, number]);
    doc.text('Medical Consultation Report', MARGIN_LEFT, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
    doc.text('cliniq.one — Telemedicine Platform', MARGIN_LEFT, 22);
    doc.text(reportDate, MARGIN_LEFT, 27);

    // IDENTIFIER BAR
    y = 34;
    doc.setFillColor(...TEAL as [number, number, number]);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE as [number, number, number]);
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
    // CLINICAL ASSESSMENT
    // ══════════════════════════════════════════
    if (report.diagnosis) {
        sectionHeader('CLINICAL ASSESSMENT');
        kvRow('Diagnosis', report.diagnosis);
        if (report.icd10 || report.icd10_code) {
            kvRow('ICD-10 Code', report.icd10 || report.icd10_code);
        }
    }

    // ══════════════════════════════════════════
    // TREATMENT PLAN
    // ══════════════════════════════════════════
    if (report.treatment_plan) {
        sectionHeader('TREATMENT PLAN');
        bodyText(report.treatment_plan);
        if (report.treatment_plan_ar) {
            bodyText('(العربية)');
            bodyText(report.treatment_plan_ar);
        }
    }

    // ══════════════════════════════════════════
    // PRESCRIPTION
    // ══════════════════════════════════════════
    const meds: PrescriptionMedication[] = consultation.prescription?.medications || report.prescriptions || [];
    if (meds.length > 0) {
        sectionHeader('PRESCRIPTION');
        checkPageBreak(10 + meds.length * 8);

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
            head: [['#', 'Medication', 'Dose', 'Frequency', 'Duration', 'Route']],
            body: meds.map((med: any, i: number) => [
                (i + 1).toString(),
                med.name || med.medication || '',
                med.dose || med.dosage || '',
                med.frequency || '',
                med.duration || '',
                med.route || '',
            ]),
            styles: {
                fontSize: 8, cellPadding: 2,
                textColor: GRAY_700 as [number, number, number],
                lineColor: GRAY_300 as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: DARK_TEAL as [number, number, number],
                textColor: WHITE as [number, number, number],
                fontStyle: 'bold', fontSize: 8,
            },
            alternateRowStyles: { fillColor: LIGHT_TEAL_BG as [number, number, number] },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 4;
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
    // WARNING SIGNS
    // ══════════════════════════════════════════
    const warningSigns = report.warning_signs;
    if (warningSigns && (Array.isArray(warningSigns) ? warningSigns.length > 0 : warningSigns)) {
        sectionHeader('WARNING SIGNS');
        const wsText = Array.isArray(warningSigns) ? warningSigns.join(', ') : warningSigns;
        bodyText(wsText);
        if (report.warning_signs_ar) {
            bodyText('(العربية)');
            bodyText(report.warning_signs_ar);
        }
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

    const disclaimerLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 8);
    const disclaimerHeight = disclaimerLines.length * 3.2 + 8;
    checkPageBreak(disclaimerHeight + 6);
    y += 4;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...GRAY_300 as [number, number, number]);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, disclaimerHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
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
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
    }

    return doc;
}

/**
 * Generate and download PDF on web, or return text for native.
 */
export function downloadPatientPdf(consultation: Consultation, _lang?: string): boolean {
    try {
        const doc = generatePatientPdf(consultation);
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
export function getPatientPdfBlob(consultation: Consultation, _lang?: string): Blob | null {
    try {
        const doc = generatePatientPdf(consultation);
        return doc.output('blob');
    } catch {
        return null;
    }
}
