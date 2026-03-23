'use client';

import Header from '@/components/Header';
import { Settings, Bot, Stethoscope, DollarSign, Shield, Globe, Save, Key, Cpu, Thermometer, Eye, EyeOff, CheckCircle, XCircle, Loader2, Zap, Camera, RotateCcw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchSettings, savePlatformSetting } from '@/lib/actions';
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
        label: '🤖 AI Configuration',
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
        label: '🩺 Consultations',
        items: [
            { key: 'Doctor Response Target', value: `${CONSULT.DOCTOR_RESPONSE_TARGET_MINUTES} min` },
            { key: 'Max Wait Time', value: `${CONSULT.MAX_WAIT_HOURS} hours` },
            { key: 'Doctor Revenue Split', value: `${CONSULT.DOCTOR_REVENUE_SPLIT * 100}%` },
            { key: 'Platform Split', value: `${CONSULT.PLATFORM_SPLIT * 100}%` },
        ],
    },
    payouts: {
        label: '💸 Payouts',
        items: [
            { key: 'Min Balance (Tokens)', value: String(PAYOUT.MIN_BALANCE_TOKENS) },
            { key: 'Schedule', value: PAYOUT.SCHEDULE },
            { key: 'Processing Days', value: String(PAYOUT.PROCESSING_DAYS) },
            { key: 'Early Fee', value: `${PAYOUT.EARLY_FEE_PERCENT}%` },
        ],
    },
    pricing: {
        label: '💰 Exchange Rates',
        items: [
            { key: '1 Token = SAR', value: String(EXCHANGE.TOKEN_TO_SAR) },
            { key: '1 Token = USD', value: String(EXCHANGE.TOKEN_TO_USD) },
            { key: '1 Token = KWD', value: String(EXCHANGE.TOKEN_TO_KWD) },
        ],
    },
    security: {
        label: '🔒 Security',
        items: [
            { key: 'Max Login Attempts', value: String(SECURITY.MAX_LOGIN_ATTEMPTS) },
            { key: 'Lockout Duration', value: `${SECURITY.LOCKOUT_MINUTES} min` },
            { key: 'Session Timeout', value: `${SECURITY.SESSION_TIMEOUT_MINUTES} min` },
            { key: 'OTP Expiry', value: `${SECURITY.OTP_EXPIRY_SECONDS}s` },
            { key: 'Password Min Length', value: String(SECURITY.PASSWORD_MIN_LENGTH) },
        ],
    },
    countries: {
        label: '🌍 Supported Countries',
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
        if (!apiKey.trim()) {
            showToast('error', 'Enter an API key first');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${apiKey.trim()}` },
            });
            if (res.ok) {
                showToast('success', 'Connection successful — API key is valid ✓');
            } else if (res.status === 401) {
                showToast('error', 'Invalid API key — authentication failed');
            } else {
                showToast('error', `OpenAI returned status ${res.status}`);
            }
        } catch {
            showToast('error', 'Network error — could not reach OpenAI');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
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
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
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
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
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

                        {/* Read-only config sections */}
                        {Object.entries(defaultSettings).map(([key, section]) => {
                            const Icon = sectionIcons[key] ?? Settings;
                            return (
                                <div key={key} className="glass rounded-2xl p-6">
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
