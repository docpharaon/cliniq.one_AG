import { useState, useRef, useEffect, useCallback } from 'react';

// ── Supabase Config ─────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const REST_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// ── Types ───────────────────────────────────────
interface Message {
    id: string;
    role: 'ai' | 'patient' | 'system';
    content: string;
    timestamp: number;
    mediaUrl?: string;          // URL of uploaded media
    mediaType?: 'photo' | 'document';
    mediaName?: string;         // Filename for documents
}

interface SequenceNode {
    id: string;
    sequence_id: string;
    step_key: string;
    label: string;
    emoji: string;
    prompt_id: string | null;
    sort_order: number;
    node_type: string;
    max_turns: number | null;
    specialty_condition: string | null;
    ai_prompts: {
        id: string;
        name: string;
        prompt_type: string;
        content: string;
        is_active: boolean;
        version: number;
    } | null;
}

interface ChatSectionResult {
    response: string;
    sectionComplete: boolean;
    addendumDone?: boolean;
    violation: string | null;
    promptVersion: number;
    chatbotVersion: string;
}

type Phase = 'welcome' | 'chat' | 'report' | 'blocked';
type Lang = 'ar' | 'en';
type WaPathway = 'followup' | 'new_visit' | 'booking' | null;
type WaPhase = 'wa_intake' | 'wa_followup' | 'wa_new_visit' | 'wa_booking' | 'wa_wrapup';

interface DoctorLocation {
    id: string; name: string; name_ar: string; address: string; address_ar: string;
    city: string; booking_mode: 'direct' | 'call_center' | 'disabled';
    call_center_phone: string | null; call_center_label: string | null;
    call_center_label_ar: string | null; call_center_whatsapp: boolean;
    slot_duration_minutes: number; advance_booking_days: number;
    color: string; hours: { day_of_week: number; start_time: string; end_time: string }[];
}
interface AvailableDate { slot_date: string; day_of_week: number; total_slots: number; available_slots: number; }
interface TimeSlot { slot_time: string; slot_end: string; available: boolean; remaining: number; }
interface BookingResult {
    id: string; date: string; time: string; slot_end: string; status: string;
    location_name: string; location_name_ar: string; location_address: string;
    doctor_name: string; doctor_full_name: string;
}
type BookingStep = 'idle' | 'locations' | 'dates' | 'slots' | 'confirming' | 'confirmed' | 'callcenter';

interface UploadedFile {
    url: string;
    name: string;
    type: 'photo' | 'document';
    size: number;
}

interface SubscriptionInfo {
    plan: string;
    features: Record<string, boolean>;
    sessionsRemaining: number;
    keyId: string;
}

interface DoctorInfo {
    id: string;
    display_name: string;
    full_name: string;
    specialty: string;
    avatar_url: string | null;
    whatsapp_number: string | null;
}

// ── Text Content ────────────────────────────────
const TEXT = {
    ar: {
        welcomeTitle: 'مساعد الاستشارة الطبية',
        welcomeSubtitle: 'سيطرح عليك المساعد الذكي بعض الأسئلة حول حالتك الصحية لإعداد تقرير طبي مفصل لطبيبك.',
        nameLabel: 'اسمك (اختياري)',
        namePlaceholder: 'أدخل اسمك',
        startBtn: 'ابدأ المقابلة',
        chatPlaceholder: 'اكتب رسالتك...',
        send: '→',
        aiName: 'مساعد cliniq.one',
        online: 'متصل',
        reportTitle: 'التقرير جاهز! ✓',
        reportSubtitle: 'انسخ التقرير التالي وأرسله إلى طبيبك عبر الواتساب',
        copyBtn: '📋 نسخ التقرير',
        copiedBtn: '✓ تم النسخ!',
        whatsappBtn: '💬 فتح الواتساب',
        restartBtn: 'بدء مقابلة جديدة',
        disclaimer: '⚕️ هذا المساعد لا يقدم تشخيصاً طبياً. يُرجى استشارة طبيبك للتشخيص والعلاج.',
        skipSection: 'القسم التالي ←',
        errorRetry: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
        loadingSequence: 'جاري تحميل الأسئلة...',
        attachPhoto: '📸 صورة',
        attachDoc: '📄 مستند',
        uploading: 'جاري الرفع...',
        uploadSuccess: 'تم الرفع ✓',
        uploadError: 'خطأ في الرفع',
        photoLabel: '📸 صورة مرفقة',
        docLabel: '📄 مستند مرفق',
        skipUpload: 'تخطي ←',
        blockedTitle: 'الخدمة غير متوفرة',
        blockedInvalidKey: 'رابط غير صالح. يرجى التواصل مع طبيبك للحصول على رابط جديد.',
        blockedExpired: 'انتهت صلاحية الاشتراك. يرجى التواصل مع طبيبك.',
        blockedLimit: 'تم استنفاد الحد الشهري للاستشارات. يرجى المحاولة لاحقاً.',
        blockedSuspended: 'الخدمة موقوفة مؤقتاً. يرجى التواصل مع طبيبك.',
        blockedGeneric: 'هذه الخدمة غير متوفرة حالياً.',
        // Booking translations
        bookingPickLocation: '📍 اختر الموقع',
        bookingPickDate: '📅 اختر التاريخ',
        bookingPickTime: '🕐 اختر الوقت',
        bookingConfirmBtn: '✅ تأكيد الحجز',
        bookingConfirming: 'جاري تأكيد الحجز...',
        bookingConfirmed: '✅ تم تأكيد موعدك!',
        bookingCallCenter: '📞 حجز عبر الاستقبال',
        bookingCallNow: '📞 اتصل الآن',
        bookingWhatsApp: '💬 واتساب',
        bookingDirect: '📅 احجز مباشرة',
        bookingNoLocations: 'لا توجد مواقع متاحة حالياً',
        bookingNoSlots: 'لا توجد مواعيد متاحة في هذا اليوم',
        bookingMorning: '🌅 صباحاً',
        bookingAfternoon: '🌇 مساءً',
        bookingSlotsAvailable: 'مواعيد متاحة',
        bookingDate: 'التاريخ',
        bookingTime: 'الوقت',
        bookingLocation: 'الموقع',
        bookingDoctor: 'الطبيب',
        bookingCancelBtn: '❌ إلغاء الحجز',
        bookingReportSection: '📅 الموعد',
        bookingStatus: 'الحالة',
        bookingStatusConfirmed: 'مؤكد ✅',
    },
    en: {
        welcomeTitle: 'Medical Intake Assistant',
        welcomeSubtitle: 'Our AI assistant will ask you questions about your health concern to prepare a detailed report for your doctor.',
        nameLabel: 'Your Name (optional)',
        namePlaceholder: 'Enter your name',
        startBtn: 'Start Interview',
        chatPlaceholder: 'Type your message...',
        send: '→',
        aiName: 'cliniq.one Assistant',
        online: 'Online',
        reportTitle: 'Report Ready! ✓',
        reportSubtitle: 'Copy the report below and send it to your doctor on WhatsApp',
        copyBtn: '📋 Copy Report',
        copiedBtn: '✓ Copied!',
        whatsappBtn: '💬 Open WhatsApp',
        restartBtn: 'Start New Interview',
        disclaimer: '⚕️ This assistant does not provide medical diagnosis. Please consult your doctor for diagnosis and treatment.',
        skipSection: 'Next Section →',
        errorRetry: 'An error occurred. Please try again.',
        loadingSequence: 'Loading questions...',
        attachPhoto: '📸 Photo',
        attachDoc: '📄 Document',
        uploading: 'Uploading...',
        uploadSuccess: 'Uploaded ✓',
        uploadError: 'Upload failed',
        photoLabel: '📸 Photo attached',
        docLabel: '📄 Document attached',
        skipUpload: 'Skip →',
        blockedTitle: 'Service Unavailable',
        blockedInvalidKey: 'Invalid link. Please contact your doctor for a new link.',
        blockedExpired: 'Subscription expired. Please contact your doctor.',
        blockedLimit: 'Monthly consultation limit reached. Please try again later.',
        blockedSuspended: 'Service temporarily suspended. Please contact your doctor.',
        blockedGeneric: 'This service is currently unavailable.',
        // Booking translations
        bookingPickLocation: '📍 Choose Location',
        bookingPickDate: '📅 Pick a Date',
        bookingPickTime: '🕐 Pick a Time',
        bookingConfirmBtn: '✅ Confirm Booking',
        bookingConfirming: 'Confirming booking...',
        bookingConfirmed: '✅ Appointment Confirmed!',
        bookingCallCenter: '📞 Book via Reception',
        bookingCallNow: '📞 Call Now',
        bookingWhatsApp: '💬 WhatsApp',
        bookingDirect: '📅 Book Online',
        bookingNoLocations: 'No locations available',
        bookingNoSlots: 'No slots available on this date',
        bookingMorning: '🌅 Morning',
        bookingAfternoon: '🌇 Afternoon',
        bookingSlotsAvailable: 'slots available',
        bookingDate: 'Date',
        bookingTime: 'Time',
        bookingLocation: 'Location',
        bookingDoctor: 'Doctor',
        bookingCancelBtn: '❌ Cancel Booking',
        bookingReportSection: '📅 Appointment',
        bookingStatus: 'Status',
        bookingStatusConfirmed: 'Confirmed ✅',
    },
};

