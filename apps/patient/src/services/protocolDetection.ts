// ─────────────────────────────────────────────────
// Protocol Detection — Client-Side Safety Checks
// Runs synchronously on every patient message BEFORE AI processing
// ─────────────────────────────────────────────────

import { t } from '@cliniqone/i18n';

// ── Arabic text detection ───────────────────────
export function isArabic(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

export type ProtocolCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'O';

export interface ProtocolViolation {
    code: ProtocolCode;
    label: string;
    severity: 'critical' | 'high' | 'medium';
    message: string;
}

// ── Configurable Protocol Config ────────────────
export interface ProtocolConfig {
    emergencyKeywordsEn: string[];
    emergencyKeywordsAr: string[];
    refusalKeywords: string[];
    escalationThresholds: { warning: number; cooldown: number; terminated: number };
    cooldownSeconds: number;
}

// ── Hardcoded Defaults ──────────────────────────
const DEFAULT_EMERGENCY_EN = [
    'chest pain', 'heart attack', 'can\'t breathe', 'cannot breathe',
    'breathing difficulty', 'severe bleeding', 'unconscious',
    'suicidal', 'suicide', 'want to die', 'kill myself',
    'overdose', 'seizure', 'stroke', 'paralysis', 'collapsed',
    'choking', 'anaphylaxis', 'severe allergic reaction',
    'poisoning', 'head injury', 'car accident', 'trauma',
];

const DEFAULT_EMERGENCY_AR = [
    'ألم في الصدر', 'نوبة قلبية', 'لا أستطيع التنفس',
    'صعوبة في التنفس', 'نزيف شديد', 'فاقد الوعي',
    'انتحار', 'أريد أن أموت', 'جرعة زائدة', 'تشنج',
    'سكتة دماغية', 'شلل', 'اختناق', 'حساسية شديدة',
    'تسمم', 'إصابة في الرأس', 'حادث سيارة',
];

const DEFAULT_REFUSAL_KEYWORDS = [
    // English
    'skip', 'pass', 'next question', 'no comment',
    'none of your business', 'mind your own business',
    'i don\'t want to say', 'i dont want to say',
    'i refuse', 'not telling', 'not telling you',
    'i\'d rather not', 'id rather not', 'that\'s private',
    'thats private', 'not relevant', 'why do you need that',
    'can\'t you just skip this', 'just move on',
    // Arabic
    'لا أريد أن أقول', 'تخطي', 'ليس من شأنك', 'لا تعليق',
    'لا أريد الإجابة', 'انتقل للسؤال التالي',
];

const DEFAULT_THRESHOLDS = { warning: 3, cooldown: 5, terminated: 7 };
const DEFAULT_COOLDOWN_SECONDS = 30;

// ── Active Config (mutable, set at chat start) ──
let activeConfig: ProtocolConfig = {
    emergencyKeywordsEn: DEFAULT_EMERGENCY_EN,
    emergencyKeywordsAr: DEFAULT_EMERGENCY_AR,
    refusalKeywords: DEFAULT_REFUSAL_KEYWORDS,
    escalationThresholds: DEFAULT_THRESHOLDS,
    cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
};

/** Override defaults with admin-configured values. Call once at chat start. */
export function setProtocolConfig(config: Partial<ProtocolConfig>) {
    activeConfig = {
        emergencyKeywordsEn: config.emergencyKeywordsEn ?? DEFAULT_EMERGENCY_EN,
        emergencyKeywordsAr: config.emergencyKeywordsAr ?? DEFAULT_EMERGENCY_AR,
        refusalKeywords: config.refusalKeywords ?? DEFAULT_REFUSAL_KEYWORDS,
        escalationThresholds: config.escalationThresholds ?? DEFAULT_THRESHOLDS,
        cooldownSeconds: config.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS,
    };
}

/** Get current config (for UI reading) */
export function getProtocolConfig(): ProtocolConfig {
    return activeConfig;
}

/** Get defaults (for admin UI initial values) */
export function getDefaultProtocolConfig(): ProtocolConfig {
    return {
        emergencyKeywordsEn: DEFAULT_EMERGENCY_EN,
        emergencyKeywordsAr: DEFAULT_EMERGENCY_AR,
        refusalKeywords: DEFAULT_REFUSAL_KEYWORDS,
        escalationThresholds: DEFAULT_THRESHOLDS,
        cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
    };
}

// ── Escalation Levels ───────────────────────────
/** @deprecated Use getCooldownMs() instead */
export const COOLDOWN_DURATION = DEFAULT_COOLDOWN_SECONDS * 1000;

export type EscalationLevel = 'none' | 'warning' | 'cooldown' | 'terminated';

export function getEscalationLevel(strikeCount: number): EscalationLevel {
    const thresholds = activeConfig.escalationThresholds;
    if (strikeCount >= thresholds.terminated) return 'terminated';
    if (strikeCount >= thresholds.cooldown) return 'cooldown';
    if (strikeCount >= thresholds.warning) return 'warning';
    return 'none';
}

export function getCooldownMs(): number {
    return activeConfig.cooldownSeconds * 1000;
}

export function getEscalationColor(level: EscalationLevel): string {
    switch (level) {
        case 'warning': return '#F59E0B';
        case 'cooldown': return '#F97316';
        case 'terminated': return '#EF4444';
        default: return 'transparent';
    }
}

export function getEscalationMessage(strikeCount: number): string {
    const level = getEscalationLevel(strikeCount);
    if (level === 'terminated') return t('aiChat.escalationTerminated');
    if (level === 'cooldown') return t('aiChat.escalationCooldown');
    if (level === 'warning') return t('aiChat.escalationWarning');
    return '';
}

// ── Valid Short Answers (whitelist) ──────────────
const VALID_SHORT_ANSWERS = new Set([
    'hi', 'ok', 'hey', 'bye', 'hello', 'thanks', 'thank you', 'sure', 'fine',
    'no', 'yes', 'ya', 'yep', 'yea', 'yeah', 'nah', 'nope', 'na',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'continue', 'go', 'next', 'done', 'stop', 'ask me', 'go on', 'move on',
    'go ahead', 'please continue', 'what next',
    'pus', 'rash', 'itch', 'pain', 'acne', 'cold', 'flu', 'cough',
    'no pain', 'mild', 'severe', 'moderate', 'constant', 'daily',
    'weekly', 'monthly', 'rarely', 'never', 'always', 'sometimes',
    'none', 'nothing', 'same', 'worse', 'better', 'normal',
    'dayly', 'dayli', 'idk', 'n/a', 'dunno', 'dont know',
    // Arabic — affirmatives
    'لا', 'نعم', 'اي', 'أي', 'لأ', 'ايوا', 'آه', 'اه', 'صح', 'تمام', 'ماشي', 'أكيد', 'طبعاً',
    // Arabic — negatives
    'أبداً', 'مافي', 'ما في', 'مو', 'مب',
    // Arabic — navigation
    'يلا', 'خلاص', 'بس', 'كفاية',
    // Arabic — medical words
    'ألم', 'صداع', 'حرارة', 'سعال', 'دوخة', 'غثيان', 'تعب', 'إسهال', 'إمساك',
    'حكة', 'طفح', 'ورم', 'نزيف', 'ضغط', 'سكر', 'حساسية', 'التهاب',
    // Arabic — Gulf dialect
    'وش', 'ليش', 'كيف', 'وين', 'متى', 'شلون', 'زين',
    // Arabic — Egyptian dialect
    'ايه', 'ازاي', 'فين', 'ليه', 'كويس',
    // Arabic — Levantine dialect
    'شو', 'كيفك', 'هلق', 'منيح', 'طيب',
    // Arabic — cultural expressions
    'الحمدلله', 'ماشاءالله', 'إنشاءالله', 'يارب', 'الله يشفي',
    // Arabic — common fillers
    'ممكن', 'يمكن', 'كثير', 'قليل', 'دائماً', 'أحياناً', 'غلط', 'إيه',
]);

// ── Gibberish Detection ─────────────────────────
function isGibberish(text: string): boolean {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    if (VALID_SHORT_ANSWERS.has(lower)) return false;
    if (trimmed.length < 3) return true;

    // ── Arabic-specific gibberish checks ──
    if (isArabic(trimmed)) {
        // Repeated Arabic character (3+ of same letter)
        if (/([\u0600-\u06FF])\1{2,}/.test(trimmed)) return true;
        // Single very long Arabic word with no spaces (>15 chars) — likely mashing
        const arabicAlpha = trimmed.replace(/[^\u0600-\u06FF]/g, '');
        if (!trimmed.includes(' ') && arabicAlpha.length > 15) return true;
        // Valid Arabic input — pass through (semantic gibberish caught by AI)
        return false;
    }

    const latinChars = trimmed.replace(/[^a-zA-Z]/g, '');
    if (latinChars.length > 3) {
        const vowels = latinChars.replace(/[^aeiouAEIOU]/g, '').length;
        const vowelRatio = vowels / latinChars.length;
        if (vowelRatio < 0.05) return true;
    }

    if (/(.)\\1{4,}/.test(trimmed)) return true;

    const stripped = trimmed.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu, '');
    if (stripped.length === 0 && trimmed.length > 0) return true;

    if (latinChars.length > 30 && latinChars === latinChars.toUpperCase()) {
        const lowerMsg = lower;
        const hasRealWord = [
            'pain', 'hurt', 'help', 'blood', 'emergency', 'dying', 'severe',
            'breathe', 'chest', 'heart', 'head', 'accident', 'ambulance',
            'acne', 'rash', 'itch', 'cough', 'fever', 'cold', 'skin',
            'doctor', 'medication', 'allergy', 'pregnant', 'surgery',
            'take', 'have', 'need', 'want', 'feel', 'been', 'week',
            'month', 'year', 'daily', 'time', 'day', 'night',
        ].some(w => lowerMsg.includes(w));
        if (!hasRealWord) return true;
    }

    if (!trimmed.includes(' ') && latinChars.length >= 5) {
        const lc = latinChars.toLowerCase();
        const commonPairs = [
            'th', 'he', 'in', 'er', 'an', 'en', 'on', 'at', 'es', 'ed',
            'or', 'te', 'of', 'it', 'is', 'al', 'ar', 'ou', 'to', 'ha',
            'le', 'se', 'me', 'ne', 're', 'ea', 'ch', 'ng', 'ic', 'io',
            'be', 'co', 'de', 'di', 'li', 'lo', 'ma', 'mi', 'no', 'pa',
            'pe', 'ra', 'ri', 'ro', 'si', 'ta', 'ti', 'ur', 'us', 've',
            'ac', 'ad', 'ag', 'ai', 'am', 'ap', 'as', 'au', 'ab', 'bl',
            'br', 'ca', 'ce', 'cl', 'cr', 'cu', 'da', 'do', 'dr', 'du',
            'el', 'em', 'ev', 'ex', 'fe', 'fi', 'fl', 'fo', 'fr', 'fu',
            'ge', 'gi', 'gl', 'go', 'gr', 'gu', 'ho', 'hu', 'ig', 'im',
            'ir', 'ke', 'ki', 'la', 'lu', 'mo', 'mu', 'na', 'ni', 'nu',
            'ob', 'oc', 'om', 'op', 'ot', 'ov', 'ow', 'pi', 'pl', 'po',
            'pr', 'pu', 'qu', 'ru', 'sa', 'sc', 'sh', 'sk', 'sl', 'sm',
            'sn', 'so', 'sp', 'st', 'su', 'sw', 'tr', 'tu', 'un', 'up',
            'ut', 'va', 'vi', 'wa', 'we', 'wi', 'wo', 'ye',
            'ph', 'ps', 'pt', 'rh', 'gy', 'sy',
        ];

        let hasCommonPair = false;
        for (let i = 0; i < lc.length - 1; i++) {
            if (commonPairs.includes(lc.slice(i, i + 2))) {
                hasCommonPair = true;
                break;
            }
        }
        if (!hasCommonPair) return true;

        const vowels = lc.replace(/[^aeiou]/g, '').length;
        if (vowels / lc.length < 0.15) return true;
    }

    return false;
}

