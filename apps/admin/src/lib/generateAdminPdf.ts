/**
 * Admin Medical Report PDF Generator — cliniq.one
 *
 * Full-detail version for admin panel. Uses ConsultationFull shape
 * (flat properties like patient_name, doctor_name, etc.)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PrescriptionMedication } from '@cliniqone/types';

// ── Colors ──────────────────────────────────
const TEAL          = [13, 148, 136];
const DARK_TEAL     = [15, 118, 110];
const BLACK         = [17, 24, 39];
const GRAY_700      = [55, 65, 81];
const GRAY_500      = [107, 114, 128];
const GRAY_300      = [209, 213, 219];
const LIGHT_TEAL_BG = [240, 253, 250];
const WHITE         = [255, 255, 255];

const PAGE_WIDTH    = 210;
const PAGE_HEIGHT   = 297;
const MARGIN_LEFT   = 18;
const MARGIN_RIGHT  = 18;
const MARGIN_BOTTOM = 28;
const MARGIN_TOP    = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ── Types ───────────────────────────────────
interface AdminConsultation {
    id: string;
    patient_id: string;
    specialty: string;
    status: string;
    priority: string;
    chief_complaint: string | null;
    report: Record<string, any> | null;
    prescription: Record<string, any> | null;
    patient_name: string;
    doctor_name: string | null;
    created_at: string;
    completed_at: string | null;
    concluded_at: string | null;
    urgent_fee?: number;
    token_cost?: number;
    [key: string]: unknown;
}

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

async function loadLogoAsBase64(): Promise<string | null> {
    try {
        const response = await fetch('/cliniq-logo.png');
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 160; canvas.height = 160;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, 160, 160);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(blob);
        });
    } catch { return null; }
}

export async function downloadAdminPdf(consultation: AdminConsultation): Promise<void> {
    const c = consultation;
    const report = c.report || {};
    const caseId = c.id.slice(0, 8).toUpperCase();
    const verCode = generateVerificationCode(c.id, c.patient_id, c.created_at);
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const createdDate = new Date(c.created_at);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN_TOP;
    const logoBase64 = await loadLogoAsBase64();

    function checkPageBreak(needed: number) {
        if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
            addFooter(); doc.addPage(); y = MARGIN_TOP;
        }
    }

    function sectionHeader(title: string) {
        checkPageBreak(14); y += 4;
        doc.setFillColor(...TEAL as [number, number, number]);
        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(...WHITE as [number, number, number]);
        doc.text(title, MARGIN_LEFT + 3, y + 5);
        y += 10;
        doc.setTextColor(...BLACK as [number, number, number]);
    }

    function bodyText(text: string) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.setTextColor(...GRAY_700 as [number, number, number]);
        const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
        for (const line of lines) { checkPageBreak(5.2); doc.text(line, MARGIN_LEFT, y); y += 4.2; }
        y += 1;
    }

    function kvRow(key: string, value: string) {
        checkPageBreak(6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
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
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text('Confidential Medical Document — cliniq.one', MARGIN_LEFT, footerY + 4);
        doc.text(`Generated: ${reportDate} ${reportTime}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 4, { align: 'right' });
        doc.setFontSize(6);
        doc.text(`Verification Code: ${verCode}  |  This document can be verified at cliniq.one/verify`, PAGE_WIDTH / 2, footerY + 8, { align: 'center' });
    }

    // ═══ HEADER ═══
    doc.setFillColor(...LIGHT_TEAL_BG as [number, number, number]);
    doc.rect(0, 0, PAGE_WIDTH, 42, 'F');
    if (logoBase64) doc.addImage(logoBase64, 'PNG', MARGIN_LEFT, 4, 28, 28);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.setTextColor(...DARK_TEAL as [number, number, number]);
    doc.text('Medical Consultation Report', logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
    doc.text('cliniq.one — Telemedicine Platform', logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 22);
    doc.text(reportDate, logoBase64 ? MARGIN_LEFT + 33 : MARGIN_LEFT, 27);

    // ═══ IDENTIFIER BAR ═══
    y = 38;
    doc.setFillColor(...TEAL as [number, number, number]);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.setTextColor(...WHITE as [number, number, number]);
    doc.text(`Case ID: ${caseId}`, MARGIN_LEFT + 4, y + 6);
    const specStr = (c.specialty || 'General').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    doc.text(`Specialty: ${specStr}`, MARGIN_LEFT + 65, y + 6);
    doc.text(`Verification: ${verCode}`, PAGE_WIDTH - MARGIN_RIGHT - 4, y + 6, { align: 'right' });
    y = 52;

    // ═══ PATIENT & DOCTOR ═══
    sectionHeader('PATIENT & DOCTOR INFORMATION');
    kvRow('Patient', c.patient_name || 'N/A');
    kvRow('Doctor', c.doctor_name || 'Unassigned');
    kvRow('Specialty', specStr);

    // ═══ CONSULTATION DETAILS ═══
    sectionHeader('CONSULTATION DETAILS');
    kvRow('Case ID', caseId);
    kvRow('Created', createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    kvRow('Priority', (c.priority || 'routine').replace(/\b\w/g, ch => ch.toUpperCase()));
    kvRow('Status', (c.status || '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()));
    if (c.token_cost) kvRow('Token Cost', `${c.token_cost}${c.urgent_fee ? ` (+${c.urgent_fee} urgent)` : ''}`);

    // ═══ CHIEF COMPLAINT ═══
    sectionHeader('CHIEF COMPLAINT');
    bodyText(c.chief_complaint || 'No complaint provided.');

    // ═══ CLINICAL ASSESSMENT ═══
    if (report.diagnosis) {
        sectionHeader('CLINICAL ASSESSMENT');
        kvRow('Diagnosis', report.diagnosis);
        if (report.icd10) kvRow('ICD-10 Code', report.icd10);
    }

    // ═══ TREATMENT PLAN ═══
    if (report.treatment_plan) {
        sectionHeader('TREATMENT PLAN');
        bodyText(report.treatment_plan);
    }

    // ═══ PRESCRIPTION ═══
    const meds: PrescriptionMedication[] = c.prescription?.medications || [];
    if (meds.length > 0) {
        sectionHeader('PRESCRIPTION');
        checkPageBreak(10 + meds.length * 8);
        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
            head: [['#', 'Medication', 'Dose', 'Frequency', 'Duration', 'Route', 'Notes']],
            body: meds.map((med: PrescriptionMedication, i: number) => [
                (i + 1).toString(), med.name || '', med.dose || med.dosage || '',
                med.frequency || '', med.duration || '', med.route || '', med.notes || med.instructions || '',
            ]),
            styles: { fontSize: 8, cellPadding: 2, textColor: GRAY_700 as [number, number, number], lineColor: GRAY_300 as [number, number, number], lineWidth: 0.2 },
            headStyles: { fillColor: DARK_TEAL as [number, number, number], textColor: WHITE as [number, number, number], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: LIGHT_TEAL_BG as [number, number, number] },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 4;
    }

    // ═══ PATIENT EDUCATION ═══
    if (report.patient_education) { sectionHeader('PATIENT EDUCATION'); bodyText(report.patient_education); }

    // ═══ FOLLOW-UP ═══
    if (report.follow_up || report.follow_up_timeframe) {
        sectionHeader('FOLLOW-UP RECOMMENDATIONS');
        if (report.follow_up) bodyText(report.follow_up);
        if (report.follow_up_timeframe) kvRow('Timeframe', report.follow_up_timeframe);
    }

    // ═══ LEGAL DISCLAIMER ═══
    const disclaimerText =
        'TELEMEDICINE DISCLAIMER: This report is generated from a telemedicine consultation conducted via the cliniq.one platform. ' +
        'This consultation does not constitute an in-person medical examination. The medical opinion provided is based solely on ' +
        'patient-reported information and any digital media shared during the consultation. This document does not replace an ' +
        'in-person clinical evaluation, and the patient is advised to seek immediate in-person medical attention for any emergency ' +
        'or worsening symptoms. cliniq.one and the consulting physician are not liable for outcomes resulting from reliance on ' +
        'this telemedicine consultation in lieu of an in-person visit. All medical data is processed in compliance with applicable ' +
        'data protection regulations. By using this service, the patient acknowledges the inherent limitations of telemedicine consultations.';

    const dLines = doc.splitTextToSize(disclaimerText, CONTENT_WIDTH - 8);
    const dH = dLines.length * 3.2 + 8;
    checkPageBreak(dH + 6); y += 4;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...GRAY_300 as [number, number, number]);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, dH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_500 as [number, number, number]);
    doc.text('Legal Disclaimer', MARGIN_LEFT + 4, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    let dlY = y + 9;
    for (const line of dLines) { doc.text(line, MARGIN_LEFT + 4, dlY); dlY += 3.2; }

    // ═══ FOOTERS ═══
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter();
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_500 as [number, number, number]);
        doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
    }

    doc.save(`cliniq-report-${caseId.toLowerCase()}.pdf`);
}
