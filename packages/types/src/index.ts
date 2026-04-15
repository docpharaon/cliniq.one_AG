// ──────────────────────────────────────────
// User / Patient
// ──────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_requested' | 'exempt';

// ── Voice Transcription ──────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceMode = 'push_to_talk' | 'auto_mic';

export interface User {
    id: string;
    email: string;
    phone: string | null;
    nickname: string;
    year_of_birth: number | null;
    gender: Gender | null;
    country: string | null;
    city: string | null;
    language: 'en' | 'ar';
    role: UserRole;
    status: UserStatus;
    tokens_balance: number;
    avatar_url: string | null;
    insurance_provider: string | null;
    insurance_policy_number: string | null;
    total_consultations?: number;
    onboarding_completed: boolean;
    kyc_status: KycStatus;
    kyc_applicant_id: string | null;
    kyc_verified_at: string | null;
    kyc_rejection_reason: string | null;
    legal_accepted_at: string | null;
    created_at: string;
    updated_at: string;
}

// ──────────────────────────────────────────
// Doctor
// ──────────────────────────────────────────

export type DoctorStatus = 'pending' | 'active' | 'probation' | 'limited' | 'suspended' | 'inactive';
export type Specialty =
    | 'dermatology'
    | 'family_medicine'
    | 'pediatrics'
    | 'psychiatry'
    | 'orthopedics'
    | 'diet';

export interface Doctor {
    id: string;
    user_id: string;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: Specialty;
    sub_specialty: string | null;
    years_experience: number;
    languages: string[];
    hospital: string | null;
    city: string | null;
    bio: string | null;
    avatar_url: string | null;
    status: DoctorStatus;
    daily_limit: number;
    rating_avg: number;
    rating_count: number;
    tokens_earned: number;
    is_accepting: boolean;
    must_change_password: boolean;
    // Locum fields
    doctor_type: 'permanent' | 'locum';
    identifier_code: string | null;
    sandbox_mode: boolean;
    credential_expires_at: string | null;
    consultation_fee_tokens: number | null;
    onboarding_status: 'documents_pending' | 'review_pending' | 'approved' | 'rejected' | null;
    recruitment_qr_payload: string | null;
    verified_at: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
}

// ──────────────────────────────────────────
// Consultation
// ──────────────────────────────────────────

export type ConsultationStatus =
    | 'draft'
    | 'intake_in_progress'
    | 'pending_payment'
    | 'submitted'
    | 'assigned'
    | 'in_progress'
    | 'inquiry_sent'
    | 'report_ready'
    | 'completed'
    | 'cancelled'
    | 'refunded';

export type ConsultationPriority = 'routine' | 'high' | 'urgent';

// ── AI Report (JSONB ai_summary) ─────────────

export interface AISummary {
    summary?: string;
    key_findings?: string[];
    differential_diagnoses?: string[];
    medications?: string[];
    allergies?: string[];
    triage_category?: string;
    recommended_specialty?: string;
    risk_factors?: string[];
    [key: string]: unknown; // allow extra fields from AI
}

// ── AI Entities (JSONB ai_entities) ──────────

export interface AIEntities {
    symptoms?: string[];
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    measurements?: Record<string, unknown>[];
    [key: string]: unknown;
}

// ── Doctor Report (JSONB report) ─────────────

export type WarningSeverity = 'emergency' | 'urgent' | 'monitor';
export type DifferentialLikelihood = 'most_likely' | 'possible' | 'less_likely' | 'unlikely';
export type SeverityLabel = 'mild' | 'moderate' | 'severe';

export interface SeverityAssessment {
    pruritus_vas?: number;                     // 0-10 Visual Analog Scale
    bsa_percentage?: number;                   // 0-100 Body Surface Area
    iga_score?: number;                        // 0-5 Investigator Global Assessment
    easi_score?: number;                       // EASI-lite score
    severity_label?: SeverityLabel;
}

export interface RankedDifferential {
    diagnosis: string;
    icd10?: string;
    likelihood: DifferentialLikelihood;
    reasoning: string;
}

export interface PrioritizedWarningSign {
    symptom: string;
    symptom_ar?: string;
    level: WarningSeverity;
    action: string;
    action_ar?: string;
}

export interface ConsultationReport {
    // ─── Core Clinical ───
    diagnosis?: string;
    diagnosis_ar?: string;
    icd10?: string;
    snomed_ct?: string;
    treatment_plan?: string;
    treatment_plan_ar?: string;
    patient_education?: string;
    patient_education_ar?: string;
    follow_up?: string;
    follow_up_ar?: string;
    follow_up_timeframe?: string;
    referral_notes?: string;

    // ─── Clinical Quality ───
    severity_assessment?: SeverityAssessment;
    clinical_reasoning?: string;
    clinical_reasoning_ar?: string;
    ai_confidence?: number;                    // 0-100 percentage
    differential_diagnoses?: RankedDifferential[];
    treatment_rationale?: string;
    treatment_rationale_ar?: string;
    step_down_plan?: string;
    step_down_plan_ar?: string;
    escalation_protocol?: string;
    escalation_protocol_ar?: string;

    // ─── Safety ───
    warning_signs?: string[] | string;
    warning_signs_ar?: string;
    warning_signs_priority?: PrioritizedWarningSign[];

    // ─── Non-pharmacologic ───
    non_pharmacologic?: string;
    non_pharmacologic_ar?: string;

    // ─── Legal / Consent ───
    telemedicine_consent_note?: string;
    telemedicine_consent_note_ar?: string;

    [key: string]: unknown;
}

// ── Prescription (JSONB prescription) ────────

export type MedicationType = 'rx' | 'otc';

export interface PrescriptionMedication {
    name: string;
    dose?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    route?: string;
    instructions?: string;
    notes?: string;
    // ─── Classification ───
    medication_type?: MedicationType;
    potency_class?: string;
    // ─── Refill ───
    refill_eligible?: boolean;
    refill_count?: number;
    refill_reason_blocked?: string;
    // ─── Safety ───
    warnings?: string[];
}

export interface Prescription {
    medications?: PrescriptionMedication[];
    notes?: string;
    [key: string]: unknown;
}

