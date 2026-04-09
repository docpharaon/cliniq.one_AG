import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import PromptEditorModal from '@/components/PromptEditorModal';
import ChatTestWindow, { buildProfiles, type AutoBotProfile } from '@/components/ChatTestWindow';
import SequenceBuilderContent from '@/components/SequenceBuilderContent';
import ChatReportsPanel from '@/components/ChatReportsPanel';
import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchAIPrompts, deletePrompt, savePlatformSetting, fetchPlatformSetting, fetchPromptSequences, fetchSequenceWithNodes, fetchDraftCount, doPublishDrafts, fetchRecentPromptActivity, fetchLocumCodeDoctors, doGenerateLocumCode, doAssignLocumCode, doRevokeLocumCode, doSearchDoctorsForLocum, fetchIntegrityStats } from '@/lib/actions';
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
    ShieldOff,
    Play,
    ChevronDown,
    ChevronUp,
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
    Users,
    Mic,
    Grid2X2,
    Layers,
    X,
    StopCircle,
    PlayCircle,
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
    sequence_type?: string;
    specialty?: string | null;
};

const SEQUENCE_TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    global_intake: { label: 'Global Intake', emoji: '🌐', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
    specialty: { label: 'Phase 2 · Core', emoji: '🩺', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    refill: { label: 'Phase 2 · Refill', emoji: '💊', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    followup: { label: 'Phase 2 · Follow-Up', emoji: '🔄', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
    global_wrapup: { label: 'Phase 3 · Wrap', emoji: '📋', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    legacy: { label: 'Legacy', emoji: '📦', color: 'text-text-muted', bg: 'bg-bg-elevated', border: 'border-border' },
};

type SequenceNode = {
    id: string;
    step_key: string;
    label: string;
    emoji: string;
    prompt_id: string | null;
    sort_order: number;
    pathway_condition: string | null;
    specialty_condition: string | null;
    node_type?: 'chat' | 'system_gate' | 'system_analysis' | 'system_integrity' | null;
    ai_prompts: { id: string; name: string; version: number; is_active: boolean } | null;
};

const typeMap: Record<string, { variant: 'success' | 'info' | 'warning' | 'neutral'; label: string }> = {
    system: { variant: 'info', label: 'System' },
    intake: { variant: 'success', label: 'Intake' },
    summary: { variant: 'warning', label: 'Summary' },
    triage: { variant: 'neutral', label: 'Triage' },
    global_guard: { variant: 'neutral', label: '🛡️ Guard' },
    locum_greeting: { variant: 'info', label: '🏥 Locum' },
};

type TabId = 'dashboard' | 'settings' | 'prompts' | 'sequences' | 'sandbox' | 'translation' | 'analytics';

export default function AIPage() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [prompts, setPrompts] = useState<PromptRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showChatbot, setShowChatbot] = useState(false);

    // Multi-tester state
    const [multiTestMode, setMultiTestMode] = useState(false);
    const [multiInstances, setMultiInstances] = useState<Array<{ id: string; profile: AutoBotProfile }>>([]);
    const multiIdCounter = useRef(0);

    function addMultiInstance() {
        if (multiInstances.length >= 4) return;
        const profiles = buildProfiles();
        // Pick a random patient profile (not adversarial)
        const patientProfiles = profiles.filter(p => p.category === 'patient');
        const profile = patientProfiles[Math.floor(Math.random() * patientProfiles.length)];
        multiIdCounter.current++;
        setMultiInstances(prev => [...prev, { id: `multi_${multiIdCounter.current}_${Date.now()}`, profile }]);
    }

    function removeMultiInstance(id: string) {
        setMultiInstances(prev => prev.filter(i => i.id !== id));
    }

    function clearAllMultiInstances() {
        setMultiInstances([]);
    }

    function spawnMultiBatch(count: number) {
        const profiles = buildProfiles();
        const patientProfiles = profiles.filter(p => p.category === 'patient');
        const newInstances: Array<{ id: string; profile: AutoBotProfile }> = [];
        for (let i = 0; i < count && (multiInstances.length + newInstances.length) < 4; i++) {
            const profile = patientProfiles[Math.floor(Math.random() * patientProfiles.length)];
            multiIdCounter.current++;
            newInstances.push({ id: `multi_${multiIdCounter.current}_${Date.now()}`, profile });
        }
        setMultiInstances(prev => [...prev, ...newInstances]);
    }

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

    // Safety collapsible
    const [safetyCollapsed, setSafetyCollapsed] = useState(true);

    // Integrity analytics
    type IntegrityStats = { avgConfidence: number; avgFluidity: number; avgCompletion: number; totalRedFlags: number; totalReports: number };
    const [integrityStats, setIntegrityStats] = useState<IntegrityStats | null>(null);
    const [integrityLoading, setIntegrityLoading] = useState(false);

    // Locum codes management
    type LocumDoc = { id: string; display_name: string; full_name: string; specialty: string; locum_code: string; doctor_type: string; status: string; created_at: string };
    type SearchDoc = { id: string; display_name: string; full_name: string; specialty: string; doctor_type: string; locum_code: string | null };
    const [locumDoctors, setLocumDoctors] = useState<LocumDoc[]>([]);
    const [locumLoading, setLocumLoading] = useState(false);
    const [locumSearch, setLocumSearch] = useState('');
    const [locumSearchResults, setLocumSearchResults] = useState<SearchDoc[]>([]);
    const [locumSearching, setLocumSearching] = useState(false);
    const [locumMsg, setLocumMsg] = useState('');

    // Voice config state
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [voiceModel, setVoiceModel] = useState('gpt-4o-mini-transcribe');
    const [voiceDefaultMode, setVoiceDefaultMode] = useState('push_to_talk');
    const [voiceMaxDuration, setVoiceMaxDuration] = useState(60);
    const [voiceSilenceThreshold, setVoiceSilenceThreshold] = useState(1500);
    const [voiceAutoSendDelay, setVoiceAutoSendDelay] = useState(2500);
    const [voiceUsageMinutes, setVoiceUsageMinutes] = useState('0');
    const [voiceUsageCount, setVoiceUsageCount] = useState('0');
    const [voiceEstimatedCost, setVoiceEstimatedCost] = useState('$0.000');
    const [savingVoice, setSavingVoice] = useState(false);
    const [voiceMsg, setVoiceMsg] = useState('');

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

    // Load integrity stats when analytics tab is selected
    useEffect(() => {
        if (activeTab === 'analytics' && !integrityStats && !integrityLoading) {
            setIntegrityLoading(true);
            fetchIntegrityStats()
                .then(({ stats }) => setIntegrityStats(stats))
                .catch(() => {})
                .finally(() => setIntegrityLoading(false));
        }
    }, [activeTab, integrityStats, integrityLoading]);

    // Load locum codes on mount
    useEffect(() => {
        fetchLocumCodeDoctors().then(docs => setLocumDoctors(docs as LocumDoc[]));
    }, []);
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
        // Voice settings
        fetchPlatformSetting('voice_input_enabled').then(val => {
            setVoiceEnabled(val === 'true');
        });
        fetchPlatformSetting('voice_input_default_mode').then(val => {
            if (val) setVoiceDefaultMode(val);
        });
        fetchPlatformSetting('voice_input_max_duration_sec').then(val => {
            if (val) setVoiceMaxDuration(parseInt(val, 10));
        });
        fetchPlatformSetting('voice_input_silence_threshold_ms').then(val => {
            if (val) setVoiceSilenceThreshold(parseInt(val, 10));
        });
        fetchPlatformSetting('voice_auto_send_delay_ms').then(val => {
            if (val) setVoiceAutoSendDelay(parseInt(val, 10));
        });
        fetchPlatformSetting('voice_transcription_model').then(val => {
            if (val) setVoiceModel(val);
        });
        // Usage tracking
        fetchPlatformSetting('voice_usage_minutes_month').then(val => {
            if (val) {
                setVoiceUsageMinutes(parseFloat(val).toFixed(1));
                // Cost estimate: $0.006/min for gpt-4o-mini-transcribe
                setVoiceEstimatedCost(`$${(parseFloat(val) * 0.006).toFixed(3)}`);
            }
        });
        fetchPlatformSetting('voice_usage_count_month').then(val => {
            if (val) setVoiceUsageCount(val);
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
        { id: 'prompts', label: 'Prompts', icon: FileCode },
        { id: 'sequences', label: 'Interview Flow', icon: GitBranchPlus },
        { id: 'sandbox', label: 'Sandbox', icon: FlaskConical },
        { id: 'translation', label: 'Translation', icon: Languages },
        { id: 'analytics', label: 'Analytics', icon: BrainCircuit },
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

                        {/* ── Global Intake Pipeline ───────── */}
                        <div className="glass rounded-2xl p-5 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-accent" />
                                <h3 className="text-sm font-bold text-text-primary">Global Intake</h3>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {/* Phase 1: Intro */}
                                <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center min-w-[130px]">
                                    <p className="text-lg mb-1">👋</p>
                                    <p className="text-xs font-bold text-teal-400">Phase 1 · Intro</p>
                                    <p className="text-[10px] text-text-muted mt-0.5">{sequences.filter(s => s.sequence_type === 'global_intake').length > 0 ? '✓ Configured' : '✗ Missing'}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                                {/* Phase 2: Core */}
                                <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center min-w-[160px]">
                                    <p className="text-lg mb-1">🩺</p>
                                    <p className="text-xs font-bold text-blue-400">Phase 2 · Core</p>
                                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${sequences.some(s => s.sequence_type === 'specialty') ? 'bg-blue-500/15 text-blue-400' : 'bg-bg-tertiary text-text-muted'}`}>🩺 Specialty</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${sequences.some(s => s.sequence_type === 'refill') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-bg-tertiary text-text-muted'}`}>💊 Refill</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${sequences.some(s => s.sequence_type === 'followup') ? 'bg-violet-500/15 text-violet-400' : 'bg-bg-tertiary text-text-muted'}`}>🔄 Follow-Up</span>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                                {/* Phase 3: Wrap */}
                                <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[130px]">
                                    <p className="text-lg mb-1">📋</p>
                                    <p className="text-xs font-bold text-amber-400">Phase 3 · Wrap</p>
                                    <p className="text-[10px] text-text-muted mt-0.5">{sequences.filter(s => s.sequence_type === 'global_wrapup').length > 0 ? '✓ Configured' : '✗ Missing'}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
                                The <span className="text-teal-400 font-semibold">Global Intake</span> guides every patient through
                                <span className="text-teal-400 font-semibold"> Intro</span> →
                                <span className="text-blue-400 font-semibold"> Core</span> →
                                <span className="text-amber-400 font-semibold"> Wrap</span>.
                            </p>
                        </div>

                        {/* ── Health Alerts ───────── */}
                        <div className="space-y-3">
                            {/* Specialty Alert */}
                            <a
                                href="/dashboard/specialties"
                                className="flex items-center gap-3 glass rounded-2xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-all group cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <ShieldOff className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-text-primary">Specialty Management</h3>
                                    <p className="text-xs text-text-muted">View and manage specialty availability, disablements & incidents</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>

                            {/* Locum Codes Alert */}
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="w-full flex items-center gap-3 glass rounded-2xl p-4 border border-purple/20 hover:border-purple/40 transition-all group text-left"
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-faded flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Users className="w-5 h-5 text-purple" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-text-primary">Locum Doctor Codes {locumDoctors.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-faded text-purple font-semibold ml-1">{locumDoctors.length}</span>}</h3>
                                    <p className="text-xs text-text-muted">Manage locum access codes for patient-direct routing</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                <h3 className="text-sm font-bold text-text-primary mb-1">Prompts</h3>
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
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className="group glass rounded-2xl p-5 text-left border border-border hover:border-amber-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(251,191,36,0.15)]"
                            >
                                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <BrainCircuit className="w-5 h-5 text-amber-400" />
                                </div>
                                <h3 className="text-sm font-bold text-text-primary mb-1">Flow Analytics</h3>
                                <p className="text-xs text-text-muted leading-relaxed">Integrity scores, fluidity metrics, red flags</p>
                                <div className="flex items-center gap-1 mt-3 text-xs text-amber-400 font-semibold">
                                    View Analytics <ArrowRight className="w-3 h-3" />
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

                        {/* ═══ Locum Codes ═══ */}
                        <div className="glass rounded-2xl p-4 md:p-6 border border-purple/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-purple-faded flex items-center justify-center">
                                    <Users className="w-5 h-5 text-purple" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-text-primary">Locum Doctor Codes</h3>
                                    <p className="text-xs text-text-muted">Codes that allow patients to be routed directly to a specific doctor&apos;s specialty pathway</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setLocumLoading(true);
                                        const docs = await fetchLocumCodeDoctors();
                                        setLocumDoctors(docs as LocumDoc[]);
                                        setLocumLoading(false);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors"
                                >
                                    <Loader2 className={`w-3 h-3 ${locumLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>

                            {locumMsg && (
                                <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium animate-fade-in ${
                                    locumMsg.startsWith('✅') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                }`}>{locumMsg}</div>
                            )}

                            {/* Active Locum Codes Table */}
                            {locumDoctors.length > 0 ? (
                                <div className="space-y-2 mb-6">
                                    {locumDoctors.map(doc => (
                                        <div key={doc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-elevated border border-border">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-text-primary truncate">{doc.display_name || doc.full_name}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                                        doc.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning'
                                                    }`}>{doc.status}</span>
                                                </div>
                                                <p className="text-[10px] text-text-muted">{doc.specialty?.replace('_', ' ')} · {doc.doctor_type}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="px-3 py-1.5 rounded-lg bg-purple-faded text-purple text-sm font-bold font-mono tracking-wider">
                                                    {doc.locum_code}
                                                </code>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Revoke code "${doc.locum_code}" from ${doc.display_name || doc.full_name}? Patients will no longer be able to use this code.`)) return;
                                                        const res = await doRevokeLocumCode(doc.id);
                                                        if (res.error) { setLocumMsg(`Error: ${res.error}`); }
                                                        else { setLocumMsg(`✅ Code revoked from ${doc.display_name || doc.full_name}`); }
                                                        const docs = await fetchLocumCodeDoctors();
                                                        setLocumDoctors(docs as LocumDoc[]);
                                                        setTimeout(() => setLocumMsg(''), 4000);
                                                    }}
                                                    className="p-1.5 rounded-lg text-error/60 hover:text-error hover:bg-error/10 transition-colors"
                                                    title="Revoke code"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-border rounded-xl mb-6">
                                    <Users className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                                    <p className="text-xs text-text-muted">No locum codes assigned yet</p>
                                    <p className="text-[10px] text-text-muted/60 mt-1">Search for a doctor below to assign a code</p>
                                </div>
                            )}

                            {/* Assign New Code */}
                            <div className="border-t border-border pt-4">
                                <label className="text-xs text-text-muted font-semibold mb-2 block">Assign Code to Doctor</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={locumSearch}
                                            onChange={async (e) => {
                                                setLocumSearch(e.target.value);
                                                if (e.target.value.length >= 2) {
                                                    setLocumSearching(true);
                                                    const results = await doSearchDoctorsForLocum(e.target.value);
                                                    setLocumSearchResults(results as SearchDoc[]);
                                                    setLocumSearching(false);
                                                } else {
                                                    setLocumSearchResults([]);
                                                }
                                            }}
                                            placeholder="Search doctor by name..."
                                            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 transition-all"
                                        />
                                        {locumSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />}
                                    </div>
                                </div>

                                {/* Search Results Dropdown */}
                                {locumSearchResults.length > 0 && (
                                    <div className="mt-2 bg-bg-elevated rounded-xl border border-border overflow-hidden shadow-lg">
                                        {locumSearchResults.map(doc => (
                                            <button
                                                key={doc.id}
                                                disabled={!!doc.locum_code}
                                                onClick={async () => {
                                                    const code = await doGenerateLocumCode();
                                                    if (!confirm(`Assign locum code "${code}" to ${doc.display_name || doc.full_name}?`)) return;
                                                    const res = await doAssignLocumCode(doc.id, code);
                                                    if (res.error) { setLocumMsg(`Error: ${res.error}`); }
                                                    else { setLocumMsg(`✅ Code ${code} assigned to ${doc.display_name || doc.full_name}`); }
                                                    setLocumSearch('');
                                                    setLocumSearchResults([]);
                                                    const docs = await fetchLocumCodeDoctors();
                                                    setLocumDoctors(docs as LocumDoc[]);
                                                    setTimeout(() => setLocumMsg(''), 4000);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tertiary transition-colors border-b border-border last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-text-primary">{doc.display_name || doc.full_name}</span>
                                                    <span className="text-[10px] text-text-muted ml-2">{doc.specialty?.replace('_', ' ')} · {doc.doctor_type}</span>
                                                </div>
                                                {doc.locum_code ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-faded text-purple font-semibold">Has code: {doc.locum_code}</span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-faded text-accent font-semibold">+ Assign Code</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ═══ 🎤 VOICE INPUT ═══ */}
                        <div className="flex items-center gap-2 mb-1 mt-8">
                            <Mic className="w-4 h-4 text-accent" />
                            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Voice Input (Transcribe)</h2>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <div className="glass rounded-2xl p-4 md:p-6 space-y-5">
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-text-primary">Enable Voice Input</h3>
                                    <p className="text-xs text-text-muted mt-0.5">Patients can speak instead of typing during AI chat</p>
                                </div>
                                <button
                                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${voiceEnabled ? 'bg-accent' : 'bg-bg-elevated border border-border'}`}
                                >
                                    <div className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white transition-transform duration-300 shadow-sm ${voiceEnabled ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Default Mode */}
                            <div>
                                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Default Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setVoiceDefaultMode('push_to_talk')}
                                        className={`p-3 rounded-xl border text-left transition-all ${voiceDefaultMode === 'push_to_talk'
                                            ? 'border-accent bg-accent-faded'
                                            : 'border-border bg-bg-elevated hover:bg-bg-tertiary'
                                        }`}
                                    >
                                        <span className="text-sm font-semibold text-text-primary">👆 Push-to-Talk</span>
                                        <p className="text-[10px] text-text-muted mt-0.5">Patient taps to start/stop</p>
                                    </button>
                                    <button
                                        onClick={() => setVoiceDefaultMode('auto_mic')}
                                        className={`p-3 rounded-xl border text-left transition-all ${voiceDefaultMode === 'auto_mic'
                                            ? 'border-accent bg-accent-faded'
                                            : 'border-border bg-bg-elevated hover:bg-bg-tertiary'
                                        }`}
                                    >
                                        <span className="text-sm font-semibold text-text-primary">🔄 Auto-Listen</span>
                                        <p className="text-[10px] text-text-muted mt-0.5">Mic reopens after AI responds</p>
                                    </button>
                                </div>
                            </div>

                            {/* Parameters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary block mb-1">Model</label>
                                    <select
                                        value={voiceModel}
                                        onChange={e => setVoiceModel(e.target.value)}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                                    >
                                        <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
                                        <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
                                        <option value="whisper-1">whisper-1</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary block mb-1">Max Duration (sec)</label>
                                    <input
                                        type="number"
                                        value={voiceMaxDuration}
                                        onChange={e => setVoiceMaxDuration(parseInt(e.target.value, 10) || 60)}
                                        min={10}
                                        max={180}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary block mb-1">Silence Threshold (ms)</label>
                                    <input
                                        type="number"
                                        value={voiceSilenceThreshold}
                                        onChange={e => setVoiceSilenceThreshold(parseInt(e.target.value, 10) || 1500)}
                                        min={500}
                                        max={5000}
                                        step={100}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary block mb-1">Auto-Send Delay (ms)</label>
                                    <input
                                        type="number"
                                        value={voiceAutoSendDelay}
                                        onChange={e => setVoiceAutoSendDelay(parseInt(e.target.value, 10) || 0)}
                                        min={0}
                                        max={10000}
                                        step={500}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                                    />
                                    <p className="text-[10px] text-text-muted mt-1">Review time before voice auto-sends. 0 = instant.</p>
                                </div>
                            </div>

                            {/* Usage This Month */}
                            <div className="bg-bg-elevated rounded-xl p-3 border border-border">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Usage This Month</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-text-primary">{voiceUsageCount}</p>
                                        <p className="text-[10px] text-text-muted">Transcriptions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-text-primary">{voiceUsageMinutes}</p>
                                        <p className="text-[10px] text-text-muted">Minutes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-accent">{voiceEstimatedCost}</p>
                                        <p className="text-[10px] text-text-muted">Est. Cost</p>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={savingVoice}
                                    onClick={async () => {
                                        setSavingVoice(true);
                                        try {
                                            await savePlatformSetting('voice_input_enabled', voiceEnabled ? 'true' : 'false', 'voice', 'Enable voice input for patients');
                                            await savePlatformSetting('voice_input_default_mode', voiceDefaultMode, 'voice', 'Default voice mode: push_to_talk or auto_mic');
                                            await savePlatformSetting('voice_input_max_duration_sec', String(voiceMaxDuration), 'voice', 'Max recording duration in seconds');
                                            await savePlatformSetting('voice_input_silence_threshold_ms', String(voiceSilenceThreshold), 'voice', 'VAD silence threshold in milliseconds');
                                            await savePlatformSetting('voice_auto_send_delay_ms', String(voiceAutoSendDelay), 'voice', 'Delay in ms before voice transcription auto-sends');
                                            await savePlatformSetting('voice_transcription_model', voiceModel, 'voice', 'OpenAI transcription model');
                                            setVoiceMsg('✅ Voice settings saved!');
                                        } catch {
                                            setVoiceMsg('Error saving voice settings');
                                        }
                                        setSavingVoice(false);
                                        setTimeout(() => setVoiceMsg(''), 3000);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                                >
                                    {savingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Voice Settings
                                </button>
                                {voiceMsg && (
                                    <p className={`text-sm font-medium animate-fade-in ${voiceMsg.startsWith('✅') ? 'text-success' : 'text-error'}`}>{voiceMsg}</p>
                                )}
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

                            {/* Single / Multi toggle */}
                            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-elevated border border-border">
                                <button
                                    onClick={() => setMultiTestMode(false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                                        !multiTestMode
                                            ? 'bg-accent/20 text-accent shadow-sm'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    Single
                                </button>
                                <button
                                    onClick={() => setMultiTestMode(true)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                                        multiTestMode
                                            ? 'bg-purple/20 text-purple shadow-sm'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    <Grid2X2 className="w-3.5 h-3.5" />
                                    Multi-Test
                                    {multiInstances.length > 0 && (
                                        <span className="ml-0.5 px-1.5 py-0 rounded-full bg-purple/30 text-purple text-[9px] font-bold">{multiInstances.length}</span>
                                    )}
                                </button>
                            </div>

                            <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-border">No data stored</span>
                        </div>

                        {/* ── Multi-Test Mode ───────────────────── */}
                        {multiTestMode && (
                            <div className="space-y-4">
                                {/* Multi-test toolbar */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated/60 border border-purple/20">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={addMultiInstance}
                                            disabled={multiInstances.length >= 4 || !selectedSequenceId}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-all disabled:opacity-40 disabled:hover:translate-y-0"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" />
                                            + Add Tester
                                        </button>
                                        <button
                                            onClick={() => spawnMultiBatch(2)}
                                            disabled={multiInstances.length >= 3 || !selectedSequenceId}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-card border border-border text-xs font-semibold text-text-secondary hover:text-accent hover:border-accent/30 transition-all disabled:opacity-40"
                                        >
                                            <Grid2X2 className="w-3.5 h-3.5" />
                                            + Add 2
                                        </button>
                                        <button
                                            onClick={() => spawnMultiBatch(4)}
                                            disabled={multiInstances.length >= 1 || !selectedSequenceId}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-card border border-border text-xs font-semibold text-text-secondary hover:text-accent hover:border-accent/30 transition-all disabled:opacity-40"
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            + Add 4
                                        </button>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="flex items-center gap-2">
                                        {multiInstances.length > 0 && (
                                            <span className="text-[10px] text-text-muted">
                                                {multiInstances.length}/4 panels
                                            </span>
                                        )}
                                        {multiInstances.length > 0 && (
                                            <button
                                                onClick={clearAllMultiInstances}
                                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-error/10 border border-error/20 text-xs font-semibold text-error hover:bg-error/20 transition-all"
                                            >
                                                <StopCircle className="w-3.5 h-3.5" />
                                                Clear All
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {!selectedSequenceId && sequences.length > 0 && (
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-warning/10 border border-warning/20">
                                        <Info className="w-4 h-4 text-warning flex-shrink-0" />
                                        <p className="text-xs text-warning">Select a sequence in <button onClick={() => setMultiTestMode(false)} className="underline font-semibold">Single mode</button> first, then switch to Multi-Test.</p>
                                    </div>
                                )}

                                {/* Multi-test grid */}
                                {multiInstances.length > 0 ? (
                                    <div className={`grid gap-4 ${
                                        multiInstances.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                                        multiInstances.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                                        'grid-cols-1 lg:grid-cols-2'
                                    }`} style={{ minHeight: '70vh' }}>
                                        {multiInstances.map(instance => (
                                            <div key={instance.id} className="relative group" style={{ height: multiInstances.length <= 2 ? '80vh' : '70vh' }}>
                                                {/* Close button overlay */}
                                                <button
                                                    onClick={() => removeMultiInstance(instance.id)}
                                                    className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-error/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error shadow-lg"
                                                    title="Remove this tester"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                                {/* Profile badge */}
                                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white border border-white/10">
                                                    <span>{instance.profile.emoji}</span>
                                                    <span>{instance.profile.label}</span>
                                                </div>
                                                <ChatTestWindow
                                                    key={instance.id}
                                                    onClose={() => removeMultiInstance(instance.id)}
                                                    prompts={prompts}
                                                    sequenceId={selectedSequenceId || undefined}
                                                    promptOverrideId={selectedPromptOverride || undefined}
                                                    mode="inline"
                                                    autoStartProfile={instance.profile}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border-2 border-dashed border-border">
                                        <div className="w-16 h-16 rounded-2xl bg-purple/10 flex items-center justify-center">
                                            <Grid2X2 className="w-8 h-8 text-purple/50" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-sm font-bold text-text-primary mb-1">Multi-Test Mode</h3>
                                            <p className="text-xs text-text-muted max-w-xs">Add up to 4 concurrent AI testers to run side-by-side with random patient profiles for faster analysis.</p>
                                        </div>
                                        <button
                                            onClick={() => spawnMultiBatch(2)}
                                            disabled={!selectedSequenceId}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(168,85,247,0.3)] transition-all disabled:opacity-40"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            Launch 2 Testers
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Single-Test Mode (original sandbox) ─ */}
                        {!multiTestMode && (
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

                                    <div className="space-y-4">
                                        {sequences.length > 0 ? (
                                            <>
                                                {/* Global Intake — all sequences under one umbrella */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-teal-500/10 border-teal-500/30 text-teal-400">
                                                            🌐 Global Intake
                                                        </span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {/* Phase 1 · Intro */}
                                                        {sequences.filter(s => s.sequence_type === 'global_intake').map(seq => (
                                                            <button
                                                                key={seq.id}
                                                                onClick={() => setSelectedSequenceId(seq.id)}
                                                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${seq.id === selectedSequenceId
                                                                    ? 'border-teal-500/30 bg-teal-500/10 shadow-[0_0_16px_rgba(45,212,191,0.08)]'
                                                                    : 'border-border bg-bg-elevated hover:bg-bg-tertiary hover:border-border'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">👋</span>
                                                                    <span className={`text-sm font-medium ${seq.id === selectedSequenceId ? 'text-teal-400' : 'text-text-primary'}`}>Phase 1 · Intro</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                        {/* Phase 2 · Core (specialty + pathway flows) */}
                                                        {sequences.filter(s => ['specialty', 'refill', 'followup'].includes(s.sequence_type || '')).map(seq => {
                                                            const meta = SEQUENCE_TYPE_META[seq.sequence_type || 'specialty'];
                                                            return (
                                                                <button
                                                                    key={seq.id}
                                                                    onClick={() => setSelectedSequenceId(seq.id)}
                                                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${seq.id === selectedSequenceId
                                                                        ? `${meta.border} ${meta.bg} shadow-[0_0_16px_rgba(59,130,246,0.08)]`
                                                                        : 'border-border bg-bg-elevated hover:bg-bg-tertiary hover:border-border'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm">{meta.emoji}</span>
                                                                        <span className={`text-sm font-medium ${seq.id === selectedSequenceId ? meta.color : 'text-text-primary'}`}>{seq.name}</span>
                                                                        <span className="text-[9px] text-text-muted">Phase 2</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                        {/* Phase 3 · Wrap */}
                                                        {sequences.filter(s => s.sequence_type === 'global_wrapup').map(seq => (
                                                            <button
                                                                key={seq.id}
                                                                onClick={() => setSelectedSequenceId(seq.id)}
                                                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${seq.id === selectedSequenceId
                                                                    ? 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.08)]'
                                                                    : 'border-border bg-bg-elevated hover:bg-bg-tertiary hover:border-border'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">📋</span>
                                                                    <span className={`text-sm font-medium ${seq.id === selectedSequenceId ? 'text-amber-400' : 'text-text-primary'}`}>Phase 3 · Wrap</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Legacy sequences (if any) */}
                                                {sequences.filter(s => !s.sequence_type || s.sequence_type === 'legacy').length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-bg-elevated border-border text-text-muted">
                                                                📦 Legacy
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {sequences.filter(s => !s.sequence_type || s.sequence_type === 'legacy').map(seq => (
                                                                <button
                                                                    key={seq.id}
                                                                    onClick={() => setSelectedSequenceId(seq.id)}
                                                                    className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${seq.id === selectedSequenceId
                                                                        ? 'border-border bg-bg-elevated'
                                                                        : 'border-border bg-bg-elevated hover:bg-bg-tertiary'
                                                                        }`}
                                                                >
                                                                    <span className="text-sm font-medium text-text-muted">{seq.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
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
                                                {sequenceNodes.map(node => {
                                                    const isSystem = node.node_type === 'system_gate' || node.node_type === 'system_analysis';
                                                    return (
                                                    <div
                                                        key={node.id}
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${
                                                            isSystem
                                                                ? 'bg-amber-500/10 border-amber-500/30'
                                                                : 'bg-bg-elevated border-border'
                                                        }`}
                                                        title={isSystem ? `System: ${node.label} (auto-processed)` : node.ai_prompts ? `Prompt: ${node.ai_prompts.name} v${node.ai_prompts.version}` : 'No prompt linked'}
                                                    >
                                                        <span>{node.emoji}</span>
                                                        <span className={`font-medium ${isSystem ? 'text-amber-400' : 'text-text-primary'}`}>{node.label}</span>
                                                        {isSystem && (
                                                            <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">⚡ AUTO</span>
                                                        )}
                                                        {!isSystem && node.ai_prompts && (
                                                            <span className="text-purple text-[9px] ml-0.5">v{node.ai_prompts.version}</span>
                                                        )}
                                                    </div>
                                                    );
                                                })}
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
                        )}

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

                        {/* ═══ Safety & Protocols (Collapsible) ═══ */}
                        <div className="mt-6 bg-bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                            <button
                                onClick={() => setSafetyCollapsed(!safetyCollapsed)}
                                className="w-full p-6 border-b border-border bg-gradient-to-r from-orange-500/5 to-red-500/5 flex items-center justify-between hover:from-orange-500/10 hover:to-red-500/10 transition-all"
                            >
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-orange-400" />
                                        Safety & Protocol Configuration
                                    </h2>
                                    <p className="text-sm text-text-secondary mt-1 text-left">
                                        Manage emergency detection keywords, non-cooperation patterns, and escalation thresholds.
                                    </p>
                                </div>
                                {safetyCollapsed
                                    ? <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
                                    : <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0" />
                                }
                            </button>
                            {!safetyCollapsed && (
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
                            )}
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

                {/* ══════════════ TAB: Analytics ══════════════ */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* ── Header ── */}
                        <div className="glass rounded-2xl p-6 border border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple/20 to-accent/20 flex items-center justify-center">
                                    <BrainCircuit className="w-5 h-5 text-purple" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary">Chat Integrity Analytics</h2>
                                    <p className="text-sm text-text-secondary">
                                        AI-powered analysis of intake conversation quality, fluidity, and reliability
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-success" />
                                        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Confidence Score</span>
                                    </div>
                                    <p className="text-2xl font-bold text-success">{integrityStats ? `${integrityStats.avgConfidence}%` : '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">Doctor reliability metric</p>
                                </div>
                                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-accent" />
                                        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Fluidity Score</span>
                                    </div>
                                    <p className="text-2xl font-bold text-accent">{integrityStats ? `${integrityStats.avgFluidity}%` : '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">Conversation smoothness</p>
                                </div>
                                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-info" />
                                        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Completion Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold text-info">{integrityStats ? `${integrityStats.avgCompletion}%` : '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">Information gathered</p>
                                </div>
                                <div className="bg-bg-tertiary rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="w-4 h-4 text-warning" />
                                        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Red Flags</span>
                                    </div>
                                    <p className="text-2xl font-bold text-warning">{integrityStats ? integrityStats.totalRedFlags : '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">{integrityStats ? `From ${integrityStats.totalReports} sessions` : 'Issues detected'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── How It Works ── */}
                        <div className="glass rounded-2xl p-6 border border-border">
                            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                <Info className="w-4 h-4 text-info" />
                                How Chat Integrity Analysis Works
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-bg-tertiary rounded-xl p-4">
                                    <div className="text-lg mb-2">🔇</div>
                                    <h4 className="text-sm font-semibold text-text-primary mb-1">Silent Analysis</h4>
                                    <p className="text-xs text-text-secondary">
                                        Runs automatically after Patient Addendum — completely invisible to the patient. No extra questions asked.
                                    </p>
                                </div>
                                <div className="bg-bg-tertiary rounded-xl p-4">
                                    <div className="text-lg mb-2">📊</div>
                                    <h4 className="text-sm font-semibold text-text-primary mb-1">Structured Report</h4>
                                    <p className="text-xs text-text-secondary">
                                        Analyzes conversation transcript, section timings, gibberish strikes, and interruptions to generate a structured JSONB report.
                                    </p>
                                </div>
                                <div className="bg-bg-tertiary rounded-xl p-4">
                                    <div className="text-lg mb-2">👨‍⚕️</div>
                                    <h4 className="text-sm font-semibold text-text-primary mb-1">Doctor Confidence</h4>
                                    <p className="text-xs text-text-secondary">
                                        Provides doctors a 0-100 confidence score so they can gauge intake reliability before writing their medical report.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Report Schema ── */}
                        <div className="glass rounded-2xl p-6 border border-border">
                            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-accent" />
                                Integrity Report Schema
                            </h3>
                            <div className="bg-bg-tertiary rounded-xl p-4 font-mono text-xs text-text-secondary overflow-x-auto">
                                <pre>{`{
  "confidence_score": 0-100,     // Doctor reliability metric
  "fluidity_score": 0-100,       // Conversation smoothness
  "completion_rate": 0-100,      // % of expected info gathered
  "red_flags": [...],            // Concerning patterns
  "section_quality": {           // Per-section breakdown
    "greeting": { "score": 85, "note": "..." },
    "hpi": { "score": 72, "note": "..." }
  },
  "patient_engagement": "low|medium|high",
  "response_consistency": "low|medium|high",
  "estimated_reliability": "unreliable|low|moderate|high|very_high",
  "summary": "Brief overall assessment",
  "interruption_count": 0,
  "avg_response_time_category": "fast|normal|slow|very_slow"
}`}</pre>
                            </div>
                            <p className="text-xs text-text-muted mt-3">
                                💡 This report is stored in <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent">consultations.integrity_report</code> as JSONB.
                                Data will populate here once live intake sessions generate integrity reports.
                            </p>
                        </div>

                        {/* ── Node Configuration Status ── */}
                        <div className="glass rounded-2xl p-6 border border-border">
                            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-warning" />
                                System Integrity Node Status
                            </h3>
                            {(() => {
                                const integrityNode = sequenceNodes.find(
                                    (n: any) => n.node_type === 'system_integrity'
                                );
                                return integrityNode ? (
                                    <div className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-xl p-4">
                                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">
                                                {integrityNode.emoji} {integrityNode.label}
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                Active in the current sequence • Node type: <code className="bg-bg-tertiary px-1 rounded">system_integrity</code> • Runs silently after Patient Addendum
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-warning/5 border border-warning/20 rounded-xl p-4">
                                        <XCircle className="w-5 h-5 text-warning flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">
                                                No system_integrity node found
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                Add a node with type <code className="bg-bg-tertiary px-1 rounded">system_integrity</code> to your active sequence (after Patient Addendum) to enable integrity analysis.
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

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
