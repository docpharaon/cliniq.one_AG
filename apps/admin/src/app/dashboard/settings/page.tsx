import Header from '@/components/Header';
import { Settings, Bot, Stethoscope, DollarSign, Shield, Globe, Save, Key, Cpu, Thermometer, Eye, EyeOff, CheckCircle, XCircle, Loader2, Zap, Camera, RotateCcw, Clock, Coins, Heart, Plus, Trash2, GripVertical, Power, Bell, FileText, UserPlus, LogIn } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchSettings, savePlatformSetting, fetchAvgResponseTime, fetchHealthTips, addHealthTip, editHealthTip, removeHealthTip, fetchNotificationToggles, doSetNotificationToggle, doTestOpenAIConnection } from '@/lib/actions';
import { AI, CONSULT, PAYOUT, EXCHANGE, SECURITY, COUNTRIES } from '@cliniqone/config';

type Setting = { id: string; key: string; value: string; category: string; description: string | null };

// ── AI Settings editable keys ──────────────
const AI_MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast & affordable' },
    { value: 'gpt-4o', label: 'GPT-4o', desc: 'Most capable' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'High performance' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', desc: 'Legacy, cheapest' },
];

// Fallback to config values when DB settings table is empty
const defaultSettings: Record<string, { label: string; items: { key: string; value: string }[] }> = {
    ai: {
        label: 'AI Configuration',
        items: [
            { key: 'Max Intake Rounds', value: String(AI.MAX_INTAKE_ROUNDS) },
            { key: 'Max Input Tokens', value: String(AI.MAX_INPUT_TOKENS) },
            { key: 'Max Output Tokens', value: String(AI.MAX_OUTPUT_TOKENS) },
            { key: 'Max Photos per Consult', value: String(AI.MAX_PHOTOS_PER_CONSULT) },
            { key: 'Daily Budget (USD)', value: `$${AI.DAILY_BUDGET_USD}` },
            { key: 'Target Cost / Consult', value: `$${AI.TARGET_COST_PER_CONSULT_USD}` },
        ],
    },
    consultations: {
        label: 'Consultations',
        items: [
            { key: 'Doctor Response Target', value: `${CONSULT.DOCTOR_RESPONSE_TARGET_MINUTES} min` },
            { key: 'Max Wait Time', value: `${CONSULT.MAX_WAIT_HOURS} hours` },
            { key: 'Doctor Revenue Split', value: `${CONSULT.DOCTOR_REVENUE_SPLIT * 100}%` },
            { key: 'Platform Split', value: `${CONSULT.PLATFORM_SPLIT * 100}%` },
        ],
    },
    payouts: {
        label: 'Payouts',
        items: [
            { key: 'Min Balance (Tokens)', value: String(PAYOUT.MIN_BALANCE_TOKENS) },
            { key: 'Schedule', value: PAYOUT.SCHEDULE },
            { key: 'Processing Days', value: String(PAYOUT.PROCESSING_DAYS) },
            { key: 'Early Fee', value: `${PAYOUT.EARLY_FEE_PERCENT}%` },
        ],
    },
    pricing: {
        label: 'Exchange Rates',
        items: [
            { key: '1 Token = SAR', value: String(EXCHANGE.TOKEN_TO_SAR) },
            { key: '1 Token = USD', value: String(EXCHANGE.TOKEN_TO_USD) },
            { key: '1 Token = KWD', value: String(EXCHANGE.TOKEN_TO_KWD) },
        ],
    },
    security: {
        label: 'Security',
        items: [
            { key: 'Max Login Attempts', value: String(SECURITY.MAX_LOGIN_ATTEMPTS) },
            { key: 'Lockout Duration', value: `${SECURITY.LOCKOUT_MINUTES} min` },
            { key: 'Session Timeout', value: `${SECURITY.SESSION_TIMEOUT_MINUTES} min` },
            { key: 'OTP Expiry', value: `${SECURITY.OTP_EXPIRY_SECONDS}s` },
            { key: 'Password Min Length', value: String(SECURITY.PASSWORD_MIN_LENGTH) },
        ],
    },
    countries: {
        label: 'Supported Countries',
        items: COUNTRIES.map(c => ({
            key: `${c.flag} ${c.name}`,
            value: `${c.dialCode} / ${c.code}`,
        })),
    },
};