// ── Consultation ─────────────────────────────

export interface Consultation {
    id: string;
    patient_id: string;
    doctor_id: string | null;
    specialty: Specialty;
    status: ConsultationStatus;
    priority: ConsultationPriority;
    chief_complaint: string;
    ai_summary: AISummary | null;
    ai_entities: AIEntities | null;
    token_cost: number;
    payment_method: string | null;
    report: ConsultationReport | null;
    prescription: Prescription | null;
    protocol_flags: string[];
    follow_up_id: string | null;
    created_at: string;
    assigned_at: string | null;
    completed_at: string | null;
}

// ──────────────────────────────────────────
// Doctor Inquiry
// ──────────────────────────────────────────

export type DoctorInquiryStatus = 'pending' | 'answered' | 'expired' | 'cancelled';
export type DoctorInquiryRequestType = 'text' | 'skin_photo' | 'medication_photo' | 'document_photo';

export interface DoctorInquiry {
    id: string;
    consultation_id: string;
    doctor_id: string;
    question_text: string;
    ai_improved_text: string | null;
    request_type: DoctorInquiryRequestType;
    response_summary: Record<string, unknown> | null;
    chat_history: { role: string; content: string }[] | null;
    status: DoctorInquiryStatus;
    max_turns: number;
    turn_count: number;
    deadline_at: string;
    created_at: string;
    answered_at: string | null;
}

// ──────────────────────────────────────────
// Messages
// ──────────────────────────────────────────

export type MessageType = 'text' | 'system' | 'report' | 'prescription' | 'photo';
export type SenderRole = 'patient' | 'doctor' | 'system';

