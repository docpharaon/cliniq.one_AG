// ──────────────────────────────────────────
// User / Patient
// ──────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';

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
    onboarding_completed: boolean;
    legal_accepted_at: string | null;
    created_at: string;
    updated_at: string;
}

// ──────────────────────────────────────────
// Doctor
// ──────────────────────────────────────────

export type DoctorStatus = 'pending' | 'active' | 'probation' | 'limited' | 'suspended' | 'inactive';
export type Specialty = 'dermatology' | 'family_medicine';

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
    | 'report_ready'
    | 'completed'
    | 'cancelled';

export type ConsultationPriority = 'routine' | 'high' | 'urgent';

export interface Consultation {
    id: string;
    patient_id: string;
    doctor_id: string | null;
    specialty: Specialty;
    status: ConsultationStatus;
    priority: ConsultationPriority;
    chief_complaint: string;
    ai_summary: Record<string, unknown> | null;
    ai_entities: Record<string, unknown> | null;
    token_cost: number;
    payment_method: string | null;
    report: Record<string, unknown> | null;
    prescription: Record<string, unknown> | null;
    protocol_flags: string[];
    follow_up_id: string | null;
    created_at: string;
    assigned_at: string | null;
    completed_at: string | null;
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
        { name: 'Cardiology Referral', type: 'referral', category: 'Cardiology', estimated_cost_sar: 300 },
        { name: 'Gastroenterology Referral', type: 'referral', category: 'Gastroenterology', estimated_cost_sar: 300 },
        { name: 'Family Medicine Follow-up', type: 'follow_up', category: 'Follow-up', estimated_cost_sar: 150 },
    ],
};