// ── Strip internal tags ─────────────────────────
function stripTags(text: string): string {
    return text
        .replace(/\[ROUTE:\w+\]/gi, '')
        .replace(/\[PATHWAY:\w+\]/gi, '')
        .replace(/\[SECTION_COMPLETE\]/gi, '')
        .replace(/\[ADDENDUM_DONE\]/gi, '')
        .replace(/\[NO_RESPONSE_NEEDED\]/gi, '')
        .replace(/\[VIOLATION:[^\]]+\]/gi, '')
        .replace(/\[BOOKING_START\]/gi, '')
        .replace(/\[BOOKING_CONTEXT\][^\[]*/gi, '')
        .replace(/\[PHONE_COLLECTED\][+\d\s]*/gi, '')
        .replace(/كلينيك[\s.]?وان/g, 'cliniq.one')
        .replace(/كلنيك[\s.]?ون/g, 'cliniq.one')
        .trim();
}

// ── Detect route tag from AI response ───────────
function detectRoute(text: string): WaPathway {
    if (/\[ROUTE:followup\]/i.test(text)) return 'followup';
    if (/\[ROUTE:new_visit\]/i.test(text)) return 'new_visit';
    if (/\[ROUTE:booking\]/i.test(text)) return 'booking';
    return null;
}

// ── Detect booking tags ─────────────────────────
function detectBookingStart(text: string): boolean {
    return /\[BOOKING_START\]/i.test(text);
}
function detectPhoneCollected(text: string): string | null {
    const m = text.match(/\[PHONE_COLLECTED\]([+\d\s]+)/i);
    return m ? m[1].trim() : null;
}

// ── Booking RPC helpers ─────────────────────────
async function fetchDoctorLocationsRpc(doctorId: string): Promise<DoctorLocation[]> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_doctor_locations`, {
            method: 'POST', headers: { ...REST_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_doctor_id: doctorId }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data || [];
    } catch { return []; }
}
async function fetchAvailableDatesRpc(locationId: string, daysAhead = 14): Promise<AvailableDate[]> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_available_dates`, {
            method: 'POST', headers: { ...REST_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_location_id: locationId, p_days_ahead: daysAhead }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data || [];
    } catch { return []; }
}
async function fetchAvailableSlotsRpc(locationId: string, date: string): Promise<TimeSlot[]> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_available_slots`, {
            method: 'POST', headers: { ...REST_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_location_id: locationId, p_date: date }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data || [];
    } catch { return []; }
}
async function createBookingRpc(
    keyCode: string | null, locationId: string, date: string, time: string,
    name: string, phone: string | null, language: string, sessionId: string | null,
): Promise<{ success: boolean; error?: string; booking?: BookingResult }> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_wa_booking`, {
            method: 'POST', headers: { ...REST_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                p_key_code: keyCode, p_location_id: locationId, p_date: date,
                p_time: time, p_patient_name: name, p_patient_phone: phone,
                p_patient_language: language, p_session_id: sessionId,
            }),
        });
        if (!res.ok) return { success: false, error: 'server_error' };
        return await res.json();
    } catch { return { success: false, error: 'network_error' }; }
}