const sectionIcons: Record<string, React.ElementType> = {
    ai: Bot,
    consultations: Stethoscope,
    payouts: DollarSign,
    pricing: DollarSign,
    security: Shield,
    countries: Globe,
};

function maskApiKey(key: string): string {
    if (!key || key.length < 12) return key ? '••••••••' : '';
    return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

// ── AI Service Configuration Card ────────────
function AIServiceConfig({
    dbSettings,
    onSaved,
}: {
    dbSettings: Setting[];
    onSaved: () => void;
}) {
    const dbByKey = new Map(dbSettings.map(s => [s.key, s.value]));

    const [apiKey, setApiKey] = useState(dbByKey.get('openai_api_key') || '');
    const [model, setModel] = useState(dbByKey.get('openai_model') || 'gpt-4o-mini');
    const [temperature, setTemperature] = useState(dbByKey.get('openai_temperature') || '0.3');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Track changes
    useEffect(() => {
        const origKey = dbByKey.get('openai_api_key') || '';
        const origModel = dbByKey.get('openai_model') || 'gpt-4o-mini';
        const origTemp = dbByKey.get('openai_temperature') || '0.3';
        setHasChanges(apiKey !== origKey || model !== origModel || temperature !== origTemp);
    }, [apiKey, model, temperature, dbSettings]);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleSave = async () => {
        if (!apiKey.trim()) {
            showToast('error', 'API key is required');
            return;
        }
        setSaving(true);
        try {
            await savePlatformSetting('openai_api_key', apiKey.trim(), 'ai', 'OpenAI API Key');
            await savePlatformSetting('openai_model', model, 'ai', 'OpenAI Model');
            await savePlatformSetting('openai_temperature', temperature, 'ai', 'OpenAI Temperature');
            showToast('success', 'AI configuration saved successfully');
            setHasChanges(false);
            onSaved();
        } catch {
            showToast('error', 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            // C3 Fix: Test server-side — API key never sent to browser
            const result = await doTestOpenAIConnection();
            if (result.success) {
                showToast('success', 'Connection successful — API key is valid ✓');
            } else {
                showToast('error', result.error || 'Connection test failed');
            }
        } catch {
            showToast('error', 'Failed to test connection');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-emerald-400 to-teal-300" />

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent-faded rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text-primary">AI Service Configuration</h3>
                    <p className="text-xs text-text-muted">OpenAI API credentials used by the AI intake chatbot</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* API Key */}
                <div className="lg:col-span-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-2">
                        <Key className="w-3.5 h-3.5" /> API Key
                    </label>
                    <div className="relative">
                        <input
                            id="openai-api-key"
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 pr-20 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                            title={showKey ? 'Hide key' : 'Show key'}
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {apiKey && (
                        <p className="text-[11px] text-text-muted mt-1.5 font-mono">
                            Stored as: {maskApiKey(apiKey)}
                        </p>
                    )}
                </div>

                {/* Model */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-2">
                        <Cpu className="w-3.5 h-3.5" /> Model
                    </label>
                    <select
                        id="openai-model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all appearance-none cursor-pointer"
                    >
                        {AI_MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label} — {m.desc}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Temperature */}
                <div className="lg:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-2">
                        <Thermometer className="w-3.5 h-3.5" /> Temperature
                        <span className="ml-auto font-bold text-accent text-sm">{temperature}</span>
                    </label>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] text-text-muted whitespace-nowrap">Precise</span>
                        <input
                            id="openai-temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            className="flex-1 h-2 bg-bg-elevated rounded-full appearance-none cursor-pointer accent-accent"
                        />
                        <span className="text-[10px] text-text-muted whitespace-nowrap">Creative</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                <button
                    id="test-connection-btn"
                    onClick={handleTestConnection}
                    disabled={testing || !apiKey.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {testing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Zap className="w-4 h-4" />
                    )}
                    Test Connection
                </button>

                <div className="flex-1" />

                <button
                    id="save-ai-config-btn"
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    Save Configuration
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fade-in ${
                        toast.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <XCircle className="w-4 h-4" />
                    )}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Chatbot Avatar Configuration Card ────────
function ChatbotAvatarConfig({
    dbSettings,
    onSaved,
}: {
    dbSettings: Setting[];
    onSaved: () => void;
}) {
    const dbByKey = new Map(dbSettings.map(s => [s.key, s.value]));
    const currentUrl = dbByKey.get('chatbot_avatar_url') || '';

    const [avatarUrl, setAvatarUrl] = useState(currentUrl);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const hasChanges = avatarUrl !== currentUrl;

    useEffect(() => {
        setAvatarUrl(dbByKey.get('chatbot_avatar_url') || '');
    }, [dbSettings]);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await savePlatformSetting('chatbot_avatar_url', avatarUrl.trim(), 'ai', 'Chatbot profile photo URL shown in patient chat');
            showToast('success', 'Chatbot avatar updated');
            onSaved();
        } catch {
            showToast('error', 'Failed to save avatar URL');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setAvatarUrl('');
        setSaving(true);
        try {
            await savePlatformSetting('chatbot_avatar_url', '', 'ai', 'Chatbot profile photo URL shown in patient chat');
            showToast('success', 'Avatar reset to default');
            onSaved();
        } catch {
            showToast('error', 'Failed to reset avatar');
        } finally {
            setSaving(false);
        }
    };

    const previewSrc = avatarUrl.trim() || '/ai-doctor-avatar.jpg';

    return (
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-400" />

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Chatbot Avatar</h3>
                    <p className="text-xs text-text-muted">Profile photo displayed on AI chat messages in the patient app and test chat</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Preview */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                        <img
                            src={previewSrc}
                            alt="Chatbot avatar preview"
                            className="w-24 h-24 rounded-2xl object-cover border-2 border-accent/30 shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/ai-doctor-avatar.jpg'; }}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted text-center">
                        {avatarUrl.trim() ? 'Custom' : 'Default'}
                    </p>
                </div>

                {/* URL Input */}
                <div className="flex-1 w-full space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-text-muted mb-2 block">
                            Image URL
                        </label>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg (leave empty for default)"
                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                        />
                        <p className="text-[10px] text-text-muted mt-1.5">
                            Paste a URL to a square image (JPG, PNG, WebP). Leave empty to use the default AI doctor avatar.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Avatar
                        </button>
                        {currentUrl && (
                            <button
                                onClick={handleReset}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset to Default
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fade-in ${
                        toast.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Announcements Config ─────────────────────
type AnnouncementsConfigProps = {
    dbSettings: Setting[];
    onSaved: () => void;
};

function AnnouncementsConfig({ dbSettings, onSaved }: AnnouncementsConfigProps) {
    const dbByKey = new Map(dbSettings.map(s => [s.key, s.value]));

    const [responseEn, setResponseEn] = useState(dbByKey.get('response_time_value') || '2-4 hours');
    const [responseAr, setResponseAr] = useState(dbByKey.get('response_time_value_ar') || '٢-٤ ساعات');
    const [priceEn, setPriceEn] = useState(dbByKey.get('consultation_price_value') || '3 tokens');
    const [priceAr, setPriceAr] = useState(dbByKey.get('consultation_price_value_ar') || '٣ رموز');
    const [computed, setComputed] = useState<{ medianMinutes: number; sampleSize: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [computing, setComputing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        setResponseEn(dbByKey.get('response_time_value') || '2-4 hours');
        setResponseAr(dbByKey.get('response_time_value_ar') || '٢-٤ ساعات');
        setPriceEn(dbByKey.get('consultation_price_value') || '3 tokens');
        setPriceAr(dbByKey.get('consultation_price_value_ar') || '٣ رموز');
    }, [dbSettings]);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleCompute = async () => {
        setComputing(true);
        const result = await fetchAvgResponseTime();
        setComputed(result);
        setComputing(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await savePlatformSetting('response_time_value', responseEn, 'announcements', 'Response time (EN)');
            await savePlatformSetting('response_time_value_ar', responseAr, 'announcements', 'Response time (AR)');
            await savePlatformSetting('consultation_price_value', priceEn, 'announcements', 'Consultation price (EN)');
            await savePlatformSetting('consultation_price_value_ar', priceAr, 'announcements', 'Consultation price (AR)');
            showToast('success', 'Announcements published');
            onSaved();
        } catch {
            showToast('error', 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const formatMinutes = (m: number) => {
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        const mRem = m % 60;
        return mRem > 0 ? `${h}h ${mRem}m` : `${h}h`;
    };

    return (
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-red-400" />
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Patient Announcements</h3>
                    <p className="text-xs text-text-muted">Response time & consultation price shown on patient dashboard</p>
                </div>
            </div>

            {/* Auto-computed response time */}
            <div className="bg-bg-elevated rounded-xl p-4 border border-border mb-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-text-muted">Auto-measured Response Time (median, 30 days)</p>
                    <button onClick={handleCompute} disabled={computing}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent-faded text-accent font-semibold hover:bg-accent/20 disabled:opacity-40 transition-all">
                        {computing ? 'Computing...' : 'Recalculate'}
                    </button>
                </div>
                {computed ? (
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-accent">{formatMinutes(computed.medianMinutes)}</span>
                        <span className="text-xs text-text-muted">from {computed.sampleSize} consultations</span>
                    </div>
                ) : (
                    <p className="text-sm text-text-secondary">Stored: {dbByKey.get('avg_response_minutes') || '180'} min</p>
                )}
            </div>

            {/* Editable announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-1.5"><Clock className="w-3 h-3" /> Response Time (EN)</label>
                    <input value={responseEn} onChange={e => setResponseEn(e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                </div>
                <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-1.5"><Clock className="w-3 h-3" /> Response Time (AR)</label>
                    <input value={responseAr} onChange={e => setResponseAr(e.target.value)} dir="rtl"
                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                </div>
                <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-1.5"><Coins className="w-3 h-3" /> Consultation Price (EN)</label>
                    <input value={priceEn} onChange={e => setPriceEn(e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                </div>
                <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-1.5"><Coins className="w-3 h-3" /> Consultation Price (AR)</label>
                    <input value={priceAr} onChange={e => setPriceAr(e.target.value)} dir="rtl"
                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none" />
                </div>
            </div>

            <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Approve & Publish
            </button>

            {toast && (
                <div className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Health Tips Config ────────────────────────
type TipRow = {
    id: string;
    icon: string;
    title_en: string;
    title_ar: string | null;
    text_en: string;
    text_ar: string | null;
    is_active: boolean;
    sort_order: number;
};

const TIP_ICONS = ['💧', '🚶', '😴', '🍎', '🧘', '💊', '🏃', '🥗', '🧠', '❤️', '☀️', '🦷'];

function HealthTipsConfig({ onSaved }: { onSaved: () => void }) {
    const [tips, setTips] = useState<TipRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ icon: '💡', title_en: '', title_ar: '', text_en: '', text_ar: '', sort_order: 0 });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const loadTips = useCallback(async () => {
        const data = await fetchHealthTips();
        setTips(data as TipRow[]);
        setLoading(false);
    }, []);

    useEffect(() => { loadTips(); }, [loadTips]);

    const handleAdd = async () => {
        if (!form.title_en.trim() || !form.text_en.trim()) return;
        setSaving(true);
        const result = await addHealthTip({ ...form, is_active: true, sort_order: tips.length });
        if (result.error) { showToast('error', result.error); }
        else { showToast('success', 'Tip added'); setShowAdd(false); setForm({ icon: '💡', title_en: '', title_ar: '', text_en: '', text_ar: '', sort_order: 0 }); }
        setSaving(false);
        loadTips();
    };

    const handleToggle = async (tip: TipRow) => {
        await editHealthTip(tip.id, { is_active: !tip.is_active });
        loadTips();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this tip?')) return;
        await removeHealthTip(id);
        showToast('success', 'Tip deleted');
        loadTips();
    };

    const handleSaveEdit = async (tip: TipRow) => {
        setSaving(true);
        await editHealthTip(tip.id, { icon: tip.icon, title_en: tip.title_en, title_ar: tip.title_ar, text_en: tip.text_en, text_ar: tip.text_ar });
        showToast('success', 'Tip updated');
        setEditingId(null);
        setSaving(false);
        loadTips();
    };

    return (
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-red-400" />
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/15 rounded-xl flex items-center justify-center">
                        <Heart className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary">Health Tips</h3>
                        <p className="text-xs text-text-muted">Wellness tips shown on patient dashboard</p>
                    </div>
                </div>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-bg-primary text-xs font-bold hover:-translate-y-0.5 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add Tip
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="bg-bg-elevated rounded-xl p-4 border border-accent/30 mb-4 space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                        {TIP_ICONS.map(e => (
                            <button key={e} type="button" onClick={() => setForm(p => ({ ...p, icon: e }))}
                                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center ${form.icon === e ? 'bg-accent-faded ring-2 ring-accent' : 'bg-bg-primary hover:bg-bg-primary/80'}`}>
                                {e}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} placeholder="Title (EN)" className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent" />
                        <input value={form.title_ar} onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))} placeholder="Title (AR)" dir="rtl" className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent" />
                        <input value={form.text_en} onChange={e => setForm(p => ({ ...p, text_en: e.target.value }))} placeholder="Description (EN)" className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent" />
                        <input value={form.text_ar} onChange={e => setForm(p => ({ ...p, text_ar: e.target.value }))} placeholder="Description (AR)" dir="rtl" className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} disabled={saving || !form.title_en.trim()}
                            className="px-4 py-2 rounded-lg bg-accent text-bg-primary text-xs font-bold disabled:opacity-40 transition-all">
                            {saving ? 'Saving...' : 'Add'}
                        </button>
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-border text-xs text-text-secondary">Cancel</button>
                    </div>
                </div>
            )}

            {/* Tips list */}
            {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : tips.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">No health tips yet. Add one above.</p>
            ) : (
                <div className="space-y-2">
                    {tips.map(tip => (
                        <div key={tip.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${tip.is_active ? 'bg-bg-elevated border-border' : 'bg-bg-elevated/50 border-border/50 opacity-60'}`}>
                            <span className="text-xl">{tip.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{tip.title_en}</p>
                                <p className="text-xs text-text-muted truncate">{tip.text_en}</p>
                            </div>
                            <button onClick={() => handleToggle(tip)} title={tip.is_active ? 'Deactivate' : 'Activate'}
                                className={`p-1.5 rounded-lg transition-colors ${tip.is_active ? 'text-success hover:bg-success-faded' : 'text-text-muted hover:bg-bg-elevated'}`}>
                                <Power className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(tip.id)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-faded transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {toast && (
                <div className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Admin Notifications Config ───────────────
const NOTIFICATION_TOGGLES = [
    {
        key: 'admin_notify_consultation_submitted',
        label: 'New Consultation Submitted',
        description: 'Get notified when a patient submits a new consultation',
        icon: FileText,
        color: 'text-red-400',
        bg: 'bg-red-500/15',
        dotColor: 'bg-red-500',
    },
    {
        key: 'admin_notify_user_registered',
        label: 'New User Registered',
        description: 'Get notified when a new patient creates an account',
        icon: UserPlus,
        color: 'text-amber-400',
        bg: 'bg-amber-500/15',
        dotColor: 'bg-amber-500',
    },
    {
        key: 'admin_notify_user_login',
        label: 'User Login',
        description: 'Get notified when a patient logs in (can be noisy)',
        icon: LogIn,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        dotColor: 'bg-emerald-500',
    },
];

function AdminNotificationsConfig() {
    const [toggles, setToggles] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        fetchNotificationToggles().then(data => {
            setToggles(data as Record<string, boolean>);
            setLoading(false);
        });
    }, []);

    const handleToggle = async (key: string) => {
        const newValue = !toggles[key];
        setSaving(key);
        const result = await doSetNotificationToggle(key, newValue);
        if (result.error) {
            showToast('error', 'Failed to update toggle');
        } else {
            setToggles(prev => ({ ...prev, [key]: newValue }));
            showToast('success', `${newValue ? 'Enabled' : 'Disabled'} — ${NOTIFICATION_TOGGLES.find(t => t.key === key)?.label}`);
        }
        setSaving(null);
    };

    return (
        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400" />

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Admin Notifications</h3>
                    <p className="text-xs text-text-muted">Control which events trigger admin notifications</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
            ) : (
                <div className="space-y-3">
                    {NOTIFICATION_TOGGLES.map(toggle => {
                        const Icon = toggle.icon;
                        const isOn = toggles[toggle.key] ?? false;
                        const isSaving = saving === toggle.key;
                        return (
                            <div
                                key={toggle.key}
                                className={`flex items-center gap-4 rounded-xl px-4 py-3.5 border transition-all ${
                                    isOn ? 'bg-bg-elevated border-border' : 'bg-bg-elevated/50 border-border/50'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toggle.bg}`}>
                                    <Icon className={`w-4.5 h-4.5 ${toggle.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-primary">{toggle.label}</p>
                                    <p className="text-[11px] text-text-muted">{toggle.description}</p>
                                </div>
                                {/* Toggle switch */}
                                <button
                                    id={`toggle-${toggle.key}`}
                                    onClick={() => handleToggle(toggle.key)}
                                    disabled={isSaving}
                                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                                        isOn ? 'bg-accent' : 'bg-border'
                                    } ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                                            isOn ? 'left-[22px]' : 'left-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {toast && (
                <div
                    className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fade-in ${
                        toast.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────
export default function SettingsPage() {
    const [dbSettings, setDbSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(() => {
        fetchSettings().then((data) => {
            setDbSettings(data as Setting[]);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Merge DB settings with defaults — DB overrides
    const dbByKey = new Map(dbSettings.map(s => [s.key, s.value]));

    return (
        <>
            <Header title="Settings & Configuration" subtitle="Platform-wide settings and parameters" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Editable AI Service Config */}
                        <AIServiceConfig dbSettings={dbSettings} onSaved={loadSettings} />

                        {/* Chatbot Avatar Config */}
                        <ChatbotAvatarConfig dbSettings={dbSettings} onSaved={loadSettings} />

                        {/* Patient Announcements */}
                        <AnnouncementsConfig dbSettings={dbSettings} onSaved={loadSettings} />

                        {/* Health Tips Manager */}
                        <HealthTipsConfig onSaved={loadSettings} />

                        {/* Admin Notifications Config */}
                        <AdminNotificationsConfig />

                        {/* Read-only config sections */}
                        {Object.entries(defaultSettings).map(([key, section]) => {
                            const Icon = sectionIcons[key] ?? Settings;
                            return (
                                <div key={key} className="glass rounded-2xl p-4 md:p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 bg-accent-faded rounded-xl flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-accent" />
                                        </div>
                                        <h3 className="text-lg font-bold text-text-primary">{section.label}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {section.items.map((item) => (
                                            <div key={item.key} className="bg-bg-elevated rounded-xl px-4 py-3 border border-border">
                                                <p className="text-xs text-text-muted">{item.key}</p>
                                                <p className="text-sm font-semibold text-accent mt-1">
                                                    {dbByKey.get(item.key) ?? item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </>
    );
}