// ── Refusal / Resistance Detection ──────────────
export function isRefusal(text: string): boolean {
    const lower = text.trim().toLowerCase();
    if (activeConfig.refusalKeywords.some(kw => lower === kw.toLowerCase())) return true;
    if (lower.length < 80) {
        if (activeConfig.refusalKeywords.some(kw => lower.includes(kw.toLowerCase()))) return true;
    }
    return false;
}

// ── Repeated message detection ──────────────────
export function isRepeatedMessage(message: string, recentMessages: string[]): boolean {
    if (recentMessages.length === 0) return false;
    const lower = message.trim().toLowerCase();
    const repeats = recentMessages.filter(m => m.trim().toLowerCase() === lower).length;
    return repeats >= 2;
}

// ── AI Violation Tag Parser ─────────────────────
export function parseViolationTag(aiResponse: string): {
    cleanContent: string;
    violation: string | null;
} {
    const match = aiResponse.match(/\[VIOLATION:([^\]]+)\]/);
    if (match) {
        return {
            cleanContent: aiResponse.replace(/\[VIOLATION:[^\]]+\]/g, '').trim(),
            violation: match[1],
        };
    }
    return { cleanContent: aiResponse, violation: null };
}

// ── Main Detection Function ─────────────────────
export function detectProtocols(
    message: string,
    gibberishCount: number = 0,
    recentMessages: string[] = [],
): { violations: ProtocolViolation[]; newGibberishCount: number } {
    const violations: ProtocolViolation[] = [];
    let newGibberishCount = gibberishCount;
    const lower = message.toLowerCase().trim();

    // Protocol A — Emergency Detection
    const allEmergency = [...activeConfig.emergencyKeywordsEn, ...activeConfig.emergencyKeywordsAr];
    for (const keyword of allEmergency) {
        if (lower.includes(keyword.toLowerCase())) {
            violations.push({
                code: 'A',
                label: 'Emergency Detected',
                severity: 'critical',
                message: t('protocol.emergencyDetected'),
            });
            break;
        }
    }

    // Protocol I — Gibberish / Non-Cooperation
    if (violations.length === 0 && isGibberish(message)) {
        newGibberishCount += 1;
        const level = getEscalationLevel(newGibberishCount);

        if (level === 'terminated') {
            violations.push({ code: 'I', label: 'Session Terminated', severity: 'critical', message: getEscalationMessage(newGibberishCount) });
        } else if (level === 'cooldown') {
            violations.push({ code: 'I', label: 'Chat Paused', severity: 'high', message: getEscalationMessage(newGibberishCount) });
        } else if (level === 'warning') {
            violations.push({ code: 'I', label: 'Stay On Topic', severity: 'high', message: getEscalationMessage(newGibberishCount) });
        } else {
            violations.push({ code: 'I', label: 'Please Respond Properly', severity: 'medium', message: t('protocol.respondProperly') });
        }
    }

    // Refusal / resistance detection
    if (violations.length === 0 && isRefusal(message)) {
        newGibberishCount += 1;
        violations.push({ code: 'I', label: 'Response Declined', severity: 'medium', message: t('protocol.refusalResponse') });
    }

    // Repeated message detection
    if (violations.length === 0 && isRepeatedMessage(message, recentMessages)) {
        newGibberishCount += 1;
        violations.push({ code: 'I', label: 'Repeated Message', severity: 'medium', message: t('protocol.repeatedMessage') });
    }

    return { violations, newGibberishCount };
}

// ── Emergency Numbers ───────────────────────────
export const EMERGENCY_NUMBERS = {
    SA: { ambulance: '997', police: '999', fire: '998' },
    AE: { ambulance: '998', police: '999', fire: '997' },
    KW: { ambulance: '112', police: '112', fire: '112' },
    BH: { ambulance: '999', police: '999', fire: '999' },
    QA: { ambulance: '999', police: '999', fire: '999' },
    OM: { ambulance: '9999', police: '9999', fire: '9999' },
};