const DAY_LABELS: Record<string, Record<number, string>> = {
    ar: { 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' },
    en: { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' },
};
function fmtDateShort(dateStr: string, lang: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay();
    const day = d.getDate();
    const dowLabel = DAY_LABELS[lang]?.[dow] || DAY_LABELS.en[dow];
    return `${dowLabel} ${day}`;
}
function fmtTime12(timeStr: string, lang: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const ap = h >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

// ── UUID generator ──────────────────────────────
function uuid(): string {
    return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Image compression ───────────────────────────
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

// ── Upload file to Supabase Storage ─────────────
async function uploadToStorage(
    file: File | Blob,
    sessionId: string,
    fileName: string,
): Promise<string> {
    const bucket = 'wa-intake-uploads';
    const path = `${sessionId}/${Date.now()}_${fileName}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            ...REST_HEADERS,
            'Content-Type': (file as File).type || 'application/octet-stream',
            'x-upsert': 'true',
        },
        body: file,
    });

    if (!res.ok) {
        const err = await res.text().catch(() => 'Upload failed');
        throw new Error(err);
    }

    // Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── Call Edge Function ──────────────────────────
const EDGE_URL = `${SUPABASE_URL}/functions/v1/ai-intake`;

async function callEdge<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
        const err = await res.text().catch(() => 'Unknown error');
        throw new Error(`Edge function error (${res.status}): ${err}`);
    }
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data as T;
}

// ── Fetch sequence nodes ────────────────────────
async function fetchSequenceByType(
    sequenceType: string,
    specialty?: string,
): Promise<{ nodes: SequenceNode[]; sequenceId: string | null }> {
    const REST_URL = `${SUPABASE_URL}/rest/v1`;

    try {
        let seqUrl = `${REST_URL}/prompt_sequences?select=id,name,sequence_type,specialty&sequence_type=eq.${sequenceType}&limit=1`;
        if (sequenceType === 'specialty' && specialty) {
            seqUrl += `&specialty=eq.${specialty}`;
        }

        const seqRes = await fetch(seqUrl, { headers: REST_HEADERS });
        if (!seqRes.ok) {
            console.warn('Failed to fetch sequences:', seqRes.status);
            return { nodes: [], sequenceId: null };
        }
        const seqs = await seqRes.json();
        if (!seqs || seqs.length === 0) return { nodes: [], sequenceId: null };
        const seq = seqs[0];

        const nodesUrl = `${REST_URL}/prompt_sequence_nodes?select=*,ai_prompts(id,name,prompt_type,content,is_active,version)&sequence_id=eq.${seq.id}&order=sort_order`;
        const nodesRes = await fetch(nodesUrl, { headers: REST_HEADERS });
        if (!nodesRes.ok) {
            console.warn('Failed to fetch sequence nodes:', nodesRes.status);
            return { nodes: [], sequenceId: seq.id };
        }
        const nodes = await nodesRes.json();

        return {
            nodes: (nodes || []) as SequenceNode[],
            sequenceId: seq.id,
        };
    } catch (err) {
        console.error('Sequence fetch error:', err);
        return { nodes: [], sequenceId: null };
    }
}

// ── Validate WA API key via RPC ─────────────────
interface WaKeyValidation {
    valid: boolean;
    reason?: string;
    doctor?: DoctorInfo;
    features?: Record<string, boolean>;
    sessions_remaining?: number;
    plan?: string;
    key_id?: string;
}

async function validateWaKey(keyCode: string): Promise<WaKeyValidation> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_wa_key`, {
            method: 'POST',
            headers: {
                ...REST_HEADERS,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_key_code: keyCode.toUpperCase() }),
        });
        if (!res.ok) return { valid: false, reason: 'server_error' };
        return await res.json();
    } catch {
        return { valid: false, reason: 'network_error' };
    }
}

// ── Fetch doctor by identifier code (fallback) ──
async function fetchDoctorByCode(code: string): Promise<DoctorInfo | null> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/doctors?select=id,display_name,full_name,specialty,avatar_url,users!doctors_user_id_fkey(phone)&identifier_code=eq.${code.toUpperCase()}&status=eq.active&limit=1`;
        const res = await fetch(url, { headers: REST_HEADERS });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.[0]) return null;
        const doc = data[0];
        const phone = doc.users?.phone || null;
        return {
            id: doc.id,
            display_name: doc.display_name,
            full_name: doc.full_name,
            specialty: doc.specialty,
            avatar_url: doc.avatar_url,
            whatsapp_number: phone,
        };
    } catch {
        return null;
    }
}

// ── Create WA session ───────────────────────────
async function createWaSession(
    doctorId: string | null,
    doctorCode: string | null,
    lang: string,
    apiKeyId?: string | null,
): Promise<string | null> {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/wa_intake_sessions`, {
            method: 'POST',
            headers: {
                ...REST_HEADERS,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                doctor_id: doctorId,
                doctor_code: doctorCode,
                language: lang,
                status: 'in_progress',
                ...(apiKeyId && { api_key_id: apiKeyId }),
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.[0]?.id || null;
    } catch {
        return null;
    }
}

// ── Mark session complete (increment usage) ─────
async function markSessionComplete(keyId: string): Promise<void> {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/wa_session_complete`, {
            method: 'POST',
            headers: {
                ...REST_HEADERS,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_key_id: keyId }),
        });
    } catch {
        console.warn('Failed to mark session complete');
    }
}


// ══════════════════════════════════════════════════
// APP COMPONENT
// ══════════════════════════════════════════════════
export default function App() {
    // ── State ───────────────────────────────────
    const [phase, setPhase] = useState<Phase>('welcome');
    const [lang, setLang] = useState<Lang>('ar');
    const [patientName, setPatientName] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [progress, setProgress] = useState(0);
    const [report, setReport] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [sectionTurnCount, setSectionTurnCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Sequence state
    const [sequenceNodes, setSequenceNodes] = useState<SequenceNode[]>([]);
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<WaPhase>('wa_intake');
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [fullConversationHistory, setFullConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [doctorCode, setDoctorCode] = useState<string | null>(null);
    const [waPathway, setWaPathway] = useState<WaPathway>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [blockReason, setBlockReason] = useState<string | null>(null);

    // Media upload state
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadActions, setShowUploadActions] = useState(false);

    // Booking state
    const [bookingStep, setBookingStep] = useState<BookingStep>('idle');
    const [bookingLocations, setBookingLocations] = useState<DoctorLocation[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<DoctorLocation | null>(null);
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
    const [patientPhone, setPatientPhone] = useState<string | null>(null);
    const [bookingLoading, setBookingLoading] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const rtl = lang === 'ar';

    const SECTION_MAX_TURNS = 4;

    const PoweredBy = () => (
        <div className="powered-by">
            <p><i>Powered by</i> <a href="https://cliniq.one" target="_blank" rel="noopener noreferrer">cliniq.one</a></p>
        </div>
    );

    // ── Parse ?doc=CODE from URL on mount ────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('doc') || params.get('doctor');
        if (code) {
            setDoctorCode(code);
            // Try WA API key validation first
            validateWaKey(code).then(result => {
                if (result.valid && result.doctor) {
                    setDoctorInfo(result.doctor);
                    setSubscription({
                        plan: result.plan || 'trial',
                        features: result.features || {},
                        sessionsRemaining: result.sessions_remaining || 0,
                        keyId: result.key_id || '',
                    });
                } else if (result.reason === 'invalid_key') {
                    // Fallback: try legacy doctor identifier_code
                    fetchDoctorByCode(code).then(doc => {
                        if (doc) setDoctorInfo(doc);
                        // No subscription = uncontrolled access (legacy)
                    });
                } else {
                    // Subscription issue — show blocked
                    setBlockReason(result.reason || 'generic');
                    setPhase('blocked');
                }
            });
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Clear error after 4s
    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(''), 4000);
            return () => clearTimeout(t);
        }
    }, [error]);

    // ── Add message helper ──────────────────────
    const addMsg = useCallback((role: Message['role'], content: string, media?: { url: string; type: 'photo' | 'document'; name?: string }): Message => {
        const msg: Message = {
            id: uuid(),
            role,
            content,
            timestamp: Date.now(),
            ...(media && { mediaUrl: media.url, mediaType: media.type, mediaName: media.name }),
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    }, []);

    // ── Handle file upload ──────────────────────
    const handleFileUpload = useCallback(async (file: File, type: 'photo' | 'document') => {
        if (!sessionId) return;
        setIsUploading(true);
        try {
            let uploadBlob: File | Blob = file;
            let fileName = file.name;

            // Compress images
            if (type === 'photo' && file.type.startsWith('image/')) {
                uploadBlob = await compressImage(file);
                fileName = file.name.replace(/\.[^.]+$/, '.jpg');
            }

            const url = await uploadToStorage(uploadBlob, sessionId, fileName);

            const newFile: UploadedFile = { url, name: fileName, type, size: file.size };
            setUploadedFiles(prev => [...prev, newFile]);

            // Add media message to chat
            const label = type === 'photo'
                ? (lang === 'ar' ? '📸 تم رفع صورة' : '📸 Photo uploaded')
                : (lang === 'ar' ? `📄 تم رفع: ${fileName}` : `📄 Uploaded: ${fileName}`);
            addMsg('patient', label, { url, type, name: fileName });

        } catch (err) {
            console.error('Upload error:', err);
            setError(TEXT[lang].uploadError);
        }
        setIsUploading(false);
    }, [sessionId, lang, addMsg]);

    // ── Advance to node ─────────────────────────
    const advanceToNode = useCallback(async (
        nodeIdx: number,
        nodes: SequenceNode[],
        convHistory: { role: string; content: string }[],
        fullHistory: { role: string; content: string }[],
    ) => {
        if (nodeIdx >= nodes.length) {
            // ── Phase transition ──
            const curPhase = currentPhase;

            if (curPhase === 'wa_intake') {
                // Detect pathway from conversation
                const allResponses = convHistory.map(m => m.content).join(' ');
                const detected = detectRoute(allResponses);
                const pathway = detected || 'new_visit';
                setWaPathway(pathway);

                // Handle booking pathway → load wa_booking sequence
                if (pathway === 'booking') {
                    setIsTyping(true);
                    try {
                        const bookingResult = await fetchSequenceByType('wa_booking');
                        const bookNodes = bookingResult.nodes.filter(
                            n => n.node_type === 'chat' || !n.node_type
                        );
                        if (bookNodes.length > 0) {
                            setSequenceNodes(bookNodes);
                            setCurrentPhase('wa_booking');
                            setCurrentNodeIndex(0);
                            setSectionTurnCount(0);
                            const newFull = [...fullHistory, ...convHistory];
                            setFullConversationHistory(newFull);
                            setConversationHistory([]);
                            setIsTyping(false);
                            addMsg('system', lang === 'ar' ? '📅 ممتاز! خلنا نحجز لك موعد...' : '📅 Great! Let\'s book you an appointment...');
                            await advanceToNode(0, bookNodes, [], newFull);
                            return;
                        }
                    } catch (err) {
                        console.error('Booking sequence load failed:', err);
                    }
                    setIsTyping(false);
                    return;
                }

                // Load appropriate sequence for followup / new_visit
                const seqType = pathway === 'followup' ? 'wa_followup' : 'wa_new_visit';
                const nextPhase: WaPhase = pathway === 'followup' ? 'wa_followup' : 'wa_new_visit';

                setIsTyping(true);
                try {
                    const result = await fetchSequenceByType(seqType);
                    const chatNodes = result.nodes.filter(
                        n => n.node_type === 'chat' || !n.node_type
                    );

                    if (chatNodes.length > 0) {
                        setSequenceNodes(chatNodes);
                        setCurrentPhase(nextPhase);
                        setCurrentNodeIndex(0);
                        setSectionTurnCount(0);
                        const newFull = [...fullHistory, ...convHistory];
                        setFullConversationHistory(newFull);
                        setConversationHistory([]);
                        setIsTyping(false);

                        // Show pathway transition message
                        const transMsg = pathway === 'followup'
                            ? (lang === 'ar' ? '📋 حسناً، دعنا نتابع زيارتك السابقة...' : '📋 Great, let\'s follow up on your previous visit...')
                            : (lang === 'ar' ? '🏥 حسناً، دعنا نتعرف على مشكلتك الصحية...' : '🏥 Alright, let\'s learn about your health concern...');
                        addMsg('system', transMsg);

                        await advanceToNode(0, chatNodes, [], newFull);
                        return;
                    }
                } catch (err) {
                    console.error('Pathway sequence load failed:', err);
                }
                setIsTyping(false);
            }

            if (curPhase === 'wa_followup' || curPhase === 'wa_new_visit') {
                // Load WA wrapup
                setIsTyping(true);
                try {
                    const wrapupResult = await fetchSequenceByType('wa_wrapup');
                    const wrapupNodes = wrapupResult.nodes.filter(
                        n => n.node_type === 'chat' || !n.node_type
                    );
                    if (wrapupNodes.length > 0) {
                        setSequenceNodes(wrapupNodes);
                        setCurrentPhase('wa_wrapup');
                        setCurrentNodeIndex(0);
                        setSectionTurnCount(0);
                        const newFull = [...fullHistory, ...convHistory];
                        setFullConversationHistory(newFull);
                        setConversationHistory([]);
                        setIsTyping(false);
                        await advanceToNode(0, wrapupNodes, [], newFull);
                        return;
                    }
                } catch (err) {
                    console.error('Wrapup load failed:', err);
                }
                setIsTyping(false);
            }

            // wa_booking phase done → show report
            if (curPhase === 'wa_booking') {
                finishIntake();
                return;
            }

            // All phases done → show report
            finishIntake();
            return;
        }

        const node = nodes[nodeIdx];

        // Skip non-chat nodes
        if (node.node_type && node.node_type !== 'chat') {
            await advanceToNode(nodeIdx + 1, nodes, convHistory, fullHistory);
            return;
        }

        // ── Media upload node: show upload actions ──
        if (node.step_key === 'media_upload') {
            setShowUploadActions(true);
        } else {
            setShowUploadActions(false);
        }

        // Chat node — send first AI message
        setCurrentNodeIndex(nodeIdx);
        setSectionTurnCount(0);
        setProgress(Math.round(((nodeIdx + 1) / nodes.length) * 100));
        setFullConversationHistory(prev => [...prev, ...convHistory]);
        setConversationHistory([]);

        if (!node.prompt_id || !node.ai_prompts?.content) {
            await advanceToNode(nodeIdx + 1, nodes, [], [...fullHistory, ...convHistory]);
            return;
        }

        // Build patient context from full history
        const patientContext = buildPatientContext(fullHistory);

        setIsTyping(true);
        try {
            const result = await callEdge<ChatSectionResult>('chat-section', {
                section: node.step_key,
                promptId: node.prompt_id,
                conversationHistory: [],
                language: lang,
                patientContext,
                maxTokens: 1000,
                mode: 'active',
            });

            const cleaned = stripTags(result.response);
            if (cleaned) {
                addMsg('ai', cleaned);
                setConversationHistory([{ role: 'ai', content: result.response }]);
            }

            if (result.sectionComplete || result.addendumDone) {
                setIsTyping(false);
                await advanceToNode(nodeIdx + 1, nodes, [{ role: 'ai', content: result.response }], fullHistory);
                return;
            }
        } catch (err) {
            console.error('Chat error:', err);
            setError(TEXT[lang].errorRetry);
        }
        setIsTyping(false);
    }, [lang, addMsg, currentPhase]);

    // ── Build patient context string ────────────
    function buildPatientContext(history: { role: string; content: string }[]): string {
        const parts: string[] = [];

        // Include doctor info as context
        if (doctorInfo) {
            parts.push(`Doctor: ${doctorInfo.display_name || doctorInfo.full_name} (${doctorInfo.specialty})`);
        }
        if (patientName) {
            parts.push(`Patient name: ${patientName}`);
        }
        if (waPathway) {
            parts.push(`Visit type: ${waPathway === 'followup' ? 'Follow-up visit' : 'New visit'}`);
        }
        if (uploadedFiles.length > 0) {
            parts.push(`Attachments: ${uploadedFiles.map(f => `${f.type}: ${f.name}`).join(', ')}`);
        }

        // Patient messages from full history
        const patientMsgs = history
            .filter(m => m.role === 'patient')
            .map(m => m.content)
            .join('\n');
        if (patientMsgs) parts.push(`Previous patient messages:\n${patientMsgs}`);

        return parts.join('\n').slice(0, 3000);
    }

    // ── Finish intake → show report ─────────────
    const finishIntake = useCallback(() => {
        const allMsgs = messages;
        const aiMessages = allMsgs.filter(m => m.role === 'ai');

        // Find the summary (longest AI message, likely the addendum output)
        let reportText = '';
        if (aiMessages.length > 0) {
            const sorted = [...aiMessages].sort((a, b) => b.content.length - a.content.length);
            reportText = sorted[0].content;
        }

        if (!reportText) {
            reportText = allMsgs
                .map(m => `${m.role === 'ai' ? 'Doctor AI' : 'Patient'}: ${m.content}`)
                .join('\n\n');
        }

        // Add header
        const drName = doctorInfo ? (doctorInfo.display_name || doctorInfo.full_name) : '';
        const specialtyMap: Record<string, string> = {
            dermatology: lang === 'ar' ? 'الأمراض الجلدية' : 'Dermatology',
            family_medicine: lang === 'ar' ? 'طب الأسرة' : 'Family Medicine',
            orthopedics: lang === 'ar' ? 'جراحة العظام' : 'Orthopedics',
            psychiatry: lang === 'ar' ? 'الطب النفسي' : 'Psychiatry',
            pediatrics: lang === 'ar' ? 'طب الأطفال' : 'Pediatrics',
            diet_nutrition: lang === 'ar' ? 'التغذية' : 'Diet & Nutrition',
            diet: lang === 'ar' ? 'التغذية' : 'Diet & Nutrition',
        };

        const header = lang === 'ar'
            ? `📋 تقرير الاستشارة الطبية — cliniq.one\n📅 ${new Date().toLocaleDateString('ar-SA')}\n${patientName ? `👤 ${patientName}\n` : ''}${drName ? `👨‍⚕️ د. ${drName}${doctorInfo?.specialty ? ` (${specialtyMap[doctorInfo.specialty] || doctorInfo.specialty})` : ''}\n` : ''}${'─'.repeat(30)}\n\n`
            : `📋 Medical Intake Report — cliniq.one\n📅 ${new Date().toLocaleDateString('en-US')}\n${patientName ? `👤 ${patientName}\n` : ''}${drName ? `👨‍⚕️ Dr. ${drName}${doctorInfo?.specialty ? ` (${specialtyMap[doctorInfo.specialty] || doctorInfo.specialty})` : ''}\n` : ''}${'─'.repeat(30)}\n\n`;

        // Add media links
        let mediaSection = '';
        if (uploadedFiles.length > 0) {
            mediaSection = lang === 'ar'
                ? `\n\n${'─'.repeat(30)}\n📎 المرفقات:\n${uploadedFiles.map(f => `${f.type === 'photo' ? '📸' : '📄'} ${f.name}: ${f.url}`).join('\n')}`
                : `\n\n${'─'.repeat(30)}\n📎 Attachments:\n${uploadedFiles.map(f => `${f.type === 'photo' ? '📸' : '📄'} ${f.name}: ${f.url}`).join('\n')}`;
        }

        setReport(header + reportText + mediaSection);
        setPhase('report');
        setProgress(100);

        // Track session completion for subscription metering
        if (subscription?.keyId) {
            markSessionComplete(subscription.keyId);
        }
    }, [messages, lang, patientName, doctorInfo, uploadedFiles, subscription]);

    // ── Handle send message ─────────────────────
    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        setInput('');
        addMsg('patient', text);

        const currentNodes = sequenceNodes;
        const nodeIdx = currentNodeIndex;
        const node = currentNodes[nodeIdx];

        if (!node) {
            finishIntake();
            return;
        }

        const newConvHistory = [...conversationHistory, { role: 'patient', content: text }];
        setConversationHistory(newConvHistory);

        const newTurnCount = sectionTurnCount + 1;
        setSectionTurnCount(newTurnCount);

        // Build patient context
        const patientContext = buildPatientContext(fullConversationHistory);

        setIsTyping(true);
        try {
            const result = await callEdge<ChatSectionResult>('chat-section', {
                section: node.step_key,
                promptId: node.prompt_id,
                conversationHistory: newConvHistory,
                language: lang,
                patientContext,
                maxTokens: 1000,
                mode: 'active',
                turnCount: newTurnCount,
                maxTurns: node.max_turns || SECTION_MAX_TURNS,
            });

            const cleaned = stripTags(result.response);
            if (cleaned) addMsg('ai', cleaned);

            // Detect route tag (for wa_visit_type node)
            const route = detectRoute(result.response);
            if (route) setWaPathway(route);

            // Detect booking tags
            const phoneNum = detectPhoneCollected(result.response);
            if (phoneNum) setPatientPhone(phoneNum);

            if (detectBookingStart(result.response)) {
                // Trigger booking UI — load locations
                if (doctorInfo?.id) {
                    setBookingLoading(true);
                    const locs = await fetchDoctorLocationsRpc(doctorInfo.id);
                    setBookingLocations(locs.filter(l => l.booking_mode !== 'disabled'));
                    setBookingStep('locations');
                    setBookingLoading(false);
                }
                setIsTyping(false);
                return; // Don't advance — wait for UI interaction
            }

            const updatedHistory = [...newConvHistory, { role: 'ai', content: result.response }];
            setConversationHistory(updatedHistory);

            const maxT = node.max_turns || SECTION_MAX_TURNS;
            const sectionDone = result.sectionComplete || result.addendumDone || newTurnCount >= maxT;

            if (sectionDone) {
                setIsTyping(false);
                // If media upload node is done, hide upload actions
                if (node.step_key === 'media_upload') {
                    setShowUploadActions(false);
                }
                await advanceToNode(
                    nodeIdx + 1,
                    currentNodes,
                    updatedHistory,
                    fullConversationHistory,
                );
                return;
            }
        } catch (err) {
            console.error('Send error:', err);
            setError(TEXT[lang].errorRetry);
        }
        setIsTyping(false);
    }, [input, isTyping, sequenceNodes, currentNodeIndex, conversationHistory, sectionTurnCount, fullConversationHistory, lang, addMsg, advanceToNode, finishIntake]);

    // ── Skip section ────────────────────────────
    const handleSkipSection = useCallback(async () => {
        if (isTyping) return;
        const nodeIdx = currentNodeIndex;
        const nodes = sequenceNodes;

        if (nodes[nodeIdx]?.step_key === 'media_upload') {
            setShowUploadActions(false);
        }

        await advanceToNode(
            nodeIdx + 1,
            nodes,
            conversationHistory,
            fullConversationHistory,
        );
    }, [isTyping, currentNodeIndex, sequenceNodes, conversationHistory, fullConversationHistory, advanceToNode]);

    // ── Start intake ────────────────────────────
    const handleStart = useCallback(async () => {
        setLoading(true);
        setPhase('chat');

        try {
            // Create WA session
            const sid = await createWaSession(doctorInfo?.id || null, doctorCode, lang, subscription?.keyId);
            if (sid) setSessionId(sid);

            // ── Personalized greeting from doctor ──
            if (doctorInfo) {
                const drName = doctorInfo.display_name || doctorInfo.full_name;
                const specialtyMap: Record<string, string> = {
                    dermatology: lang === 'ar' ? 'الأمراض الجلدية' : 'Dermatology',
                    family_medicine: lang === 'ar' ? 'طب الأسرة' : 'Family Medicine',
                    orthopedics: lang === 'ar' ? 'جراحة العظام' : 'Orthopedics',
                    psychiatry: lang === 'ar' ? 'الطب النفسي' : 'Psychiatry',
                    pediatrics: lang === 'ar' ? 'طب الأطفال' : 'Pediatrics',
                    diet_nutrition: lang === 'ar' ? 'التغذية' : 'Diet & Nutrition',
                    diet: lang === 'ar' ? 'التغذية' : 'Diet & Nutrition',
                };
                const specLabel = specialtyMap[doctorInfo.specialty] || doctorInfo.specialty;

                const greeting = lang === 'ar'
                    ? `مرحباً بك! 👋\n\nالدكتور/ة **${drName}** (${specLabel}) يرحب بك في منصة **cliniq.one** — نظام الاستشارات الطبية الذكي.\n\nسيقوم المساعد الطبي بطرح بعض الأسئلة القصيرة حول حالتك الصحية لإعداد تقرير مفصل سيراجعه الطبيب شخصياً.\n\n⏱️ سيستغرق الأمر بضع دقائق فقط.\n\n🔜 قريباً: تطبيق cliniq.one — استشاراتك الطبية أسرع وأسهل!\n\nدعنا نبدأ...`
                    : `Welcome! 👋\n\n**Dr. ${drName}** (${specLabel}) welcomes you to **cliniq.one** — an AI-powered medical consultation platform.\n\nOur medical assistant will ask you a few quick questions about your health to prepare a report your doctor will personally review.\n\n⏱️ This will only take a few minutes.\n\n🔜 Coming soon: The cliniq.one app — faster, easier medical consultations!\n\nLet's begin...`;

                addMsg('ai', greeting);
            }

            // Load WA intake sequence
            const result = await fetchSequenceByType('wa_intake');
            const chatNodes = result.nodes.filter(
                n => n.node_type === 'chat' || !n.node_type
            );

            if (chatNodes.length === 0) {
                // Fallback
                if (!doctorInfo) {
                    addMsg('ai', lang === 'ar'
                        ? 'مرحباً بك في cliniq.one! كيف يمكنني مساعدتك اليوم؟ أخبرني عن مشكلتك الصحية.'
                        : 'Welcome to cliniq.one! How can I help you today? Tell me about your health concern.');
                }
                setLoading(false);
                return;
            }

            setSequenceNodes(chatNodes);
            setCurrentPhase('wa_intake');
            setCurrentNodeIndex(0);
            setConversationHistory([]);
            setFullConversationHistory([]);
            setLoading(false);

            // Start first node
            await advanceToNode(0, chatNodes, [], []);
        } catch (err) {
            console.error('Start error:', err);
            setLoading(false);
            setError(TEXT[lang].errorRetry);
            if (!doctorInfo) {
                addMsg('ai', lang === 'ar'
                    ? 'مرحباً بك في cliniq.one! كيف يمكنني مساعدتك اليوم؟'
                    : 'Welcome to cliniq.one! How can I help you today?');
            }
        }
    }, [lang, addMsg, advanceToNode, doctorInfo, doctorCode]);

    // ── Copy report ─────────────────────────────
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(report);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = report;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    }, [report]);

    // ── Open WhatsApp ───────────────────────────
    const handleWhatsApp = useCallback(() => {
        const encoded = encodeURIComponent(report);
        const phone = doctorInfo?.whatsapp_number?.replace(/[^\d]/g, '') || '';
        if (phone) {
            window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${encoded}`, '_blank');
        }
    }, [report, doctorInfo]);

    // ── Restart ─────────────────────────────────
    const handleRestart = useCallback(() => {
        setPhase('welcome');
        setMessages([]);
        setInput('');
        setReport('');
        setProgress(0);
        setConversationHistory([]);
        setFullConversationHistory([]);
        setSequenceNodes([]);
        setCurrentNodeIndex(0);
        setCurrentPhase('wa_intake');
        setSectionTurnCount(0);
        setCopied(false);
        setWaPathway(null);
        setUploadedFiles([]);
        setShowUploadActions(false);
        setSessionId(null);
    }, []);

    // ── Key handler ─────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const t = TEXT[lang];
    const currentNode = sequenceNodes[currentNodeIndex];
    const showSkip = sectionTurnCount >= 1 && !isTyping;
    const isMediaNode = currentNode?.step_key === 'media_upload';

    // Feature flags from subscription
    const canUploadPhoto = !subscription || subscription.features.photo_upload !== false;
    const canUploadDoc = !subscription || subscription.features.doc_upload === true;

    // Blocked reason text
    const getBlockedMessage = (reason: string | null): string => {
        switch (reason) {
            case 'invalid_key': return t.blockedInvalidKey;
            case 'key_disabled': return t.blockedInvalidKey;
            case 'key_expired': return t.blockedExpired;
            case 'subscription_expired': return t.blockedExpired;
            case 'subscription_suspended': return t.blockedSuspended;
            case 'subscription_cancelled': return t.blockedSuspended;
            case 'limit_reached': return t.blockedLimit;
            case 'no_subscription': return t.blockedExpired;
            default: return t.blockedGeneric;
        }
    };

    // ══════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════
    return (
        <div className="app-container" dir={rtl ? 'rtl' : 'ltr'}>
            {/* ── Error Toast ── */}
            {error && <div className="error-toast">{error}</div>}

            {/* ── BLOCKED ── */}
            {phase === 'blocked' && (
                <div className="welcome-screen">
                    <div className="welcome-logo">
                        <span>cliniq.one</span>
                    </div>
                    <div className="blocked-icon">🚫</div>
                    <h1 className="welcome-title">{t.blockedTitle}</h1>
                    <p className="welcome-subtitle">{getBlockedMessage(blockReason)}</p>
                    <p className="blocked-contact">
                        {lang === 'ar'
                            ? 'يرجى التواصل مع عيادة طبيبك للمساعدة.'
                            : 'Please contact your doctor\'s office for assistance.'}
                    </p>
                </div>
            )}

            {/* ── WELCOME ── */}
            {phase === 'welcome' && (
                <div className="welcome-screen">
                    <div className="welcome-logo">
                        <span>cliniq.one</span>
                    </div>

                    {/* Doctor personalized header */}
                    {doctorInfo ? (
                        <div className="doctor-profile-welcome">
                            {doctorInfo.avatar_url ? (
                                <img src={doctorInfo.avatar_url} alt={doctorInfo.display_name} className="doctor-avatar-welcome" />
                            ) : (
                                <div className="doctor-avatar-placeholder">🩺</div>
                            )}
                            <h1 className="welcome-title">
                                {lang === 'ar'
                                    ? `أهلاً بك مع د. ${doctorInfo.display_name || doctorInfo.full_name}`
                                    : `Welcome from Dr. ${doctorInfo.display_name || doctorInfo.full_name}`}
                            </h1>
                            <p className="welcome-subtitle">
                                {lang === 'ar'
                                    ? 'طبيبك يستخدم cliniq.one لتقديم أفضل رعاية طبية. المساعد الذكي سيجمع معلوماتك الصحية في بضع دقائق لإعداد تقرير مفصل لطبيبك.'
                                    : 'Your doctor uses cliniq.one to provide the best care. Our AI assistant will gather your health information in just a few minutes to prepare a detailed report for your doctor.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 className="welcome-title">{t.welcomeTitle}</h1>
                            <p className="welcome-subtitle">{t.welcomeSubtitle}</p>
                        </>
                    )}

                    <div className="welcome-form">
                        <div className="input-group">
                            <label>{t.nameLabel}</label>
                            <input
                                type="text"
                                placeholder={t.namePlaceholder}
                                value={patientName}
                                onChange={e => setPatientName(e.target.value)}
                                dir={rtl ? 'rtl' : 'ltr'}
                            />
                        </div>

                        <div className="input-group">
                            <label>{lang === 'ar' ? 'اللغة' : 'Language'}</label>
                            <div className="lang-toggle">
                                <button
                                    className={`lang-btn ${lang === 'ar' ? 'active' : ''}`}
                                    onClick={() => setLang('ar')}
                                >
                                    🇸🇦 العربية
                                </button>
                                <button
                                    className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                                    onClick={() => setLang('en')}
                                >
                                    🇬🇧 English
                                </button>
                            </div>
                        </div>

                        <button
                            className="btn-start"
                            onClick={handleStart}
                            disabled={loading}
                        >
                            {loading ? <div className="spinner" /> : t.startBtn}
                        </button>
                    </div>
                    <PoweredBy />
                </div>
            )}

            {/* ── CHAT ── */}
            {phase === 'chat' && (
                <div className="chat-screen">
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-avatar">🩺</div>
                        <div className="chat-header-info">
                            <div className="chat-header-name">{t.aiName}</div>
                            <div className="chat-header-status">
                                <span className="dot" />
                                {t.online}
                            </div>
                        </div>
                        {sessionId && (
                            <div className="session-expiry" title="Session expires after 24 hours of inactivity">
                                24h ⏳
                            </div>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Messages */}
                    <div className="chat-messages">
                        {/* Section label */}
                        {currentNode?.label && (
                            <div className="section-banner">
                                {currentNode.emoji} {currentNode.label}
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className={`message ${msg.role === 'ai' ? 'ai' : msg.role === 'patient' ? 'user' : 'system'}`}>
                                {/* Media thumbnail */}
                                {msg.mediaUrl && msg.mediaType === 'photo' && (
                                    <div className="media-thumb">
                                        <img src={msg.mediaUrl} alt="uploaded" loading="lazy" />
                                    </div>
                                )}
                                {msg.mediaUrl && msg.mediaType === 'document' && (
                                    <div className="media-doc">
                                        <span className="media-doc-icon">📄</span>
                                        <span className="media-doc-name">{msg.mediaName || 'Document'}</span>
                                    </div>
                                )}
                                {/* Text content */}
                                {msg.content && <span>{msg.content}</span>}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="typing-indicator">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                        )}

                        {/* Upload actions for media_upload node */}
                        {showUploadActions && !isTyping && (
                            <div className="upload-actions">
                                {canUploadPhoto && (
                                    <button
                                        className="upload-btn photo"
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {t.attachPhoto}
                                    </button>
                                )}
                                {canUploadDoc && (
                                    <button
                                        className="upload-btn doc"
                                        onClick={() => docInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {t.attachDoc}
                                    </button>
                                )}
                                <button
                                    className="upload-btn skip"
                                    onClick={handleSkipSection}
                                    disabled={isUploading}
                                >
                                    {t.skipUpload}
                                </button>
                                {isUploading && <div className="upload-progress">{t.uploading}</div>}
                            </div>
                        )}

                        {/* Show skip after 1 turn (lighter flow) */}
                        {showSkip && !isMediaNode && (
                            <button className="btn-skip-section" onClick={handleSkipSection}>
                                {t.skipSection}
                            </button>
                        )}

                        {/* ═══ BOOKING UI ═══ */}
                        {bookingStep !== 'idle' && !bookingLoading && (
                            <div className="booking-ui" style={{ padding: '12px', borderRadius: '16px', background: 'rgba(99,102,241,0.06)', margin: '8px 0', border: '1px solid rgba(99,102,241,0.15)' }}>

                                {/* Location Picker */}
                                {bookingStep === 'locations' && (
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>{t.bookingPickLocation}</div>
                                        {bookingLocations.length === 0 ? (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.bookingNoLocations}</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {bookingLocations.map(loc => (
                                                    <button
                                                        key={loc.id}
                                                        onClick={async () => {
                                                            setSelectedLocation(loc);
                                                            if (loc.booking_mode === 'call_center') {
                                                                setBookingStep('callcenter');
                                                                return;
                                                            }
                                                            setBookingLoading(true);
                                                            const dates = await fetchAvailableDatesRpc(loc.id, loc.advance_booking_days);
                                                            setAvailableDates(dates);
                                                            setBookingStep('dates');
                                                            setBookingLoading(false);
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                                            borderRadius: 12, border: '1px solid var(--border-color)',
                                                            background: 'var(--card-bg)', cursor: 'pointer', textAlign: rtl ? 'right' : 'left',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: loc.color || '#6366f1', flexShrink: 0 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{lang === 'ar' ? (loc.name_ar || loc.name) : loc.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {lang === 'ar' ? (loc.address_ar || loc.address || loc.city) : (loc.address || loc.city)}
                                                                {loc.booking_mode === 'call_center' && (' • ' + t.bookingCallCenter)}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: 12, opacity: 0.5 }}>{loc.booking_mode === 'call_center' ? '📞' : '📅'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Call Center Card */}
                                {bookingStep === 'callcenter' && selectedLocation && (
                                    <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t.bookingCallCenter}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                            {lang === 'ar' ? (selectedLocation.name_ar || selectedLocation.name) : selectedLocation.name}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                            {selectedLocation.call_center_phone && (
                                                <a
                                                    href={`tel:${selectedLocation.call_center_phone}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: '#10b981', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                                                >
                                                    {t.bookingCallNow}
                                                </a>
                                            )}
                                            {selectedLocation.call_center_whatsapp && selectedLocation.call_center_phone && (
                                                <a
                                                    href={`https://wa.me/${selectedLocation.call_center_phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                                                >
                                                    {t.bookingWhatsApp}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Date Picker */}
                                {bookingStep === 'dates' && (
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>{t.bookingPickDate}</div>
                                        {availableDates.length === 0 ? (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.bookingNoSlots}</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {availableDates.map(d => (
                                                    <button
                                                        key={d.slot_date}
                                                        onClick={async () => {
                                                            setSelectedDate(d.slot_date);
                                                            setBookingLoading(true);
                                                            const slots = await fetchAvailableSlotsRpc(selectedLocation!.id, d.slot_date);
                                                            setAvailableSlots(slots.filter(s => s.available));
                                                            setBookingStep('slots');
                                                            setBookingLoading(false);
                                                        }}
                                                        style={{
                                                            padding: '8px 14px', borderRadius: 10,
                                                            border: '1px solid var(--border-color)', background: 'var(--card-bg)',
                                                            cursor: 'pointer', textAlign: 'center', minWidth: 70, transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDateShort(d.slot_date, lang)}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                            {d.available_slots} {t.bookingSlotsAvailable}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Time Slot Picker */}
                                {bookingStep === 'slots' && (
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 4 }}>{t.bookingPickTime}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            {selectedDate && fmtDateShort(selectedDate, lang)} • {lang === 'ar' ? (selectedLocation?.name_ar || selectedLocation?.name) : selectedLocation?.name}
                                        </div>
                                        {availableSlots.length === 0 ? (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.bookingNoSlots}</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {availableSlots.map(s => {
                                                    const h = parseInt(s.slot_time.split(':')[0]);
                                                    const isMorning = h < 12;
                                                    return (
                                                        <button
                                                            key={s.slot_time}
                                                            onClick={() => { setSelectedSlot(s.slot_time); setBookingStep('confirming'); }}
                                                            style={{
                                                                padding: '8px 14px', borderRadius: 10,
                                                                border: selectedSlot === s.slot_time ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                                background: 'var(--card-bg)', cursor: 'pointer',
                                                                fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {fmtTime12(s.slot_time, lang)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Confirmation */}
                                {bookingStep === 'confirming' && (
                                    <div style={{ padding: 8 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 10 }}>
                                            {lang === 'ar' ? '📋 تأكيد الحجز' : '📋 Confirm Booking'}
                                        </div>
                                        <div style={{ display: 'grid', gap: 6, fontSize: 13, marginBottom: 12 }}>
                                            <div><strong>{t.bookingDoctor}:</strong> {doctorInfo?.display_name}</div>
                                            <div><strong>{t.bookingLocation}:</strong> {lang === 'ar' ? (selectedLocation?.name_ar || selectedLocation?.name) : selectedLocation?.name}</div>
                                            <div><strong>{t.bookingDate}:</strong> {selectedDate && fmtDateShort(selectedDate, lang)}</div>
                                            <div><strong>{t.bookingTime}:</strong> {selectedSlot && fmtTime12(selectedSlot, lang)}</div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!selectedLocation || !selectedDate || !selectedSlot) return;
                                                setBookingLoading(true);
                                                const result = await createBookingRpc(
                                                    doctorCode, selectedLocation.id, selectedDate, selectedSlot,
                                                    patientName || 'Patient', patientPhone, lang, sessionId,
                                                );
                                                if (result.success && result.booking) {
                                                    setBookingResult(result.booking);
                                                    setBookingStep('confirmed');
                                                    addMsg('system', t.bookingConfirmed);
                                                } else {
                                                    setError(result.error || 'Booking failed');
                                                    setBookingStep('slots');
                                                }
                                                setBookingLoading(false);
                                            }}
                                            disabled={bookingLoading}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: 12,
                                                background: '#10b981', color: '#fff', border: 'none',
                                                fontSize: 14, fontWeight: 600, cursor: bookingLoading ? 'wait' : 'pointer',
                                                opacity: bookingLoading ? 0.7 : 1, transition: 'all 0.2s',
                                            }}
                                        >
                                            {bookingLoading ? t.bookingConfirming : t.bookingConfirmBtn}
                                        </button>
                                    </div>
                                )}

                                {/* Confirmed */}
                                {bookingStep === 'confirmed' && bookingResult && (
                                    <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                                        <div style={{ fontSize: 32, marginBottom: 4 }}>✅</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.bookingConfirmed}</div>
                                        <div style={{ display: 'grid', gap: 4, fontSize: 13, background: 'var(--card-bg)', borderRadius: 12, padding: 12, textAlign: rtl ? 'right' : 'left' }}>
                                            <div>👨‍⚕️ <strong>{t.bookingDoctor}:</strong> {lang === 'ar' ? bookingResult.doctor_full_name : bookingResult.doctor_name}</div>
                                            <div>📍 <strong>{t.bookingLocation}:</strong> {lang === 'ar' ? (bookingResult.location_name_ar || bookingResult.location_name) : bookingResult.location_name}</div>
                                            <div>📅 <strong>{t.bookingDate}:</strong> {fmtDateShort(bookingResult.date, lang)}</div>
                                            <div>🕐 <strong>{t.bookingTime}:</strong> {fmtTime12(bookingResult.time, lang)}</div>
                                            <div>📋 <strong>{t.bookingStatus}:</strong> {t.bookingStatusConfirmed}</div>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                            {lang === 'ar' ? 'بتوصلك رسالة تذكير قبل الموعد' : "You'll receive a reminder before your appointment"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Booking loading spinner */}
                        {bookingLoading && (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <div className="typing-dots">
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chat-input-area">
                        {/* Attachment button (always visible) */}
                        <button
                            className="btn-attach"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isTyping || isUploading || !sessionId}
                            title={t.attachPhoto}
                        >
                            📎
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t.chatPlaceholder}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isTyping}
                            dir={rtl ? 'rtl' : 'ltr'}
                            autoFocus
                        />
                        <button
                            className="btn-send"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                        >
                            {rtl ? '←' : '→'}
                        </button>
                    </div>

                    {/* Hidden file inputs */}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'photo');
                            e.target.value = '';
                        }}
                    />
                    <input
                        ref={docInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'document');
                            e.target.value = '';
                        }}
                    />

                    <div className="disclaimer">
                        <p>{t.disclaimer}</p>
                    </div>
                    <PoweredBy />
                </div>
            )}

            {/* ── REPORT ── */}
            {phase === 'report' && (
                <div className="report-screen">
                    <div className="report-header">
                        <div className="report-icon">📋</div>
                        <h2 className="report-title">{t.reportTitle}</h2>
                        <p className="report-subtitle">{t.reportSubtitle}</p>
                    </div>

                    <div className="report-content">
                        {report}
                    </div>

                    {/* Media previews in report */}
                    {uploadedFiles.length > 0 && (
                        <div className="report-media">
                            <h3>{lang === 'ar' ? '📎 المرفقات' : '📎 Attachments'}</h3>
                            <div className="report-media-grid">
                                {uploadedFiles.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="report-media-item">
                                        {f.type === 'photo' ? (
                                            <img src={f.url} alt={f.name} />
                                        ) : (
                                            <div className="report-doc-thumb">📄 {f.name}</div>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="report-actions">
                        <button
                            className={`btn-copy ${copied ? 'copied' : ''}`}
                            onClick={handleCopy}
                        >
                            {copied ? t.copiedBtn : t.copyBtn}
                        </button>

                        <button className="btn-whatsapp" onClick={handleWhatsApp}>
                            {doctorInfo
                                ? (lang === 'ar'
                                    ? `💬 إرسال إلى د. ${doctorInfo.display_name || doctorInfo.full_name} عبر الواتساب`
                                    : `💬 Send to Dr. ${doctorInfo.display_name || doctorInfo.full_name} on WhatsApp`)
                                : t.whatsappBtn}
                        </button>

                        <button className="btn-restart" onClick={handleRestart}>
                            {t.restartBtn}
                        </button>
                    </div>
                    <PoweredBy />
                </div>
            )}
        </div>
    );
}