export interface Message {
    id: string;
    consultation_id: string;
    sender_id: string | null;
    sender_role: SenderRole;
    content: string;
    message_type: MessageType;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

// ──────────────────────────────────────────
// Tokens
// ──────────────────────────────────────────

export type TokenTransactionType = 'purchase' | 'spend' | 'earn' | 'refund' | 'bonus' | 'admin_grant';

export interface TokenTransaction {
    id: string;
    user_id: string;
    type: TokenTransactionType;
    amount: number;
    balance_after: number;
    consultation_id: string | null;
    description: string;
    created_at: string;
}

// ──────────────────────────────────────────
// AI Session
// ──────────────────────────────────────────

export interface AISession {
    id: string;
    consultation_id: string;
    round_number: number;
    questions: unknown[];  // JSONB — can be strings or structured objects
    answers: unknown[];    // JSONB — can be strings or structured objects
    entities_extracted: Record<string, unknown> | null;
    created_at: string;
}

// ──────────────────────────────────────────
// Protocol
// ──────────────────────────────────────────

export type ProtocolCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
export type ProtocolSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ProtocolLog {
    id: string;
    consultation_id: string;
    patient_id: string;
    protocol_code: ProtocolCode;
    severity: ProtocolSeverity;
    trigger_text: string;
    action_taken: string;
    resolved: boolean;
    created_at: string;
}

// ──────────────────────────────────────────
// Doctor Rating / Feedback
// ──────────────────────────────────────────

export interface DoctorRating {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    rating: number;            // 1–5
    comment: string | null;
    created_at: string;
}

// ──────────────────────────────────────────
// Token Packages
// ──────────────────────────────────────────

export interface TokenPackage {
    id: string;
    name: string;
    tokens: number;
    price_usd: number;
    price_sar: number;
    apple_product_id: string;
    google_product_id: string;
    is_active: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
    {
        id: 'basic',
        name: 'Basic',
        tokens: 3,
        price_usd: 9.99,
        price_sar: 37.49,
        apple_product_id: 'com.cliniqone.tokens.basic',
        google_product_id: 'tokens_basic',
        is_active: true,
    },
    {
        id: 'standard',
        name: 'Standard',
        tokens: 7,
        price_usd: 19.99,
        price_sar: 74.99,
        apple_product_id: 'com.cliniqone.tokens.standard',
        google_product_id: 'tokens_standard',
        is_active: true,
    },
    {
        id: 'premium',
        name: 'Premium',
        tokens: 15,
        price_usd: 39.99,
        price_sar: 149.99,
        apple_product_id: 'com.cliniqone.tokens.premium',
        google_product_id: 'tokens_premium',
        is_active: true,
    },
];

// ──────────────────────────────────────────
// Consultation Costs
// ──────────────────────────────────────────

export const CONSULTATION_COSTS = {
    new: 3,
    follow_up: 1,
    refill: 1,
    multi_specialty: 5,
} as const;

// ──────────────────────────────────────────
// Admin Feature Types
// ──────────────────────────────────────────

export interface DoctorSchedule {
    id: string;
    doctor_id: string;
    day_of_week: number;       // 0=Sun, 6=Sat
    start_time: string;        // HH:MM
    end_time: string;          // HH:MM
    is_active: boolean;
    created_at: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    title_ar: string;
    content: string;
    content_ar: string;
    image_url: string | null;
    category: string;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Advertisement {
    id: string;
    title: string;
    image_url: string;
    link_url: string | null;
    placement: 'dashboard' | 'consultation' | 'profile';
    start_date: string;
    end_date: string;
    is_active: boolean;
    impressions: number;
    clicks: number;
    created_at: string;
}

export interface ErrorReport {
    id: string;
    user_id: string;
    consultation_id: string | null;
    category: 'chat' | 'payment' | 'ui' | 'other';
    description: string;
    screenshot_url: string | null;
    status: 'open' | 'investigating' | 'resolved' | 'dismissed';
    admin_notes: string | null;
    created_at: string;
    resolved_at: string | null;
}

export interface AIPromptTemplate {
    id: string;
    name: string;
    specialty: string;
    prompt_type: 'system' | 'intake' | 'summary' | 'suggestion';
    content: string;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

export interface PlatformSetting {
    id: string;
    key: string;
    value: string;
    description: string;
    updated_by: string | null;
    updated_at: string;
}

// ──────────────────────────────────────────
// Intervention Management
// ──────────────────────────────────────────

export type InterventionType =
    | 'lab_test'
    | 'imaging'
    | 'referral'
    | 'therapy'
    | 'home_health'
    | 'follow_up';

export type InterventionStatus =
    | 'ordered'
    | 'pending_auth'
    | 'authorized'
    | 'scheduled'
    | 'in_progress'
    | 'completed'
    | 'results_ready'
    | 'reviewed'
    | 'cancelled';

export type InterventionPriority = 'routine' | 'urgent' | 'stat';

export type InsurancePreAuthStatus = 'not_required' | 'pending' | 'approved' | 'denied';

export type ProviderType =
    | 'lab'
    | 'imaging_center'
    | 'specialist'
    | 'therapy_center'
    | 'home_health';

export interface Intervention {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    type: InterventionType;
    status: InterventionStatus;
    priority: InterventionPriority;
    title: string;
    description: string | null;
    clinical_indication: string;
    category: string;                          // e.g. "Hematology", "Cardiology"
    specific_test: string | null;              // e.g. "CBC", "Allergy Panel"
    instructions_for_patient: string | null;
    doctor_notes: string | null;
    provider_id: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    estimated_cost_sar: number | null;
    actual_cost_sar: number | null;
    insurance_pre_auth_required: boolean;
    insurance_pre_auth_status: InsurancePreAuthStatus;
    follow_up_required: boolean;
    follow_up_intervention_id: string | null;
    results_url: string | null;
    results_summary: string | null;
    created_at: string;
    updated_at: string;
}

export interface ServiceProvider {
    id: string;
    name: string;
    name_ar: string;
    type: ProviderType;
    address: string;
    address_ar: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    operating_hours: Record<string, { open: string; close: string }> | null;
    rating_avg: number;
    rating_count: number;
    insurance_accepted: string[];
    services_offered: string[];
    home_collection_available: boolean;
    home_collection_fee_sar: number | null;
    avg_result_turnaround_hours: number | null;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface ServiceCatalogItem {
    id: string;
    category: string;
    subcategory: string | null;
    name: string;
    name_ar: string;
    description: string | null;
    description_ar: string | null;
    type: InterventionType;
    sample_required: string | null;            // e.g. "Blood (serum)", "Urine"
    fasting_required: boolean;
    avg_cost_sar: number | null;
    avg_turnaround_days: number | null;
    is_active: boolean;
    created_at: string;
}

export interface InterventionStatusLog {
    id: string;
    intervention_id: string;
    from_status: InterventionStatus | null;
    to_status: InterventionStatus;
    changed_by: string;
    notes: string | null;
    created_at: string;
}

// ──────────────────────────────────────────
// Intervention Constants
// ──────────────────────────────────────────

export const INTERVENTION_TYPE_LABELS: Record<InterventionType, { en: string; ar: string; icon: string }> = {
    lab_test: { en: 'Laboratory Test', ar: 'فحص مخبري', icon: '🔬' },
    imaging: { en: 'Imaging & Radiology', ar: 'تصوير وأشعة', icon: '📸' },
    referral: { en: 'Specialist Referral', ar: 'تحويل لأخصائي', icon: '👨‍⚕️' },
    therapy: { en: 'Physical Therapy', ar: 'علاج طبيعي', icon: '💪' },
    home_health: { en: 'Home Health', ar: 'رعاية منزلية', icon: '🏠' },
    follow_up: { en: 'Follow-up', ar: 'متابعة', icon: '📅' },
};

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, { en: string; ar: string; color: string }> = {
    ordered: { en: 'Ordered', ar: 'تم الطلب', color: '#F59E0B' },
    pending_auth: { en: 'Pending Auth', ar: 'بانتظار الموافقة', color: '#F97316' },
    authorized: { en: 'Authorized', ar: 'تم الاعتماد', color: '#3B82F6' },
    scheduled: { en: 'Scheduled', ar: 'مجدول', color: '#8B5CF6' },
    in_progress: { en: 'In Progress', ar: 'قيد التنفيذ', color: '#6366F1' },
    completed: { en: 'Completed', ar: 'مكتمل', color: '#10B981' },
    results_ready: { en: 'Results Ready', ar: 'النتائج جاهزة', color: '#14B8A6' },
    reviewed: { en: 'Reviewed', ar: 'تمت المراجعة', color: '#22C55E' },
    cancelled: { en: 'Cancelled', ar: 'ملغي', color: '#EF4444' },
};

export const LAB_TEST_CATEGORIES = [
    'Hematology',
    'Chemistry',
    'Allergy & Immunology',
    'Microbiology',
    'Serology',
    'Endocrinology',
    'Molecular',
    'Urinalysis',
    'Other',
] as const;

export const IMAGING_CATEGORIES = [
    'X-Ray',
    'Ultrasound',
    'CT Scan',
    'MRI',
    'Mammography',
    'DEXA Scan',
    'Other',
] as const;

export const REFERRAL_SPECIALTIES = [
    'Cardiology',
    'Pulmonology',
    'Gastroenterology',
    'Neurology',
    'Orthopedics',
    'Ophthalmology',
    'ENT',
    'Surgery',
    'Urology',
    'Gynecology',
    'Psychiatry',
    'Oncology',
    'Other',
] as const;

// ──────────────────────────────────────────
// Specialty-Based Intervention Catalog
// ──────────────────────────────────────────

export interface CatalogIntervention {
    name: string;
    type: InterventionType;
    category: string;
    estimated_cost_sar: number;
    instructions?: string;
}

export const SPECIALTY_INTERVENTIONS: Record<Specialty, CatalogIntervention[]> = {
    dermatology: [
        { name: 'Skin Biopsy', type: 'lab_test', category: 'Dermatopathology', estimated_cost_sar: 450, instructions: 'Keep area clean and dry before biopsy' },
        { name: 'Patch Testing (Allergy)', type: 'lab_test', category: 'Allergy', estimated_cost_sar: 600, instructions: 'Do not apply creams 48h before test' },
        { name: 'Skin Prick Test', type: 'lab_test', category: 'Allergy', estimated_cost_sar: 350, instructions: 'Stop antihistamines 5 days before test' },
        { name: 'CBC (Complete Blood Count)', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 80 },
        { name: 'IgE Total', type: 'lab_test', category: 'Immunology', estimated_cost_sar: 120 },
        { name: 'Fungal Culture', type: 'lab_test', category: 'Microbiology', estimated_cost_sar: 180 },
        { name: 'ANA (Antinuclear Antibody)', type: 'lab_test', category: 'Immunology', estimated_cost_sar: 200 },
        { name: 'Dermoscopy', type: 'imaging', category: 'Dermatoscopy', estimated_cost_sar: 200 },
        { name: 'Wood\'s Lamp Examination', type: 'imaging', category: 'Dermatoscopy', estimated_cost_sar: 150 },
        { name: 'Cryotherapy', type: 'therapy', category: 'Procedural', estimated_cost_sar: 300 },
        { name: 'Phototherapy (UV)', type: 'therapy', category: 'Light Therapy', estimated_cost_sar: 250, instructions: 'Avoid sun exposure 24h after session' },
        { name: 'Excision / Lesion Removal', type: 'referral', category: 'Surgery', estimated_cost_sar: 800 },
        { name: 'Dermatology Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
    family_medicine: [
        { name: 'CBC (Complete Blood Count)', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 80 },
        { name: 'Comprehensive Metabolic Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 150 },
        { name: 'Lipid Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 100, instructions: 'Fast for 12 hours before test' },
        { name: 'HbA1c', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 90 },
        { name: 'Thyroid Panel (TSH, T3, T4)', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 180 },
        { name: 'Urinalysis', type: 'lab_test', category: 'Urinalysis', estimated_cost_sar: 50 },
        { name: 'Vitamin D', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 120 },
        { name: 'Iron Studies', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 130 },
        { name: 'Chest X-Ray', type: 'imaging', category: 'X-Ray', estimated_cost_sar: 200, instructions: 'Remove jewelry and metal objects' },
        { name: 'Abdominal Ultrasound', type: 'imaging', category: 'Ultrasound', estimated_cost_sar: 350, instructions: 'Fast for 6 hours before scan' },
        { name: 'ECG', type: 'imaging', category: 'Cardiology', estimated_cost_sar: 150 },
        { name: 'Echocardiogram', type: 'imaging', category: 'Cardiology', estimated_cost_sar: 500 },
        { name: 'Cardiology Referral', type: 'referral', category: 'Cardiology', estimated_cost_sar: 300 },
        { name: 'Gastroenterology Referral', type: 'referral', category: 'Gastroenterology', estimated_cost_sar: 300 },
        { name: 'Pulmonology Referral', type: 'referral', category: 'Pulmonology', estimated_cost_sar: 300 },
        { name: 'Family Medicine Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
    pediatrics: [
        { name: 'CBC (Complete Blood Count)', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 80 },
        { name: 'Urinalysis', type: 'lab_test', category: 'Urinalysis', estimated_cost_sar: 50 },
        { name: 'Stool Analysis', type: 'lab_test', category: 'Microbiology', estimated_cost_sar: 60 },
        { name: 'Growth Hormone Panel', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 250 },
        { name: 'Chest X-Ray', type: 'imaging', category: 'X-Ray', estimated_cost_sar: 200 },
        { name: 'Pediatric ENT Referral', type: 'referral', category: 'ENT', estimated_cost_sar: 300 },
        { name: 'Pediatrics Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
    psychiatry: [
        { name: 'Thyroid Panel (TSH, T3, T4)', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 180, instructions: 'Fasting not required' },
        { name: 'CBC (Complete Blood Count)', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 80 },
        { name: 'Comprehensive Metabolic Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 150 },
        { name: 'Lithium Level', type: 'lab_test', category: 'Therapeutic Drug Monitoring', estimated_cost_sar: 120, instructions: 'Draw 12 hours after last dose' },
        { name: 'Valproic Acid Level', type: 'lab_test', category: 'Therapeutic Drug Monitoring', estimated_cost_sar: 120 },
        { name: 'Vitamin B12', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 100 },
        { name: 'Vitamin D', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 120 },
        { name: 'Drug Screening (Urine)', type: 'lab_test', category: 'Toxicology', estimated_cost_sar: 200, instructions: 'Random urine sample' },
        { name: 'HbA1c (Metabolic Monitoring)', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 90, instructions: 'Monitor for antipsychotic metabolic effects' },
        { name: 'Lipid Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 100, instructions: 'Fast for 12 hours. Monitor for antipsychotic metabolic effects' },
        { name: 'Prolactin Level', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 130, instructions: 'Check if on antipsychotics' },
        { name: 'ECG (QTc Monitoring)', type: 'imaging', category: 'Cardiology', estimated_cost_sar: 150, instructions: 'Baseline and periodic monitoring for QTc-prolonging medications' },
        { name: 'Psychological Testing', type: 'therapy', category: 'Psychology', estimated_cost_sar: 400 },
        { name: 'CBT (Cognitive Behavioral Therapy)', type: 'therapy', category: 'Psychology', estimated_cost_sar: 350 },
        { name: 'DBT (Dialectical Behavior Therapy)', type: 'therapy', category: 'Psychology', estimated_cost_sar: 400 },
        { name: 'Neurology Referral', type: 'referral', category: 'Neurology', estimated_cost_sar: 300 },
        { name: 'Psychology Referral', type: 'referral', category: 'Psychology', estimated_cost_sar: 300 },
        { name: 'Psychiatry Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 200 },
    ],
    orthopedics: [
        { name: 'X-Ray (Extremity)', type: 'imaging', category: 'X-Ray', estimated_cost_sar: 180 },
        { name: 'MRI (Joint)', type: 'imaging', category: 'MRI', estimated_cost_sar: 1200 },
        { name: 'Bone Density Scan', type: 'imaging', category: 'DEXA', estimated_cost_sar: 400 },
        { name: 'ESR / CRP', type: 'lab_test', category: 'Immunology', estimated_cost_sar: 100 },
        { name: 'Uric Acid', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 60 },
        { name: 'Physical Therapy', type: 'therapy', category: 'Rehabilitation', estimated_cost_sar: 200 },
        { name: 'Orthopedic Surgery Referral', type: 'referral', category: 'Surgery', estimated_cost_sar: 400 },
        { name: 'Orthopedics Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
    diet: [
        { name: 'CBC (Complete Blood Count)', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 80 },
        { name: 'Comprehensive Metabolic Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 150 },
        { name: 'Lipid Panel', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 100, instructions: 'Fast for 12 hours before test' },
        { name: 'HbA1c', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 90 },
        { name: 'Thyroid Panel (TSH, T3, T4)', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 180 },
        { name: 'Vitamin D', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 120 },
        { name: 'Vitamin B12', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 100 },
        { name: 'Iron Studies', type: 'lab_test', category: 'Hematology', estimated_cost_sar: 130 },
        { name: 'Fasting Insulin', type: 'lab_test', category: 'Endocrinology', estimated_cost_sar: 110, instructions: 'Fast for 10-12 hours before test' },
        { name: 'Food Allergy Panel (IgE)', type: 'lab_test', category: 'Allergy & Immunology', estimated_cost_sar: 450, instructions: 'No fasting required' },
        { name: 'Food Intolerance Panel (IgG)', type: 'lab_test', category: 'Allergy & Immunology', estimated_cost_sar: 500 },
        { name: 'Celiac Panel (tTG-IgA)', type: 'lab_test', category: 'Immunology', estimated_cost_sar: 200 },
        { name: 'Zinc Level', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 80 },
        { name: 'Magnesium Level', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 70 },
        { name: 'Folate (Folic Acid)', type: 'lab_test', category: 'Chemistry', estimated_cost_sar: 90 },
        { name: 'Body Composition Analysis (InBody)', type: 'imaging', category: 'Body Composition', estimated_cost_sar: 150 },
        { name: 'DEXA Body Composition Scan', type: 'imaging', category: 'Body Composition', estimated_cost_sar: 400 },
        { name: 'Endocrinology Referral', type: 'referral', category: 'Endocrinology', estimated_cost_sar: 300 },
        { name: 'Gastroenterology Referral', type: 'referral', category: 'Gastroenterology', estimated_cost_sar: 300 },
        { name: 'Diet & Nutrition Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
};

// ──────────────────────────────────────────
// ICD-10 Codes
// ──────────────────────────────────────────

export interface IcdCode {
    id: string;
    code: string;
    description: string;
    description_ar: string;
    category: string;
    specialty_tags: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ──────────────────────────────────────────
// Psychiatry Module Types
// ──────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high' | 'imminent';
export type MedicationPlanStatus = 'active' | 'paused' | 'discontinued' | 'completed';
export type TherapyPlanStatus = 'active' | 'completed' | 'discontinued';
export type FollowupPlanStatus = 'pending' | 'completed' | 'missed' | 'cancelled';
export type ScreeningSeverity = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
export type ConsentType = 'telepsychiatry' | 'disclosure' | 'release_to_family' | 'release_to_employer' | 'treatment';

export interface PsychiatricIntake {
    id: string;
    consultation_id: string;
    patient_id: string;
    symptom_duration: string | null;
    past_psychiatric_history: string | null;
    substance_use: {
        alcohol?: string;
        cannabis?: string;
        stimulants?: string;
        opioids?: string;
        tobacco?: string;
        other?: string;
    } | null;
    risk_flags: {
        suicidality?: boolean;
        self_harm?: boolean;
        aggression?: boolean;
        psychosis?: boolean;
        homicidality?: boolean;
    } | null;
    current_stressors: string | null;
    previous_treatments: string | null;
    hospitalization_history: string | null;
    created_at: string;
    updated_at: string;
}

export interface MentalStatusExam {
    id: string;
    consultation_id: string;
    doctor_id: string;
    appearance: string | null;
    behavior: string | null;
    speech: string | null;
    mood: string | null;
    affect: string | null;
    thought_process: string | null;
    thought_content: string | null;
    perceptions: string | null;
    cognition: string | null;
    insight: string | null;
    judgment: string | null;
    risk_level: RiskLevel | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface RiskAssessment {
    id: string;
    consultation_id: string;
    patient_id: string;
    assessed_by: string;
    suicidal_ideation: boolean;
    suicidal_plan: boolean;
    suicidal_intent: boolean;
    prior_attempts: number;
    self_harm: boolean;
    homicidal_ideation: boolean;
    psychosis_active: boolean;
    risk_level: RiskLevel;
    protective_factors: string | null;
    safety_plan: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    disposition: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ScreeningScore {
    id: string;
    consultation_id: string | null;
    patient_id: string;
    instrument: string;
    responses: { question_index: number; answer_value: number }[];
    total_score: number;
    severity: ScreeningSeverity | null;
    interpretation: string | null;
    administered_by: 'patient' | 'clinician';
    created_at: string;
}

export interface PsychiatricDiagnosis {
    id: string;
    consultation_id: string;
    doctor_id: string;
    primary_diagnosis: string;
    icd10_code: string | null;
    secondary_diagnoses: { diagnosis: string; icd10_code?: string }[] | null;
    differential: string | null;
    clinical_reasoning: string | null;
    created_at: string;
    updated_at: string;
}

export interface MedicationPlan {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    medication_name: string;
    generic_name: string | null;
    dose: string;
    frequency: string;
    route: string;
    indication: string | null;
    start_date: string | null;
    titration_schedule: Record<string, number> | null;
    side_effects_to_monitor: string[];
    interactions_noted: string[];
    refill_date: string | null;
    adherence_status: string;
    status: MedicationPlanStatus;
    discontinued_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface TherapyPlan {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    therapy_type: string;
    goals: string | null;
    frequency: string | null;
    duration_weeks: number | null;
    notes: string | null;
    status: TherapyPlanStatus;
    created_at: string;
    updated_at: string;
}

export interface FollowupPlan {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    followup_type: string;
    interval_weeks: number;
    scheduled_date: string | null;
    notes: string | null;
    status: FollowupPlanStatus;
    created_at: string;
    updated_at: string;
}

export interface ConsentRecord {
    id: string;
    patient_id: string;
    consultation_id: string | null;
    consent_type: ConsentType;
    granted: boolean;
    granted_at: string | null;
    revoked_at: string | null;
    notes: string | null;
    created_at: string;
}

// ──────────────────────────────────────────
// Screening Instruments
// ──────────────────────────────────────────

export interface ScreeningQuestion {
    index: number;
    text: string;
    text_ar: string;
}

export interface ScreeningInstrument {
    id: string;
    name: string;
    name_ar: string;
    description: string;
    questions: ScreeningQuestion[];
    options: { value: number; label: string; label_ar: string }[];
    scoring: { min: number; max: number; severity: ScreeningSeverity; label: string }[];
}

export const PHQ9_INSTRUMENT: ScreeningInstrument = {
    id: 'PHQ-9',
    name: 'Patient Health Questionnaire (PHQ-9)',
    name_ar: 'استبيان صحة المريض (PHQ-9)',
    description: 'Depression screening and severity measure',
    questions: [
        { index: 0, text: 'Little interest or pleasure in doing things', text_ar: 'قلة الاهتمام أو المتعة في القيام بالأشياء' },
        { index: 1, text: 'Feeling down, depressed, or hopeless', text_ar: 'الشعور بالحزن أو الاكتئاب أو اليأس' },
        { index: 2, text: 'Trouble falling or staying asleep, or sleeping too much', text_ar: 'صعوبة في النوم أو البقاء نائماً أو النوم كثيراً' },
        { index: 3, text: 'Feeling tired or having little energy', text_ar: 'الشعور بالتعب أو قلة الطاقة' },
        { index: 4, text: 'Poor appetite or overeating', text_ar: 'ضعف الشهية أو الإفراط في الأكل' },
        { index: 5, text: 'Feeling bad about yourself — or that you are a failure', text_ar: 'الشعور بالسوء تجاه نفسك أو أنك فاشل' },
        { index: 6, text: 'Trouble concentrating on things', text_ar: 'صعوبة في التركيز على الأشياء' },
        { index: 7, text: 'Moving or speaking so slowly that others noticed, or being fidgety/restless', text_ar: 'التحرك أو التحدث ببطء شديد أو التململ والقلق' },
        { index: 8, text: 'Thoughts that you would be better off dead, or of hurting yourself', text_ar: 'أفكار بأنك ستكون أفضل حالاً ميتاً أو بإيذاء نفسك' },
    ],
    options: [
        { value: 0, label: 'Not at all', label_ar: 'أبداً' },
        { value: 1, label: 'Several days', label_ar: 'عدة أيام' },
        { value: 2, label: 'More than half the days', label_ar: 'أكثر من نصف الأيام' },
        { value: 3, label: 'Nearly every day', label_ar: 'تقريباً كل يوم' },
    ],
    scoring: [
        { min: 0, max: 4, severity: 'minimal', label: 'Minimal depression' },
        { min: 5, max: 9, severity: 'mild', label: 'Mild depression' },
        { min: 10, max: 14, severity: 'moderate', label: 'Moderate depression' },
        { min: 15, max: 19, severity: 'moderately_severe', label: 'Moderately severe depression' },
        { min: 20, max: 27, severity: 'severe', label: 'Severe depression' },
    ],
};

export const GAD7_INSTRUMENT: ScreeningInstrument = {
    id: 'GAD-7',
    name: 'Generalized Anxiety Disorder (GAD-7)',
    name_ar: 'مقياس اضطراب القلق العام (GAD-7)',
    description: 'Anxiety screening and severity measure',
    questions: [
        { index: 0, text: 'Feeling nervous, anxious, or on edge', text_ar: 'الشعور بالتوتر أو القلق أو العصبية' },
        { index: 1, text: 'Not being able to stop or control worrying', text_ar: 'عدم القدرة على التوقف عن القلق أو السيطرة عليه' },
        { index: 2, text: 'Worrying too much about different things', text_ar: 'القلق المفرط بشأن أشياء مختلفة' },
        { index: 3, text: 'Trouble relaxing', text_ar: 'صعوبة في الاسترخاء' },
        { index: 4, text: 'Being so restless that it is hard to sit still', text_ar: 'كثرة التململ لدرجة صعوبة الجلوس بثبات' },
        { index: 5, text: 'Becoming easily annoyed or irritable', text_ar: 'سهولة الانزعاج أو التهيج' },
        { index: 6, text: 'Feeling afraid, as if something awful might happen', text_ar: 'الشعور بالخوف كأن شيئاً سيئاً سيحدث' },
    ],
    options: [
        { value: 0, label: 'Not at all', label_ar: 'أبداً' },
        { value: 1, label: 'Several days', label_ar: 'عدة أيام' },
        { value: 2, label: 'More than half the days', label_ar: 'أكثر من نصف الأيام' },
        { value: 3, label: 'Nearly every day', label_ar: 'تقريباً كل يوم' },
    ],
    scoring: [
        { min: 0, max: 4, severity: 'minimal', label: 'Minimal anxiety' },
        { min: 5, max: 9, severity: 'mild', label: 'Mild anxiety' },
        { min: 10, max: 14, severity: 'moderate', label: 'Moderate anxiety' },
        { min: 15, max: 21, severity: 'severe', label: 'Severe anxiety' },
    ],
};

// ──────────────────────────────────────────
// Psychiatry Visit Types
// ──────────────────────────────────────────

export const PSYCH_VISIT_TYPES = [
    { id: 'initial_evaluation', label: 'Initial Psychiatric Evaluation', label_ar: 'التقييم النفسي الأولي', token_cost: 5 },
    { id: 'medication_management', label: 'Medication Management Follow-up', label_ar: 'متابعة إدارة الأدوية', token_cost: 2 },
    { id: 'psychotherapy_session', label: 'Psychotherapy Session', label_ar: 'جلسة علاج نفسي', token_cost: 3 },
    { id: 'crisis_visit', label: 'Crisis Visit', label_ar: 'زيارة طارئة', token_cost: 1 },
    { id: 'family_session', label: 'Family Session', label_ar: 'جلسة عائلية', token_cost: 4 },
    { id: 'telepsychiatry_followup', label: 'Telepsychiatry Follow-up', label_ar: 'متابعة عن بعد', token_cost: 2 },
] as const;

export function scorePHQ9(totalScore: number): { severity: ScreeningSeverity; label: string } {
    const tier = PHQ9_INSTRUMENT.scoring.find(s => totalScore >= s.min && totalScore <= s.max);
    return tier ? { severity: tier.severity, label: tier.label } : { severity: 'minimal', label: 'Minimal depression' };
}

export function scoreGAD7(totalScore: number): { severity: ScreeningSeverity; label: string } {
    const tier = GAD7_INSTRUMENT.scoring.find(s => totalScore >= s.min && totalScore <= s.max);
    return tier ? { severity: tier.severity, label: tier.label } : { severity: 'minimal', label: 'Minimal anxiety' };
}

// ──────────────────────────────────────────
// Orthopedics Module Types
// ──────────────────────────────────────────

export type PainLaterality = 'left' | 'right' | 'bilateral' | 'midline';
export type MSKExamSeverity = 'mild' | 'moderate' | 'severe';
export type PhysicalTherapyPlanStatus = 'active' | 'completed' | 'discontinued';

export interface OrthopedicIntake {
    id: string;
    consultation_id: string;
    patient_id: string;
    // Pain Profile (OPQRST)
    pain_location: string | null;
    pain_laterality: PainLaterality | null;
    pain_onset: string | null;
    pain_duration: string | null;
    pain_character: string | null;
    pain_severity: number | null;           // VAS 0-10
    pain_aggravating: string | null;
    pain_relieving: string | null;
    pain_radiation: string | null;
    pain_timing: string | null;
    // Injury & Trauma
    mechanism_of_injury: string | null;
    injury_date: string | null;
    prior_injuries: { area: string; year: string; treatment: string }[] | null;
    prior_surgeries: { procedure: string; year: string; outcome: string }[] | null;
    prior_imaging: string | null;
    // Functional Status
    mobility_aids: string[] | null;
    functional_limitations: string | null;
    occupation_impact: string | null;
    exercise_activity: string | null;
    // Red Flags
    red_flags: {
        night_pain?: boolean;
        unexplained_weight_loss?: boolean;
        fever?: boolean;
        neuro_deficit?: boolean;
        bowel_bladder_dysfunction?: boolean;
        history_of_cancer?: boolean;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface MusculoskeletalExam {
    id: string;
    consultation_id: string;
    doctor_id: string;
    body_region: string;
    laterality: PainLaterality | 'N/A' | null;
    inspection: string | null;
    palpation: string | null;
    range_of_motion: Record<string, string> | null;         // { flexion: "120°", extension: "0°", ... }
    special_tests: { test_name: string; result: string; positive?: boolean; notes?: string }[] | null;
    neurovascular_status: string | null;
    gait_assessment: string | null;
    clinical_impression: string | null;
    severity: MSKExamSeverity | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface PhysicalTherapyPlan {
    id: string;
    consultation_id: string;
    patient_id: string;
    doctor_id: string;
    therapy_type: string;
    body_region: string;
    goals: string | null;
    frequency: string | null;
    duration_weeks: number | null;
    precautions: string | null;
    home_exercise_program: string | null;
    notes: string | null;
    status: PhysicalTherapyPlanStatus;
    created_at: string;
    updated_at: string;
}

// ──────────────────────────────────────────
// Orthopedics Visit Types
// ──────────────────────────────────────────

export const ORTHO_VISIT_TYPES = [
    { id: 'initial_evaluation', label: 'Initial Orthopedic Evaluation', label_ar: 'التقييم العظمي الأولي', token_cost: 3 },
    { id: 'follow_up', label: 'Follow-up Visit', label_ar: 'زيارة متابعة', token_cost: 1 },
    { id: 'pt_review', label: 'Physical Therapy Review', label_ar: 'مراجعة العلاج الطبيعي', token_cost: 2 },
    { id: 'injection_consult', label: 'Injection / Procedure Consult', label_ar: 'استشارة حقن / إجراء', token_cost: 2 },
    { id: 'imaging_review', label: 'Imaging Review', label_ar: 'مراجعة الأشعة', token_cost: 2 },
    { id: 'second_opinion', label: 'Second Opinion', label_ar: 'رأي ثانٍ', token_cost: 3 },
] as const;

// ──────────────────────────────────────────
// Refund System
// ──────────────────────────────────────────

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'processed';
export type RefundRequesterRole = 'patient' | 'doctor' | 'admin';

export type DoctorRefundReason =
    | 'insufficient_info'
    | 'inappropriate_case'
    | 'outside_specialty'
    | 'patient_unresponsive'
    | 'technical_issue'
    | 'duplicate_consultation'
    | 'other';

export type PatientRefundReason =
    | 'unsatisfactory_response'
    | 'delayed_response'
    | 'wrong_specialty'
    | 'technical_issue'
    | 'accidental_submission'
    | 'other';

export type AdminRefundReason =
    | 'quality_issue'
    | 'system_error'
    | 'policy_violation'
    | 'patient_complaint'
    | 'doctor_complaint'
    | 'other';

export type RefundReasonCategory = DoctorRefundReason | PatientRefundReason | AdminRefundReason;

export interface RefundRequest {
    id: string;
    consultation_id: string;
    requested_by: string;
    requester_role: RefundRequesterRole;
    reason_category: RefundReasonCategory;
    reason_text: string | null;
    refund_amount: number;
    status: RefundRequestStatus;
    reviewed_by: string | null;
    review_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
}

// ── Refund Reason Labels (Bilingual) ─────────

export const DOCTOR_REFUND_REASON_LABELS: Record<DoctorRefundReason, { en: string; ar: string }> = {
    insufficient_info: { en: 'Insufficient Patient Information', ar: 'معلومات المريض غير كافية' },
    inappropriate_case: { en: 'Inappropriate for Teleconsultation', ar: 'غير مناسب للاستشارة عن بُعد' },
    outside_specialty: { en: 'Outside My Specialty', ar: 'خارج تخصصي' },
    patient_unresponsive: { en: 'Patient Unresponsive', ar: 'المريض لا يستجيب' },
    technical_issue: { en: 'Technical Issue', ar: 'مشكلة تقنية' },
    duplicate_consultation: { en: 'Duplicate Consultation', ar: 'استشارة مكررة' },
    other: { en: 'Other', ar: 'أخرى' },
};

export const PATIENT_REFUND_REASON_LABELS: Record<PatientRefundReason, { en: string; ar: string }> = {
    unsatisfactory_response: { en: 'Unsatisfactory Response', ar: 'استجابة غير مرضية' },
    delayed_response: { en: 'Delayed Response', ar: 'تأخر في الاستجابة' },
    wrong_specialty: { en: 'Wrong Specialty', ar: 'تخصص خاطئ' },
    technical_issue: { en: 'Technical Issue', ar: 'مشكلة تقنية' },
    accidental_submission: { en: 'Accidental Submission', ar: 'إرسال بالخطأ' },
    other: { en: 'Other', ar: 'أخرى' },
};

export const ADMIN_REFUND_REASON_LABELS: Record<AdminRefundReason, { en: string; ar: string }> = {
    quality_issue: { en: 'Quality Issue', ar: 'مشكلة في الجودة' },
    system_error: { en: 'System Error', ar: 'خطأ في النظام' },
    policy_violation: { en: 'Policy Violation', ar: 'مخالفة للسياسة' },
    patient_complaint: { en: 'Patient Complaint', ar: 'شكوى مريض' },
    doctor_complaint: { en: 'Doctor Complaint', ar: 'شكوى طبيب' },
    other: { en: 'Other', ar: 'أخرى' },
};

export const REFUND_STATUS_LABELS: Record<RefundRequestStatus, { en: string; ar: string; color: string; icon: string }> = {
    pending: { en: 'Pending Review', ar: 'بانتظار المراجعة', color: '#F59E0B', icon: '⏳' },
    approved: { en: 'Approved', ar: 'تمت الموافقة', color: '#3B82F6', icon: '✅' },
    rejected: { en: 'Rejected', ar: 'مرفوض', color: '#EF4444', icon: '❌' },
    auto_approved: { en: 'Auto-Approved', ar: 'موافقة تلقائية', color: '#10B981', icon: '⚡' },
    processed: { en: 'Refund Processed', ar: 'تم الاسترداد', color: '#22C55E', icon: '💰' },
};

// ──────────────────────────────────────────
// Specialty Override (Temporary Disable)
// ──────────────────────────────────────────

export type SpecialtyDisableMode = 'silent' | 'announced';

export type SpecialtyDisableReason =
    | 'doctor_unavailable'
    | 'scheduling_conflict'
    | 'system_maintenance'
    | 'quality_review'
    | 'regulatory'
    | 'staffing_shortage'
    | 'other';

export interface SpecialtyOverride {
    id: string;
    specialty: Specialty;
    is_disabled: boolean;
    mode: SpecialtyDisableMode;
    reason_code: SpecialtyDisableReason;
    reason_text: string;
    patient_message: string | null;
    disabled_by: string;
    disabled_at: string;
    restored_by: string | null;
    restored_at: string | null;
    created_at: string;
}

export type SpecialtyIncidentStatus = 'open' | 'acknowledged' | 'resolved';

export interface SpecialtyIncident {
    id: string;
    override_id: string;
    patient_id: string;
    specialty: Specialty;
    chief_complaint: string;
    ai_reasoning: string;
    ai_confidence: number | null;
    status: SpecialtyIncidentStatus;
    admin_notes: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
}

// ── Specialty Disable Reason Labels (Bilingual) ─────────

export const SPECIALTY_DISABLE_REASON_LABELS: Record<SpecialtyDisableReason, { en: string; ar: string; icon: string }> = {
    doctor_unavailable: { en: 'Doctor Unavailable', ar: 'الطبيب غير متاح', icon: '👨‍⚕️' },
    scheduling_conflict: { en: 'Scheduling Conflict', ar: 'تعارض في الجدول', icon: '📅' },
    system_maintenance: { en: 'System Maintenance', ar: 'صيانة النظام', icon: '🔧' },
    quality_review: { en: 'Quality Review', ar: 'مراجعة الجودة', icon: '🔍' },
    regulatory: { en: 'Regulatory Requirement', ar: 'متطلب تنظيمي', icon: '⚖️' },
    staffing_shortage: { en: 'Staffing Shortage', ar: 'نقص في الكادر', icon: '👥' },
    other: { en: 'Other', ar: 'أخرى', icon: '📝' },
};

export const SPECIALTY_DISABLE_MODE_LABELS: Record<SpecialtyDisableMode, { en: string; ar: string; icon: string; description: string }> = {
    silent: {
        en: 'Silent',
        ar: 'صامت',
        icon: '🔇',
        description: 'Patient is silently rerouted to Family Medicine without knowing the specialty was disabled',
    },
    announced: {
        en: 'Announced',
        ar: 'مُعلن',
        icon: '📢',
        description: 'Patient is informed of the situation and offered Family Medicine as a fallback option',
    },
};

export const SPECIALTY_LABELS: Record<Specialty, { en: string; ar: string; icon: string; color: string }> = {
    dermatology: { en: 'Dermatology', ar: 'الأمراض الجلدية', icon: '🧴', color: '#F472B6' },
    family_medicine: { en: 'Family Medicine', ar: 'طب الأسرة', icon: '🏥', color: '#2DD4BF' },
    pediatrics: { en: 'Pediatrics', ar: 'طب الأطفال', icon: '👶', color: '#60A5FA' },
    psychiatry: { en: 'Psychiatry', ar: 'الطب النفسي', icon: '🧠', color: '#A78BFA' },
    orthopedics: { en: 'Orthopedics', ar: 'جراحة العظام', icon: '🦴', color: '#FB923C' },
    diet: { en: 'Diet & Nutrition', ar: 'التغذية', icon: '🥗', color: '#34D399' },
};

export const SPECIALTY_INCIDENT_STATUS_LABELS: Record<SpecialtyIncidentStatus, { en: string; ar: string; color: string; icon: string }> = {
    open: { en: 'Open', ar: 'مفتوح', color: '#EF4444', icon: '🔴' },
    acknowledged: { en: 'Acknowledged', ar: 'تم الإقرار', color: '#F59E0B', icon: '🟡' },
    resolved: { en: 'Resolved', ar: 'تم الحل', color: '#22C55E', icon: '🟢' },
};
