'use client';

import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import PromptEditorModal from '@/components/PromptEditorModal';
import ChatTestWindow from '@/components/ChatTestWindow';
import SequenceBuilderContent from '@/components/SequenceBuilderContent';
import ChatReportsPanel from '@/components/ChatReportsPanel';
import { useEffect, useState, useCallback } from 'react';
import { fetchAIPrompts, deletePrompt, savePlatformSetting, fetchPlatformSetting, fetchPromptSequences, fetchSequenceWithNodes, fetchDraftCount, doPublishDrafts, fetchRecentPromptActivity } from '@/lib/actions';
import {
    Bot,
    Cpu,
    Zap,
    FileCode,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Key,
    Eye,
    EyeOff,
    Save,
    MessageSquare,
    GitBranchPlus,
    ArrowRight,
    Sparkles,
    BrainCircuit,
    Shield,
    Play,
    ChevronDown,
    Settings2,
    Info,
    Languages,
    Power,
    CheckCircle2,
    XCircle,
    Rocket,
    Clock,
    Upload,
    FlaskConical,
} from 'lucide-react';

type PromptRow = {
    id: string;
    name: string;
    specialty: string;
    prompt_type: string;
    content: string;
    is_active: boolean;
    version: number;
    status?: string;
    updated_at: string;
};

type SequenceInfo = {
    id: string;
    name: string;
    is_default: boolean;
};

type SequenceNode = {
    id: string;
    step_key: string;
    label: string;
    emoji: string;
    prompt_id: string | null;
    sort_order: number;
    pathway_condition: string | null;
    ai_prompts: { id: string; name: string; version: number; is_active: boolean } | null;
};

const typeMap: Record<string, { variant: 'success' | 'info' | 'warning' | 'neutral'; label: string }> = {
    system: { variant: 'info', label: 'System' },
    intake: { variant: 'success', label: 'Intake' },
    summary: { variant: 'warning', label: 'Summary' },
    triage: { variant: 'neutral', label: 'Triage' },
    global_guard: { variant: 'neutral', label: '🛡️ Guard' },
};

type TabId = 'dashboard' | 'settings' | 'prompts' | 'sequences' | 'sandbox' | 'translation';

export default function AIPage() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [prompts, setPrompts] = useState<PromptRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showChatbot, setShowChatbot] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingPrompt, setEditingPrompt] = useState<PromptRow | null>(null);

    // API Key config
    const [apiKey, setApiKey] = useState('');
    const [apiKeyMasked, setApiKeyMasked] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [keyMsg, setKeyMsg] = useState('');

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Quick-test a specific prompt
    const [testingPromptId, setTestingPromptId] = useState<string | null>(null);

    // Delete error feedback
    const [deleteError, setDeleteError] = useState('');

    // Recent activity (ordered by updated_at)
    const [recentActivity, setRecentActivity] = useState<PromptRow[]>([]);

    // Chat Bot pre-launch config
    const [sequences, setSequences] = useState<SequenceInfo[]>([]);
    const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
    const [sequenceNodes, setSequenceNodes] = useState<SequenceNode[]>([]);
    const [selectedPromptOverride, setSelectedPromptOverride] = useState<string>('');
    const [loadingSequence, setLoadingSequence] = useState(false);

    // Model config
    const [modelName, setModelName] = useState('gpt-4o-mini');
    const [temperature, setTemperature] = useState(0.3);
    const [savingModel, setSavingModel] = useState(false);
    const [modelMsg, setModelMsg] = useState('');

    // ── Chatbot Activation State ─────────────────
    const [chatbotEnabled, setChatbotEnabled] = useState(false);
    const [activeSequenceId, setActiveSequenceId] = useState<string>('');
    const [savingActivation, setSavingActivation] = useState(false);
    const [activationMsg, setActivationMsg] = useState('');
    const [chatbotVersion, setChatbotVersion] = useState<string>('—');

    // ── Protocol Config State ────────────────────
    const [protoEmergencyEn, setProtoEmergencyEn] = useState<string[]>([]);
    const [protoEmergencyAr, setProtoEmergencyAr] = useState<string[]>([]);
    const [protoGibberish, setProtoGibberish] = useState<string[]>([]);
    const [protoThresholds, setProtoThresholds] = useState({ warning: 3, cooldown: 5, terminated: 7 });
    const [protoCooldown, setProtoCooldown] = useState(30);
    const [savingProto, setSavingProto] = useState(false);
    const [protoMsg, setProtoMsg] = useState('');
    const [newKeyword, setNewKeyword] = useState('');
    const [newKeywordAr, setNewKeywordAr] = useState('');

    // Draft workflow
    const [draftCount, setDraftCount] = useState(0);
    const [publishingDrafts, setPublishingDrafts] = useState(false);
    const [publishMsg, setPublishMsg] = useState('');

    // Translation AI state
    const [translationEnabled, setTranslationEnabled] = useState(true);
    const [translationPrompt, setTranslationPrompt] = useState('');
    const [translationModel, setTranslationModel] = useState('');
    const [savingTranslation, setSavingTranslation] = useState(false);
    const [translationMsg, setTranslationMsg] = useState('');
    const [translationTestInput, setTranslationTestInput] = useState('');
    const [translationTestOutput, setTranslationTestOutput] = useState('');
    const [translationTesting, setTranslationTesting] = useState(false);

    const loadPrompts = useCallback(async () => {
        setLoading(true);
        const { data, count } = await fetchAIPrompts(1, 200);
        setPrompts(data as PromptRow[]);
        setTotalCount(count);
        setLoading(false);
        // Also refresh draft count + recent activity
        fetchDraftCount().then(c => setDraftCount(c));
        fetchRecentPromptActivity(5).then(d => setRecentActivity(d as PromptRow[]));
    }, []);

    useEffect(() => { loadPrompts(); }, [loadPrompts]);

    // Load API key + activation state on mount
    useEffect(() => {
        fetchPlatformSetting('openai_api_key').then(val => {
            if (val) {
                setApiKeyMasked(`••••••••${val.slice(-4)}`);
                setApiKey(val);
            }
        });
        fetchPlatformSetting('openai_model').then(val => {
            if (val) setModelName(val);
        });
        fetchPlatformSetting('openai_temperature').then(val => {
            if (val) setTemperature(parseFloat(val));
        });
        fetchPlatformSetting('ai_chatbot_enabled').then(val => {
            setChatbotEnabled(val === 'true');
        });
        fetchPlatformSetting('ai_active_sequence_id').then(val => {
            if (val) setActiveSequenceId(val);
        });
        fetchPlatformSetting('chatbot_version').then(val => {
            if (val) setChatbotVersion(`v${val}`);
        });
        // Load protocol config
        fetchPlatformSetting('protocol_emergency_keywords_en').then(val => {
            if (val) try { setProtoEmergencyEn(JSON.parse(val)); } catch { }
        });
        fetchPlatformSetting('protocol_emergency_keywords_ar').then(val => {
            if (val) try { setProtoEmergencyAr(JSON.parse(val)); } catch { }
        });
        fetchPlatformSetting('protocol_gibberish_keywords').then(val => {
            if (val) try { setProtoGibberish(JSON.parse(val)); } catch { }
        });
        fetchPlatformSetting('protocol_escalation_thresholds').then(val => {
            if (val) try { setProtoThresholds(JSON.parse(val)); } catch { }
        });
        fetchPlatformSetting('protocol_cooldown_seconds').then(val => {
            if (val) setProtoCooldown(parseInt(val, 10));
        });
        // Translation settings
        fetchPlatformSetting('translation_enabled').then(val => {
            if (val !== null) setTranslationEnabled(val !== 'false');
        });
        fetchPlatformSetting('translation_system_prompt').then(val => {
            if (val) setTranslationPrompt(val);
        });
        fetchPlatformSetting('translation_model').then(val => {
            if (val) setTranslationModel(val);
        });
    }, []);

    // Load sequences for chatbot tab
    useEffect(() => {
        fetchPromptSequences().then(data => {
            const seqs = data as SequenceInfo[];
            setSequences(seqs);
            const defaultSeq = seqs.find(s => s.is_default) || seqs[0];
            if (defaultSeq) setSelectedSequenceId(defaultSeq.id);
        });
    }, []);

    // Load sequence nodes when sequence selection changes
    useEffect(() => {
        if (!selectedSequenceId) { setSequenceNodes([]); return; }
        setLoadingSequence(true);
        fetchSequenceWithNodes(selectedSequenceId).then(seq => {
            if (seq) setSequenceNodes((seq as { nodes: SequenceNode[] }).nodes ?? []);
            setLoadingSequence(false);
        });
    }, [selectedSequenceId]);

    const activeCount = prompts.filter(p => p.is_active).length;
    const maxVersion = prompts.length > 0 ? Math.max(...prompts.map(p => p.version)) : 1;

    function handleCreate() {
        setModalMode('create');
        setEditingPrompt(null);
        setModalOpen(true);
    }

    function handleEdit(row: PromptRow) {
        setModalMode('edit');
        setEditingPrompt(row);
        setModalOpen(true);
    }

    async function handleDeleteRow(id: string) {
        const prompt = prompts.find(p => p.id === id);
        const confirmMsg = `Are you sure you want to delete "${prompt?.name}"?\n\nThis action will soft-delete the prompt (it can be recovered later).`;
        if (!confirm(confirmMsg)) return;
        setDeletingId(id);
        setDeleteError('');
        const res = await deletePrompt(id);
        if (res.success) {
            await loadPrompts();
        } else if (res.error) {
            setDeleteError(res.error);
            setTimeout(() => setDeleteError(''), 8000);
        }
        setDeletingId(null);
    }

    async function handleSaveApiKey() {
        if (!apiKey.trim()) return;
        if (!confirm('Update the OpenAI API key? This change takes effect immediately.')) return;
        setSavingKey(true);
        setKeyMsg('');
        const res = await savePlatformSetting('openai_api_key', apiKey, 'ai', 'OpenAI API key for AI chat');
        if (res.error) {
            setKeyMsg(`Error: ${res.error}`);
        } else {
            setApiKeyMasked(`••••••••${apiKey.slice(-4)}`);
            setKeyMsg('✅ Saved!');
            setTimeout(() => setKeyMsg(''), 3000);
        }
        setSavingKey(false);
    }

    async function handleSaveModelConfig() {
        if (!confirm(`Switch model to "${modelName}" with temperature ${temperature.toFixed(1)}? This affects all live patient conversations.`)) return;
        setSavingModel(true);
        setModelMsg('');
        try {
            await savePlatformSetting('openai_model', modelName, 'ai', 'OpenAI model name');
            await savePlatformSetting('openai_temperature', temperature.toString(), 'ai', 'OpenAI temperature');
            setModelMsg('✅ Model config saved!');
            setTimeout(() => setModelMsg(''), 3000);
        } catch {
            setModelMsg('Error saving model config');
        }
        setSavingModel(false);
    }

    // ── Chatbot Activation ───────────────────────
    async function handleActivateChatbot() {
        if (!selectedSequenceId) return;
        const newState = !chatbotEnabled;

        // Pre-flight checks before activation
        if (newState) {
            if (!apiKey.trim()) {
                setActivationMsg('❌ Cannot activate: API key is not configured. Go to Settings to add one.');
                setTimeout(() => setActivationMsg(''), 6000);
                return;
            }
            const unlinked = sequenceNodes.filter(n => !n.ai_prompts);
            if (unlinked.length > 0) {
                const names = unlinked.map(n => n.step_key).join(', ');
                setActivationMsg(`❌ Cannot activate: ${unlinked.length} sequence node(s) have no prompt linked (${names}). Fix in Interview Flow.`);
                setTimeout(() => setActivationMsg(''), 8000);
                return;
            }
            if (activeCount === 0) {
                setActivationMsg('❌ Cannot activate: no prompts are active.');
                setTimeout(() => setActivationMsg(''), 6000);
                return;
            }
        }

        const msg = newState
            ? 'Activate the AI Chatbot for all patients? They will immediately start using the selected sequence.'
            : 'Deactivate the AI Chatbot? Patients will no longer be able to use AI-powered intake.';
        if (!confirm(msg)) return;
        setSavingActivation(true);
        setActivationMsg('');
        try {
            await savePlatformSetting('ai_chatbot_enabled', newState ? 'true' : 'false', 'ai', 'Enable AI chatbot for patient app');
            if (newState) {
                await savePlatformSetting('ai_active_sequence_id', selectedSequenceId, 'ai', 'Active AI sequence for patient chatbot');
                setActiveSequenceId(selectedSequenceId);
            }
            setChatbotEnabled(newState);
            setActivationMsg(newState ? '✅ AI Chatbot activated for patient app!' : '⏸️ AI Chatbot deactivated');
            setTimeout(() => setActivationMsg(''), 4000);
        } catch {
            setActivationMsg('❌ Error updating chatbot status');
        }
        setSavingActivation(false);
    }

    async function handleSetActiveSequence() {
        if (!selectedSequenceId) return;
        setSavingActivation(true);
        setActivationMsg('');
        try {
            await savePlatformSetting('ai_active_sequence_id', selectedSequenceId, 'ai', 'Active AI sequence for patient chatbot');
            setActiveSequenceId(selectedSequenceId);
            setActivationMsg('✅ Active sequence updated!');
            setTimeout(() => setActivationMsg(''), 3000);
        } catch {
            setActivationMsg('❌ Error updating sequence');
        }
        setSavingActivation(false);
    }

    // ── Publish Drafts ───────────────────────────
    async function handlePublishDrafts() {
        if (!confirm(`Publish ${draftCount} draft prompt(s)? This will make them live for all patients and bump the chatbot version.`)) return;
        setPublishingDrafts(true);
        setPublishMsg('');
        try {
            const result = await doPublishDrafts();
            if (result.success) {
                setPublishMsg(`✅ Published ${result.publishedCount} prompt(s) — now at v${result.newVersion}`);
                setChatbotVersion(`v${result.newVersion}`);
                setDraftCount(0);
                await loadPrompts();
            } else {
                setPublishMsg(`❌ ${result.error || 'Error publishing drafts'}`);
            }
            setTimeout(() => setPublishMsg(''), 5000);
        } catch {
            setPublishMsg('❌ Error publishing drafts');
        }
        setPublishingDrafts(false);
    }

    // ── Protocol Helpers ─────────────────────────
    function addKeyword(list: string[], setter: (v: string[]) => void, keyword: string) {
        const kw = keyword.trim();
        if (!kw || list.includes(kw)) return;
        setter([...list, kw]);
        setNewKeyword('');
    }

    function removeKeyword(list: string[], setter: (v: string[]) => void, index: number) {
        setter(list.filter((_, i) => i !== index));
    }

    async function handleSaveProtocol() {
        if (!confirm('Save protocol changes? These affect how the chatbot handles emergencies and escalation.')) return;
        setSavingProto(true);
        setProtoMsg('');
        try {
            await savePlatformSetting('protocol_emergency_keywords_en', JSON.stringify(protoEmergencyEn), 'protocol', 'Emergency keywords (EN)');
            await savePlatformSetting('protocol_emergency_keywords_ar', JSON.stringify(protoEmergencyAr), 'protocol', 'Emergency keywords (AR)');
            await savePlatformSetting('protocol_gibberish_keywords', JSON.stringify(protoGibberish), 'protocol', 'Gibberish / non-cooperation keywords');
            await savePlatformSetting('protocol_escalation_thresholds', JSON.stringify(protoThresholds), 'protocol', 'Escalation strike thresholds');
            await savePlatformSetting('protocol_cooldown_seconds', protoCooldown.toString(), 'protocol', 'Cooldown duration in seconds');
            setProtoMsg('✅ Protocol settings saved!');
            setTimeout(() => setProtoMsg(''), 3000);
        } catch {
            setProtoMsg('Error saving protocol settings');
        }
        setSavingProto(false);
    }

    const columns = [
        {
            key: 'name',
            label: 'Prompt Name',
            render: (row: PromptRow) => (
                <p className="font-semibold text-text-primary max-w-[250px] truncate">{row.name}</p>
            ),
        },
        {
            key: 'specialty',
            label: 'Specialty',
            render: (row: PromptRow) => (
                <span className="text-accent text-sm capitalize">{row.specialty?.replace('_', ' ')}</span>
            ),
        },
        {
            key: 'prompt_type',
            label: 'Type',
            render: (row: PromptRow) => {
                const t = typeMap[row.prompt_type] ?? { variant: 'neutral' as const, label: row.prompt_type };
                return <StatusBadge label={t.label} variant={t.variant} />;
            },
        },
        {
            key: 'version',
            label: 'Version',
            render: (row: PromptRow) => (
                <span className="text-purple font-bold">v{row.version}</span>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (row: PromptRow) => {
                const isDraft = (row as any).status === 'draft';
                return (
                    <div className="flex items-center gap-1.5">
                        <StatusBadge label={row.is_active ? 'Active' : 'Disabled'} variant={row.is_active ? 'success' : 'neutral'} />
                        {isDraft && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                DRAFT
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'content',
            label: 'Preview',
            render: (row: PromptRow) => (
                <span className="text-xs text-text-muted max-w-[200px] truncate block">{row.content?.slice(0, 80)}…</span>
            ),
        },
        {
            key: 'updated_at',
            label: 'Updated',
            render: (row: PromptRow) => (
                <span className="text-sm text-text-secondary">
                    {new Date(row.updated_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            render: (row: PromptRow) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setTestingPromptId(row.id); setShowChatbot(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-purple hover:bg-purple-faded transition-colors"
                        title="Test this prompt in chatbot"
                    >
                        <Play className="w-3 h-3" /> Test
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors"
                    >
                        <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRow(row.id);
                        }}
                        disabled={deletingId === row.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-error hover:bg-error-faded transition-colors disabled:opacity-50"
                    >
                        {deletingId === row.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Trash2 className="w-3 h-3" />
                        )}
                    </button>
                </div>
            ),
        },
    ];

    const tabs: { id: TabId; label: string; icon: typeof Bot }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
        { id: 'settings', label: 'Settings', icon: Settings2 },
        { id: 'prompts', label: 'Prompts & Safety', icon: FileCode },
        { id: 'sequences', label: 'Interview Flow', icon: GitBranchPlus },
        { id: 'sandbox', label: 'Sandbox', icon: FlaskConical },
        { id: 'translation', label: 'Translation', icon: Languages },
    ];

    const DEFAULT_TRANSLATION_PROMPT = `You are a professional medical translator. Translate the following English medical text into Modern Standard Arabic (العربية الفصحى).

RULES:
- Use formal, clear Arabic suitable for a patient medical report
- Preserve medical terminology accuracy
- Do not add explanations or notes — output ONLY the Arabic translation
- Maintain the same structure (bullet points, numbered lists, etc.)
- Use Arabic numerals (١٢٣) instead of Western numerals`;

    async function handleSaveTranslation() {
        setSavingTranslation(true);
        setTranslationMsg('');
        try {
            await savePlatformSetting('translation_enabled', translationEnabled ? 'true' : 'false', 'ai', 'Enable Arabic translation for doctor responses');
            await savePlatformSetting('translation_system_prompt', translationPrompt || DEFAULT_TRANSLATION_PROMPT, 'ai', 'Translation AI system prompt');
            await savePlatformSetting('translation_model', translationModel, 'ai', 'Translation AI model override');
            setTranslationMsg('✅ Translation settings saved!');
            setTimeout(() => setTranslationMsg(''), 3000);
        } catch {
            setTranslationMsg('Error saving translation settings');
        }
        setSavingTranslation(false);
    }

    async function handleTestTranslation() {
        if (!translationTestInput.trim()) return;
        setTranslationTesting(true);
        setTranslationTestOutput('');
        try {
            const prompt = translationPrompt || DEFAULT_TRANSLATION_PROMPT;
            const mdl = translationModel || modelName || 'gpt-4o-mini';
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: mdl,
                    temperature: 0.2,
                    max_tokens: 2000,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: translationTestInput.trim() },
                    ],
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setTranslationTestOutput(data.choices?.[0]?.message?.content?.trim() || 'No output');
            } else {
                setTranslationTestOutput(`Error: API returned ${res.status}`);
            }
        } catch {
            setTranslationTestOutput('Error: Could not reach OpenAI');
        }
        setTranslationTesting(false);
    }

    // Group prompts by type for the chatbot selector
    const promptsByType = prompts.reduce((acc, p) => {
        const t = p.prompt_type || 'other';
        if (!acc[t]) acc[t] = [];
        acc[t].push(p);
        return acc;
    }, {} as Record<string, PromptRow[]>);

    // Nodes without pathway conditions (linear flow)
    const linearNodes = sequenceNodes.filter(n => !n.pathway_condition);
    const branchNodes = sequenceNodes.filter(n => !!n.pathway_condition);

    const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

    return (
        <>
            <Header title="AI Management" subtitle="Prompts, sequences, chatbot testing & configuration" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">

                {/* ── Tab Navigation ─────────────────── */}
                <div className="flex items-center gap-1 p-1 bg-bg-elevated rounded-2xl border border-border overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive
                                    ? 'bg-accent text-bg-primary shadow-lg shadow-accent/20'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ══════════════ TAB: Dashboard ══════════════ */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">

                        {/* ── Compact Status Bar ───────── */}
                        <div className={`glass rounded-2xl p-5 border-2 transition-all duration-500 ${chatbotEnabled
                            ? 'border-success/30 shadow-[0_0_32px_rgba(34,197,94,0.06)]'
                            : 'border-warning/20'
                            }`}>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="p-3 rounded-xl bg-bg-elevated border border-border">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${chatbotEnabled ? 'bg-success animate-pulse' : 'bg-error'}`} />
                                        <span className={`text-sm font-bold ${chatbotEnabled ? 'text-success' : 'text-error'}`}>
                                            {chatbotEnabled ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-bg-elevated border border-border">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">Version</p>
                                    <span className="text-sm font-bold text-purple">{chatbotVersion}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-bg-elevated border border-border">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">Prompts</p>
                                    <span className="text-sm font-bold text-text-primary">{activeCount}<span className="text-text-muted font-normal">/{totalCount}</span></span>
                                </div>
                                <div className="p-3 rounded-xl bg-bg-elevated border border-border">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">Model</p>
                                    <span className="text-sm font-bold text-purple">{modelName}</span>
                                    <span className="text-[10px] text-text-muted ml-1">T={temperature.toFixed(1)}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-bg-elevated border border-border">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">API Key</p>
                                    <div className="flex items-center gap-1.5">
                                        {apiKeyMasked
                                            ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-sm font-bold text-success">OK</span></>
                                            : <><XCircle className="w-3.5 h-3.5 text-error" /><span className="text-sm font-bold text-error">Missing</span></>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Draft Publishing Card ───────── */}
                        {draftCount > 0 && (
                            <div className="glass rounded-2xl p-5 border-2 border-amber-500/30 bg-amber-500/5 animate-fade-in">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                            <Upload className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">
                                                {draftCount} Draft Change{draftCount !== 1 ? 's' : ''} Pending
                                            </h3>
                                            <p className="text-xs text-text-muted">
                                                Publish to make them live for patients and bump the chatbot version
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {publishMsg && (
                                            <p className={`text-sm font-medium animate-fade-in ${publishMsg.startsWith('✅') ? 'text-success' : 'text-error'}`}>
                                                {publishMsg}
                                            </p>
                                        )}
                                        <button
                                            onClick={handlePublishDrafts}
                                            disabled={publishingDrafts}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,158,11,0.3)] transition-all duration-300 disabled:opacity-50"
                                        >
                                            {publishingDrafts ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                            Publish All Drafts
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Quick Actions Row ───────── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setActiveTab('sandbox')}
                                className="group glass rounded-2xl p-5 text-left border border-border hover:border-purple/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(155,114,207,0.15)]"
                            >
                                <div className="w-11 h-11 rounded-xl bg-purple-faded flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FlaskConical className="w-5 h-5 text-purple" />
                                </div>
                                <h3 className="text-sm font-bold text-text-primary mb-1">Test Sandbox</h3>
                                <p className="text-xs text-text-muted leading-relaxed">Launch a simulated intake interview with draft prompts</p>
                                <div className="flex items-center gap-1 mt-3 text-xs text-purple font-semibold">
                                    Open Sandbox <ArrowRight className="w-3 h-3" />
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('prompts')}
                                className="group glass rounded-2xl p-5 text-left border border-border hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(96,165,250,0.15)]"
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <BrainCircuit className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-sm font-bold text-text-primary mb-1">Prompts & Safety</h3>
                                <p className="text-xs text-text-muted leading-relaxed">{totalCount} prompts, {activeCount} active</p>
                                <div className="flex items-center gap-1 mt-3 text-xs text-blue-400 font-semibold">
                                    Manage <ArrowRight className="w-3 h-3" />
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="group glass rounded-2xl p-5 text-left border border-border hover:border-accent/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,212,191,0.15)]"
                            >
                                <div className="w-11 h-11 rounded-xl bg-accent-faded flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Settings2 className="w-5 h-5 text-accent" />
                                </div>
                                <h3 className="text-sm font-bold text-text-primary mb-1">Settings</h3>
                                <p className="text-xs text-text-muted leading-relaxed">API Key, Model, Production toggle</p>
                                <div className="flex items-center gap-1 mt-3 text-xs text-accent font-semibold">
                                    Configure <ArrowRight className="w-3 h-3" />
                                </div>
                            </button>
                        </div>

                        {/* ── Recent Activity ───────── */}
                        <div className="glass rounded-2xl p-5 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-4 h-4 text-accent" />
                                <h3 className="text-sm font-bold text-text-primary">Recent Activity</h3>
                            </div>
                            {prompts.length === 0 ? (
                                <p className="text-xs text-text-muted text-center py-4">No prompts yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {prompts.slice(0, 5).map((r: PromptRow) => (
                                        <div key={r.id as string} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-elevated text-xs">
                                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                                            <span className="font-medium text-text-primary flex-1 truncate">{r.name}</span>
                                            <span className="text-[10px] text-text-muted font-mono">v{r.version ?? 1}</span>
                                            {(r as any).status === 'draft' && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">DRAFT</span>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${r.is_active ? 'bg-success-faded text-success' : 'bg-bg-tertiary text-text-muted'}`}>
                                                {r.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-[9px] text-text-muted">{new Date(r.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                    {prompts.length > 5 && (
                                        <button
                                            onClick={() => setActiveTab('prompts')}
                                            className="w-full text-center text-[10px] text-accent font-semibold py-1 hover:underline"
                                        >
                                            View all {prompts.length} prompts →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Patient Reports ───────── */}
                        <ChatReportsPanel />
                    </div>
                )}

                {/* ══════════════ TAB: Settings ══════════════ */}
                {activeTab === 'settings' && (
                    <div className="animate-fade-in space-y-6 max-w-3xl">

                        {/* ═══ 🚀 PRODUCTION CONTROL ═══ */}
                        <div className="flex items-center gap-2 mb-1">
                            <Rocket className="w-4 h-4 text-success" />
                            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Production Control</h2>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* ── Activation Banner ───────────── */}
                        <div className={`glass rounded-2xl p-4 md:p-6 border-2 transition-all duration-500 ${chatbotEnabled
                            ? 'border-success/40 bg-success/5 shadow-[0_0_32px_rgba(34,197,94,0.08)]'
                            : 'border-warning/30 bg-warning/5'
                            }`}>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${chatbotEnabled
                                        ? 'bg-success/20 shadow-[0_0_16px_rgba(34,197,94,0.2)]'
                                        : 'bg-warning/15'
                                        }`}>
                                        {chatbotEnabled
                                            ? <CheckCircle2 className="w-7 h-7 text-success" />
                                            : <XCircle className="w-7 h-7 text-warning" />
                                        }
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-text-primary">
                                            AI Chatbot is {chatbotEnabled ? 'Active' : 'Inactive'}
                                        </h2>
                                        <p className="text-sm text-text-muted">
                                            {chatbotEnabled
                                                ? <>Patients are using <span className="text-success font-semibold">{sequences.find(s => s.id === activeSequenceId)?.name || 'the configured'}</span> sequence</>
                                                : 'Enable the AI chatbot to activate it for all patients in the app'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {activationMsg && (
                                        <p className={`text-sm font-medium animate-fade-in ${activationMsg.startsWith('✅') ? 'text-success'
                                            : activationMsg.startsWith('⏸') ? 'text-warning'
                                                : 'text-error'
                                            }`}>{activationMsg}</p>
                                    )}
                                    <button
                                        onClick={handleActivateChatbot}
                                        disabled={savingActivation || (!chatbotEnabled && !selectedSequenceId)}
                                        className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40 ${chatbotEnabled
                                            ? 'bg-bg-elevated border-2 border-warning/40 text-warning hover:bg-warning/10 hover:border-warning/60'
                                            : 'bg-gradient-to-r from-success to-emerald-400 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)]'
                                            }`}
                                    >
                                        {savingActivation ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : chatbotEnabled ? (
                                            <Power className="w-4 h-4" />
                                        ) : (
                                            <Rocket className="w-4 h-4" />
                                        )}
                                        {chatbotEnabled ? 'Deactivate' : 'Activate for Patients'}
                                    </button>
                                </div>
                            </div>

                            {/* Active Sequence indicator when enabled */}
                            {chatbotEnabled && activeSequenceId && (
                                <div className="mt-4 pt-4 border-t border-success/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-text-muted">
                                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                            <span>Active sequence: <span className="text-success font-semibold">{sequences.find(s => s.id === activeSequenceId)?.name}</span></span>
                                        </div>
                                        {selectedSequenceId && selectedSequenceId !== activeSequenceId && (
                                            <button
                                                onClick={handleSetActiveSequence}
                                                disabled={savingActivation}
                                                className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline disabled:opacity-50"
                                            >
                                                {savingActivation ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                                                Switch to selected
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <span>Config version: <span className="text-purple font-bold">{chatbotVersion}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ 📦 PUBLISH DRAFTS ═══ */}
                        {draftCount > 0 && (
                            <div className="glass rounded-2xl p-5 border-2 border-amber-500/30 bg-amber-500/5 animate-fade-in">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                            <Upload className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">
                                                {draftCount} Draft Change{draftCount !== 1 ? 's' : ''} Pending
                                            </h3>
                                            <p className="text-xs text-text-muted">
                                                Publish to make them live for patients and bump the chatbot version
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {publishMsg && (
                                            <p className={`text-sm font-medium animate-fade-in ${publishMsg.startsWith('✅') ? 'text-success' : 'text-error'}`}>
                                                {publishMsg}
                                            </p>
                                        )}
                                        <button
                                            onClick={handlePublishDrafts}
                                            disabled={publishingDrafts}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,158,11,0.3)] transition-all duration-300 disabled:opacity-50"
                                        >
                                            {publishingDrafts ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                            Publish All Drafts
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ API Key ═══ */}
                        <div className="glass rounded-2xl p-4 md:p-6 border border-accent/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-accent-faded flex items-center justify-center">
                                    <Key className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">OpenAI API Key</h3>
                                    <p className="text-xs text-text-muted">
                                        {apiKeyMasked ? `Current: ${apiKeyMasked}` : 'Not configured — using environment variable fallback'}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-text-muted font-semibold mb-1.5 block">API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={e => { setApiKey(e.target.value); setKeyMsg(''); }}
                                            placeholder="sk-proj-..."
                                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all font-mono"
                                        />
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveApiKey}
                                        disabled={savingKey || !apiKey.trim()}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50"
                                    >
                                        {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save API Key
                                    </button>
                                    {keyMsg && (
                                        <p className={`text-sm font-medium ${keyMsg.startsWith('Error') ? 'text-error' : 'text-success'}`}>{keyMsg}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ═══ Model Configuration ═══ */}
                        <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <BrainCircuit className="w-5 h-5 text-purple" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">Model Configuration</h3>
                                    <p className="text-xs text-text-muted">Choose the AI model and tune response creativity</p>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs text-text-muted font-semibold mb-1.5 block">Model</label>
                                    <select
                                        value={modelName}
                                        onChange={e => { setModelName(e.target.value); setModelMsg(''); }}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="gpt-4o-mini">GPT-4o Mini — Fast & affordable</option>
                                        <option value="gpt-4o">GPT-4o — Most capable</option>
                                        <option value="gpt-4.1">GPT-4.1 — Latest generation</option>
                                        <option value="gpt-4.1-mini">GPT-4.1 Mini — Fast latest gen</option>
                                        <option value="gpt-4.1-nano">GPT-4.1 Nano — Ultra-fast</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs text-text-muted font-semibold">Temperature</label>
                                        <span className="text-xs font-mono text-accent font-bold">{temperature.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={temperature}
                                        onChange={e => { setTemperature(parseFloat(e.target.value)); setModelMsg(''); }}
                                        className="w-full h-2 bg-bg-elevated rounded-lg cursor-pointer accent-accent"
                                    />
                                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                                        <span>Precise (0.0)</span>
                                        <span>Balanced (0.5)</span>
                                        <span>Creative (1.0)</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveModelConfig}
                                        disabled={savingModel}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(155,114,207,0.4)] transition-all disabled:opacity-50"
                                    >
                                        {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Model Config
                                    </button>
                                    {modelMsg && (
                                        <p className={`text-sm font-medium ${modelMsg.startsWith('Error') ? 'text-error' : 'text-success'}`}>{modelMsg}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ══════════════ TAB: Sandbox ══════════════ */}
                {activeTab === 'sandbox' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex items-center gap-2 mb-1">
                            <FlaskConical className="w-4 h-4 text-purple" />
                            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Testing Sandbox</h2>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-border">No data stored</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left: Configuration Panel */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Sequence Selection */}
                                <div className="glass rounded-2xl p-5 border border-border">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                            <GitBranchPlus className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">Sequence Protocol</h3>
                                            <p className="text-xs text-text-muted">Choose the interview flow to test</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {sequences.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {sequences.map(seq => (
                                                    <button
                                                        key={seq.id}
                                                        onClick={() => setSelectedSequenceId(seq.id)}
                                                        className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${seq.id === selectedSequenceId
                                                            ? 'border-accent/50 bg-accent-faded/60 shadow-[0_0_16px_rgba(45,212,191,0.08)]'
                                                            : 'border-border bg-bg-elevated hover:bg-bg-tertiary hover:border-border'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${seq.id === selectedSequenceId ? 'bg-accent' : 'bg-text-muted/30'}`} />
                                                            <span className={`text-sm font-medium ${seq.id === selectedSequenceId ? 'text-accent' : 'text-text-primary'}`}>
                                                                {seq.name}
                                                            </span>
                                                        </div>
                                                        {seq.is_default && (
                                                            <span className="ml-4 text-[10px] text-amber-400 font-semibold">⭐ Default</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 border border-dashed border-border rounded-xl">
                                                <p className="text-xs text-text-muted">No sequences configured. Create one in Interview Flow first.</p>
                                                <button
                                                    onClick={() => setActiveTab('sequences')}
                                                    className="mt-2 text-xs text-accent font-semibold hover:underline"
                                                >
                                                    Go to Interview Flow →
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sequence preview */}
                                    {selectedSequenceId && sequenceNodes.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-border/50">
                                            <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">Flow Steps ({sequenceNodes.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {linearNodes.map(node => (
                                                    <div
                                                        key={node.id}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-elevated border border-border text-[11px]"
                                                        title={node.ai_prompts ? `Prompt: ${node.ai_prompts.name} v${node.ai_prompts.version}` : 'No prompt linked'}
                                                    >
                                                        <span>{node.emoji}</span>
                                                        <span className="text-text-primary font-medium">{node.label}</span>
                                                        {node.ai_prompts && (
                                                            <span className="text-purple text-[9px] ml-0.5">v{node.ai_prompts.version}</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {branchNodes.length > 0 && (
                                                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-faded/30 border border-purple/20 text-[11px] text-purple">
                                                        +{branchNodes.length} branch nodes
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {loadingSequence && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Loading sequence…
                                        </div>
                                    )}
                                </div>

                                {/* Prompt Override */}
                                <div className="glass rounded-2xl p-5 border border-border">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                            <FileCode className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">Prompt Override</h3>
                                            <p className="text-xs text-text-muted">Optionally force a specific prompt for all sections</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Auto option */}
                                        <button
                                            onClick={() => setSelectedPromptOverride('')}
                                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${!selectedPromptOverride
                                                ? 'border-accent/50 bg-accent-faded/60'
                                                : 'border-border bg-bg-elevated hover:bg-bg-tertiary'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Settings2 className={`w-4 h-4 ${!selectedPromptOverride ? 'text-accent' : 'text-text-muted'}`} />
                                                <span className={`text-sm font-medium ${!selectedPromptOverride ? 'text-accent' : 'text-text-primary'}`}>
                                                    Auto — use per-section prompts from sequence
                                                </span>
                                            </div>
                                            <p className="ml-6 text-[11px] text-text-muted mt-0.5">Each section uses its own linked prompt and version</p>
                                        </button>

                                        {/* Prompt list grouped by type */}
                                        {Object.entries(promptsByType).map(([type, items]) => (
                                            <div key={type}>
                                                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold px-1 mt-3 mb-1">{type}</p>
                                                {items.filter(p => p.is_active).map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setSelectedPromptOverride(p.id)}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all mb-1 ${selectedPromptOverride === p.id
                                                            ? 'border-accent/50 bg-accent-faded/60'
                                                            : 'border-border bg-bg-elevated hover:bg-bg-tertiary'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${selectedPromptOverride === p.id ? 'bg-accent' : 'bg-text-muted/30'}`} />
                                                            <span className={`text-sm font-medium ${selectedPromptOverride === p.id ? 'text-accent' : 'text-text-primary'}`}>
                                                                {p.name}
                                                            </span>
                                                            <span className="text-purple text-[10px] font-bold">v{p.version}</span>
                                                            <span className="text-text-muted text-[10px] capitalize">{p.specialty?.replace('_', ' ')}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Launch Panel */}
                            <div className="space-y-5">
                                <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20 text-center sticky top-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4 border border-purple/20">
                                        <MessageSquare className="w-8 h-8 text-purple" />
                                    </div>
                                    <h3 className="text-lg font-bold text-text-primary mb-2">Launch Chat Bot</h3>
                                    <p className="text-xs text-text-muted mb-5 leading-relaxed">
                                        Start a simulated medical intake interview with your selected configuration
                                    </p>

                                    {/* Config summary */}
                                    <div className="text-left space-y-2 mb-5 p-3 rounded-xl bg-bg-elevated border border-border">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-text-muted">Sequence:</span>
                                            <span className="text-accent font-semibold">{selectedSequence?.name || 'None selected'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-text-muted">Sections:</span>
                                            <span className="text-text-primary font-medium">{sequenceNodes.length} steps</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-text-muted">Prompt:</span>
                                            <span className={`font-semibold ${selectedPromptOverride ? 'text-warning' : 'text-success'}`}>
                                                {selectedPromptOverride
                                                    ? `Override: ${prompts.find(p => p.id === selectedPromptOverride)?.name || 'Selected'}`
                                                    : 'Auto (per-section)'
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setShowChatbot(true)}
                                            disabled={!selectedSequenceId && sequences.length > 0}
                                            className="inline-flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(155,114,207,0.4)] transition-all duration-300 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                        >
                                            <Play className="w-5 h-5" />
                                            Launch Chat Bot
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated text-[10px] text-text-muted border border-border">
                                            <Shield className="w-3 h-3 text-success" />
                                            No data stored
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated text-[10px] text-text-muted border border-border">
                                            <Bot className="w-3 h-3 text-accent" />
                                            Test mode
                                        </div>
                                    </div>
                                </div>

                                {/* Linked prompts breakdown */}
                                {sequenceNodes.length > 0 && (
                                    <div className="glass rounded-2xl p-5 border border-border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info className="w-4 h-4 text-text-muted" />
                                            <h4 className="text-xs font-bold text-text-primary">Prompt Assignments</h4>
                                        </div>
                                        <div className="space-y-1.5">
                                            {sequenceNodes.filter(n => !n.pathway_condition).map(node => (
                                                <div key={node.id} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg hover:bg-bg-elevated transition-colors">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{node.emoji}</span>
                                                        <span className="text-text-primary">{node.label}</span>
                                                    </div>
                                                    {node.ai_prompts ? (
                                                        <span className="text-purple font-medium">{node.ai_prompts.name} <span className="text-[9px]">v{node.ai_prompts.version}</span></span>
                                                    ) : (
                                                        <span className="text-warning">⚠ None</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* ══════════════ TAB: AI Prompts ══════════════ */}
                {activeTab === 'prompts' && (
                    <div className="animate-fade-in">
                        {/* Delete error banner */}
                        {deleteError && (
                            <div className="mb-4 px-4 py-3 rounded-xl bg-error-faded border border-error/30 text-error text-sm flex items-center gap-2">
                                ⚠️ {deleteError}
                                <button onClick={() => setDeleteError('')} className="ml-auto text-error/60 hover:text-error">✕</button>
                            </div>
                        )}
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <DataTable
                                title="All Prompts"
                                subtitle={`${totalCount} AI prompts configured`}
                                columns={columns}
                                data={prompts}
                                totalCount={totalCount}
                                searchPlaceholder="Search by name, specialty, or type..."
                                rowKey={(row) => row.id}
                                actions={
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleCreate}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> New Prompt
                                        </button>
                                    </div>
                                }
                            />
                        )}

                        {/* ═══ Safety & Protocols ═══ */}
                        <div className="mt-6 bg-bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                            <div className="p-6 border-b border-border bg-gradient-to-r from-orange-500/5 to-red-500/5">
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-orange-400" />
                                    Safety & Protocol Configuration
                                </h2>
                                <p className="text-sm text-text-secondary mt-1">
                                    Manage emergency detection keywords, non-cooperation patterns, and escalation thresholds.
                                </p>
                            </div>
                            <div className="p-6 space-y-8">
                                {/* Protocol A: Emergency Keywords EN */}
                                <div>
                                    <label className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
                                        🚨 Emergency Keywords (English)
                                    </label>
                                    <p className="text-xs text-text-muted mb-3">Messages containing these keywords trigger the emergency protocol.</p>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {protoEmergencyEn.map((kw, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                                                {kw}
                                                <button onClick={() => removeKeyword(protoEmergencyEn, setProtoEmergencyEn, i)} className="ml-1 hover:text-red-300 text-red-500/60">×</button>
                                            </span>
                                        ))}
                                        {protoEmergencyEn.length === 0 && <span className="text-xs text-text-muted italic">No keywords configured — using defaults</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text" value={newKeyword}
                                            onChange={e => setNewKeyword(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (addKeyword(protoEmergencyEn, setProtoEmergencyEn, newKeyword), e.preventDefault())}
                                            placeholder="Add emergency keyword..."
                                            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-red-400"
                                        />
                                        <button onClick={() => addKeyword(protoEmergencyEn, setProtoEmergencyEn, newKeyword)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">+ Add</button>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Protocol A: Emergency Keywords AR */}
                                <div>
                                    <label className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
                                        🚨 Emergency Keywords (Arabic)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {protoEmergencyAr.map((kw, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20" dir="rtl">
                                                {kw}
                                                <button onClick={() => removeKeyword(protoEmergencyAr, setProtoEmergencyAr, i)} className="ml-1 hover:text-red-300 text-red-500/60">×</button>
                                            </span>
                                        ))}
                                        {protoEmergencyAr.length === 0 && <span className="text-xs text-text-muted italic">No keywords configured — using defaults</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text" value={newKeywordAr}
                                            onChange={e => setNewKeywordAr(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (addKeyword(protoEmergencyAr, setProtoEmergencyAr, newKeywordAr), e.preventDefault())}
                                            placeholder="إضافة كلمة طوارئ..." dir="rtl"
                                            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-red-400"
                                        />
                                        <button onClick={() => addKeyword(protoEmergencyAr, setProtoEmergencyAr, newKeywordAr)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">+ Add</button>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Escalation Thresholds */}
                                <div>
                                    <label className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
                                        📊 Escalation Thresholds
                                    </label>
                                    <p className="text-xs text-text-muted mb-4">Number of strikes needed to trigger each escalation level.</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-bg-elevated rounded-xl p-4 border border-amber-500/20">
                                            <label className="text-xs text-amber-400 font-semibold block mb-2">⚠️ Warning</label>
                                            <input type="number" min="1" max="20"
                                                value={protoThresholds.warning}
                                                onChange={e => setProtoThresholds({ ...protoThresholds, warning: parseInt(e.target.value) || 3 })}
                                                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary text-center font-mono focus:outline-none focus:border-amber-400"
                                            />
                                            <p className="text-[10px] text-text-muted mt-1 text-center">strikes to show banner</p>
                                        </div>
                                        <div className="bg-bg-elevated rounded-xl p-4 border border-orange-500/20">
                                            <label className="text-xs text-orange-400 font-semibold block mb-2">🟠 Cooldown</label>
                                            <input type="number" min="1" max="20"
                                                value={protoThresholds.cooldown}
                                                onChange={e => setProtoThresholds({ ...protoThresholds, cooldown: parseInt(e.target.value) || 5 })}
                                                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary text-center font-mono focus:outline-none focus:border-orange-400"
                                            />
                                            <p className="text-[10px] text-text-muted mt-1 text-center">strikes to pause chat</p>
                                        </div>
                                        <div className="bg-bg-elevated rounded-xl p-4 border border-red-500/20">
                                            <label className="text-xs text-red-400 font-semibold block mb-2">🔴 Terminate</label>
                                            <input type="number" min="1" max="20"
                                                value={protoThresholds.terminated}
                                                onChange={e => setProtoThresholds({ ...protoThresholds, terminated: parseInt(e.target.value) || 7 })}
                                                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary text-center font-mono focus:outline-none focus:border-red-400"
                                            />
                                            <p className="text-[10px] text-text-muted mt-1 text-center">strikes to end session</p>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Cooldown Duration */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-text-primary flex items-center gap-2">
                                            ⏱ Cooldown Duration
                                        </label>
                                        <span className="text-sm font-mono text-orange-400 font-bold">{protoCooldown}s</span>
                                    </div>
                                    <input type="range" min="10" max="120" step="5"
                                        value={protoCooldown}
                                        onChange={e => setProtoCooldown(parseInt(e.target.value))}
                                        className="w-full h-2 bg-bg-elevated rounded-lg cursor-pointer accent-orange-400"
                                    />
                                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                                        <span>10s (short)</span>
                                        <span>60s (moderate)</span>
                                        <span>120s (long)</span>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Save Button */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveProtocol}
                                        disabled={savingProto}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50"
                                    >
                                        {savingProto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Protocol Settings
                                    </button>
                                    {protoMsg && (
                                        <p className={`text-sm font-medium ${protoMsg.startsWith('Error') ? 'text-error' : 'text-success'}`}>{protoMsg}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════ TAB: Interview Flow ══════════════ */}
                {activeTab === 'sequences' && (
                    <div className="animate-fade-in">
                        <SequenceBuilderContent />
                    </div>
                )}

                {/* ══════════════ TAB: Translation ══════════════ */}
                {activeTab === 'translation' && (
                    <div className="animate-fade-in space-y-6 max-w-3xl">

                        {/* ── Master Toggle ───────────── */}
                        <div className={`glass rounded-2xl p-5 border-2 transition-all duration-500 ${translationEnabled
                            ? 'border-success/30 shadow-[0_0_32px_rgba(34,197,94,0.06)]'
                            : 'border-warning/20'
                            }`}>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${translationEnabled
                                        ? 'bg-success/20 shadow-[0_0_16px_rgba(34,197,94,0.2)]'
                                        : 'bg-warning/15'
                                        }`}>
                                        <Languages className={`w-7 h-7 ${translationEnabled ? 'text-success' : 'text-warning'}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-text-primary">
                                            Arabic Translation is {translationEnabled ? 'Enabled' : 'Disabled'}
                                        </h2>
                                        <p className="text-sm text-text-muted">
                                            {translationEnabled
                                                ? 'Doctors can translate consultation responses to formal Arabic'
                                                : 'Enable to allow doctors to translate responses for Arabic-speaking patients'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTranslationEnabled(!translationEnabled)}
                                    className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${translationEnabled
                                        ? 'bg-bg-elevated border-2 border-warning/40 text-warning hover:bg-warning/10'
                                        : 'bg-gradient-to-r from-success to-emerald-400 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)]'
                                        }`}
                                >
                                    <Power className="w-4 h-4" />
                                    {translationEnabled ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </div>

                        {/* ── System Prompt ───────────── */}
                        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-accent-faded rounded-xl flex items-center justify-center">
                                    <BrainCircuit className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">Translation System Prompt</h3>
                                    <p className="text-xs text-text-muted">Controls the tone, formality, and rules for Arabic translations</p>
                                </div>
                            </div>
                            <textarea
                                value={translationPrompt || DEFAULT_TRANSLATION_PROMPT}
                                onChange={e => setTranslationPrompt(e.target.value)}
                                rows={10}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-none"
                                placeholder="Enter the system prompt for the translation AI..."
                            />
                            <p className="text-[10px] text-text-muted mt-2">
                                This prompt is sent as the system message when the doctor clicks &quot;Translate to Arabic&quot;. Field-specific context (e.g. treatment plan, patient education) is automatically appended.
                            </p>
                        </div>

                        {/* ── Model Override ───────────── */}
                        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-400" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
                                    <Cpu className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">Translation Model</h3>
                                    <p className="text-xs text-text-muted">Optionally use a different model for translations</p>
                                </div>
                            </div>
                            <select
                                value={translationModel}
                                onChange={e => setTranslationModel(e.target.value)}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Use Global Default ({modelName})</option>
                                <option value="gpt-4o-mini">GPT-4o Mini — Fast &amp; affordable</option>
                                <option value="gpt-4o">GPT-4o — Most capable</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo — High performance</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo — Legacy, cheapest</option>
                            </select>
                        </div>

                        {/* ── Save Button ───────────── */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveTranslation}
                                disabled={savingTranslation}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50"
                            >
                                {savingTranslation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Translation Settings
                            </button>
                            {translationMsg && (
                                <p className={`text-sm font-medium ${translationMsg.startsWith('Error') ? 'text-error' : 'text-success'}`}>{translationMsg}</p>
                            )}
                        </div>

                        {/* ── Live Test Panel ───────────── */}
                        <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-red-400" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                                    <Play className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">Live Test</h3>
                                    <p className="text-xs text-text-muted">Test the translation with the current prompt and model configuration</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-2 block">English Input</label>
                                    <textarea
                                        value={translationTestInput}
                                        onChange={e => setTranslationTestInput(e.target.value)}
                                        rows={5}
                                        placeholder="Type English medical text to translate..."
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-muted mb-2 block">Arabic Output</label>
                                    <div
                                        dir="rtl"
                                        className="w-full min-h-[130px] bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary whitespace-pre-wrap"
                                    >
                                        {translationTesting ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                                            </div>
                                        ) : translationTestOutput || (
                                            <span className="text-text-muted/50">Translation will appear here...</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleTestTranslation}
                                disabled={translationTesting || !translationTestInput.trim() || !apiKey}
                                className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(245,158,11,0.4)] transition-all disabled:opacity-40"
                            >
                                {translationTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Test Translation
                            </button>
                            {!apiKey && (
                                <p className="text-xs text-error mt-2">⚠️ API key not configured. Go to Settings tab to add one.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════ TAB: API Key ══════════════ */}
                {/* Old API Key tab — now merged into Settings tab above */}

                {/* ── Protocols Tab ─────────────────── */}
                {/* Old Protocols tab — now merged into Prompts & Safety tab above */}
            </div>

            {/* Prompt Editor Modal */}
            {modalOpen && (
                <PromptEditorModal
                    mode={modalMode}
                    initial={editingPrompt}
                    onClose={() => setModalOpen(false)}
                    onSaved={loadPrompts}
                />
            )}

            {/* Chatbot Test Window */}
            {showChatbot && (
                <ChatTestWindow
                    onClose={() => { setShowChatbot(false); setTestingPromptId(null); }}
                    prompts={prompts}
                    sequenceId={selectedSequenceId || undefined}
                    promptOverrideId={testingPromptId || selectedPromptOverride || undefined}
                />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
}
