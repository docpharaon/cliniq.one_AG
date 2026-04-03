import { useEffect, useState, useCallback } from 'react';
import {
    fetchPromptSequences,
    fetchSequenceWithNodes,
    addPromptSequence,
    editPromptSequence,
    removePromptSequence,
    addSequenceNode,
    editSequenceNode,
    removeSequenceNode,
    reorderNodes,
    fetchAIPrompts,
    fetchPromptVersions,
    rollbackToVersion,
    updatePrompt,
    cloneSequence,
    fetchPlatformSetting,
} from '@/lib/actions';
import {
    Plus, Trash2, Save, Star, ChevronUp, ChevronDown,
    Loader2, GitBranchPlus, AlertTriangle, Edit3, X, Link2,
    History, RotateCcw, Clock, ChevronRight, Copy, ShieldCheck, CheckCircle2, Shield,
    LayoutList, Workflow,
} from 'lucide-react';

// ── Types ─────────────────────────────
type Sequence = {
    id: string;
    name: string;
    is_default: boolean;
    sequence_type?: string;
    created_at: string;
};

type SequenceNode = {
    id: string;
    sequence_id: string;
    step_key: string;
    label: string;
    emoji: string;
    prompt_id: string | null;
    sort_order: number;
    parent_node_id: string | null;
    pathway_condition: string | null;
    gender_condition: string | null;
    specialty_condition: string | null;
    ai_prompts: { id: string; name: string; prompt_type: string; is_active: boolean; version: number } | null;
};

type PromptOption = {
    id: string;
    name: string;
    prompt_type: string;
    content?: string;
    is_active: boolean;
    version?: number;
};

type PromptVersionEntry = {
    id: string;
    prompt_id: string;
    version: number;
    name: string;
    specialty: string;
    prompt_type: string;
    content: string;
    is_active: boolean;
    created_at: string;
};

const PATHWAY_CONDITIONS = [
    { value: '', label: 'None (always runs)' },
    { value: 'new_visit', label: '🆕 New Visit' },
    { value: 'follow_up', label: '🔄 Follow-up' },
    { value: 'refill', label: '💊 Refill' },
];

const EMOJI_OPTIONS = ['👋', '🔀', '📋', '🏥', '💊', '⚠️', '👨‍👩‍👦', '🏠', '🔍', '📝', '🔄', '🩺', '🧪', '📊', '🏷️', '🩷'];

const GENDER_CONDITIONS = [
    { value: '', label: 'None (all genders)' },
    { value: 'female', label: '♀ Female Only' },
    { value: 'male', label: '♂ Male Only' },
];

const SPECIALTY_CONDITIONS = [
    { value: '', label: 'None (global – all specialties)', color: '' },
    { value: 'dermatology', label: '🦴 Dermatology', color: 'text-rose-400' },
    { value: 'family_medicine', label: '🩺 Family Medicine', color: 'text-emerald-400' },
    { value: 'pediatrics', label: '👶 Pediatrics', color: 'text-sky-400' },
    { value: 'psychiatry', label: '🧠 Psychiatry', color: 'text-purple' },
    { value: 'orthopedics', label: '🦴 Orthopedics', color: 'text-amber-400' },
    { value: 'diet', label: '🥗 Diet & Nutrition', color: 'text-lime-400' },
];

// ── Protocol Templates ──────────────────────
const SEQUENCE_TEMPLATES = [
    {
        name: '🩺 Standard New Visit',
        desc: 'Full intake: greeting → HPI → PMH → meds → allergies → family → social → RoS → summary',
        nodes: [
            { step_key: 'greeting', label: 'Greeting', emoji: '👋' },
            { step_key: 'pathway', label: 'Visit Type', emoji: '🔀' },
            { step_key: 'hpi', label: 'Present Illness', emoji: '📋' },
            { step_key: 'pmh', label: 'Past Medical History', emoji: '🏥' },
            { step_key: 'medications', label: 'Current Medications', emoji: '💊' },
            { step_key: 'allergies', label: 'Allergies', emoji: '⚠️' },
            { step_key: 'family_history', label: 'Family History', emoji: '👨‍👩‍👦' },
            { step_key: 'social_history', label: 'Social History', emoji: '🏠' },
            { step_key: 'review_of_systems', label: 'Review of Systems', emoji: '🔍' },
            { step_key: 'summary', label: 'Summary', emoji: '📝' },
        ],
    },
    {
        name: '⚡ Quick Follow-Up',
        desc: 'Streamlined: greeting → HPI → meds → summary',
        nodes: [
            { step_key: 'greeting', label: 'Greeting', emoji: '👋' },
            { step_key: 'hpi', label: 'Present Illness', emoji: '📋' },
            { step_key: 'medications', label: 'Current Medications', emoji: '💊' },
            { step_key: 'summary', label: 'Summary', emoji: '📝' },
        ],
    },
    {
        name: '💊 Refill Request',
        desc: 'Minimal: greeting → medications → allergies → summary',
        nodes: [
            { step_key: 'greeting', label: 'Greeting', emoji: '👋' },
            { step_key: 'medications', label: 'Current Medications', emoji: '💊' },
            { step_key: 'allergies', label: 'Allergies', emoji: '⚠️' },
            { step_key: 'summary', label: 'Summary', emoji: '📝' },
        ],
    },
];

// ── Integrity Check Rules ──────────────────
type IntegrityRule = {
    id: string;
    label: string;
    desc: string;
    test: (content: string) => boolean;
    fix: (content: string) => string;
};

type RuleResult = { ruleId: string; pass: boolean };

const INTEGRITY_RULES: IntegrityRule[] = [
    {
        id: 'exit_condition',
        label: 'Exit Condition',
        desc: 'Prompt contains a completion signal like [SECTION_COMPLETE]',
        test: (c) => /\[SECTION_COMPLETE\]|\[COMPLETE\]|\[DONE\]|\[NEXT\]/i.test(c),
        fix: (c) => c.trimEnd() + '\n\nWhen you have gathered all the required information for this section, respond with exactly: [SECTION_COMPLETE]',
    },
    {
        id: 'max_turns',
        label: 'Max Turns Limit',
        desc: 'Limits how many exchanges before auto-advancing',
        test: (c) => /within \d+ (exchange|message|turn|question)|maximum \d+ (exchange|message|turn)|after \d+ message/i.test(c),
        fix: (c) => c.trimEnd() + '\n\nComplete this section within 3-5 exchanges. If the patient has not provided all information after 5 messages, summarize what you have and output [SECTION_COMPLETE].',
    },
    {
        id: 'skip_handling',
        label: 'Skip / Fallback',
        desc: 'Handles "skip", "I don\'t know", or "next" gracefully',
        test: (c) => /skip|i don.t know|don.t remember|next|pass|move on/i.test(c),
        fix: (c) => c.trimEnd() + '\n\nIf the patient says "skip", "I don\'t know", "next", or "move on", acknowledge politely and output [SECTION_COMPLETE].',
    },
    {
        id: 'no_repeat',
        label: 'No Re-asking',
        desc: 'Avoids repeating questions from earlier sections',
        test: (c) => /already (provided|answered|covered|discussed)|previous section|do not (re-?ask|repeat)/i.test(c),
        fix: (c) => 'The patient may have already completed previous sections. Do not re-ask questions that have already been answered.\n\n' + c,
    },
    {
        id: 'role_instruction',
        label: 'Role Definition',
        desc: 'Contains a clear role/identity instruction',
        test: (c) => /^you are|your role|you.re a|act as/im.test(c),
        fix: (c) => 'You are a medical intake AI assistant for cliniq.one. Be professional, empathetic, and concise.\n\n' + c,
    },
];

// ══════════════════════════════════════════
export default function SequenceBuilderContent() {
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [nodes, setNodes] = useState<SequenceNode[]>([]);
    const [prompts, setPrompts] = useState<PromptOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSeqName, setNewSeqName] = useState('');
    const [showNewSeq, setShowNewSeq] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [showAddNode, setShowAddNode] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ── Version history ──
    const [nodeVersions, setNodeVersions] = useState<Record<string, PromptVersionEntry[]>>({});
    const [loadingVersions, setLoadingVersions] = useState<string | null>(null);
    const [expandedVersionNodeId, setExpandedVersionNodeId] = useState<string | null>(null);
    const [rollingBack, setRollingBack] = useState(false);

    // ── Inline prompt peek ──
    const [peekingPromptNodeId, setPeekingPromptNodeId] = useState<string | null>(null);

    // ── Version diff ──
    const [comparingVersionId, setComparingVersionId] = useState<string | null>(null);

    // ── Integrity check ──
    const [showIntegrityCheck, setShowIntegrityCheck] = useState(false);
    const [integrityResults, setIntegrityResults] = useState<Record<string, RuleResult[]>>({});
    const [checkingIntegrity, setCheckingIntegrity] = useState(false);
    const [fixingNodeId, setFixingNodeId] = useState<string | null>(null);

    // ── Active Sequence Protection ──
    const [activeProductionId, setActiveProductionId] = useState<string | null>(null);
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [acknowledgedDirectEdit, setAcknowledgedDirectEdit] = useState(false);
    const [cloning, setCloning] = useState(false);

    // ── Pipeline view ──
    const [viewMode, setViewMode] = useState<'pipeline' | 'detail'>('detail');

    // ── UX improvements ──
    const [showDevSlugs, setShowDevSlugs] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const isActiveSequence = selectedId !== '' && (
        selectedId === activeProductionId ||
        (!activeProductionId && sequences.find(s => s.id === selectedId)?.is_default === true)
    );

    // Fetch the active production sequence ID on mount
    useEffect(() => {
        fetchPlatformSetting('ai_active_sequence_id').then(val => {
            if (val) setActiveProductionId(val);
        });
    }, []);

    // Reset session acknowledgment when switching sequences
    useEffect(() => {
        setAcknowledgedDirectEdit(false);
    }, [selectedId]);

    /**
     * Guard: intercept edit actions on the active production sequence.
     * Returns true if the action should proceed, false if it was intercepted.
     */
    function guardActiveSequence(action: () => void): boolean {
        if (!isActiveSequence || acknowledgedDirectEdit) return true;
        setPendingAction(() => action);
        setShowCloneDialog(true);
        return false;
    }

    async function handleCloneAndEdit() {
        if (!selectedSeq) return;
        setCloning(true);
        const res = await cloneSequence(selectedId, `${selectedSeq.name} (draft)`);
        if (res.error || !res.data) {
            setError(res.error || 'Failed to clone sequence');
            setCloning(false);
            setShowCloneDialog(false);
            return;
        }
        await loadSequences();
        setSelectedId(res.data.id);
        setSuccess(`Cloned as "${res.data.name}" — now editing the draft`);
        setShowCloneDialog(false);
        setPendingAction(null);
        setCloning(false);
    }

    function handleEditAnyway() {
        setAcknowledgedDirectEdit(true);
        setShowCloneDialog(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    }

    function handleCancelCloneDialog() {
        setShowCloneDialog(false);
        setPendingAction(null);
    }

    // ── Multi-level Undo Stack (5 levels) ──
    const [undoStack, setUndoStack] = useState<{ label: string; snapshot: SequenceNode[] }[]>([]);
    const [restoringSnapshot, setRestoringSnapshot] = useState(false);
    const MAX_UNDO_LEVELS = 5;

    function saveSnapshot(label: string) {
        setUndoStack(prev => {
            const updated = [{ label, snapshot: [...nodes] }, ...prev];
            return updated.slice(0, MAX_UNDO_LEVELS);
        });
    }

    async function handleUndo() {
        if (undoStack.length === 0 || !selectedId) return;
        const latest = undoStack[0];
        if (!confirm(`Undo "${latest.label}"? This will revert the sequence to its previous state.`)) return;
        setRestoringSnapshot(true);
        try {
            // Restore each node's state (prompt_id, pathway, gender, order)
            for (const snapNode of latest.snapshot) {
                await editSequenceNode(snapNode.id, {
                    prompt_id: snapNode.prompt_id,
                    pathway_condition: snapNode.pathway_condition,
                    gender_condition: snapNode.gender_condition,
                    sort_order: snapNode.sort_order,
                });
            }
            // Re-order by snapshot order
            await reorderNodes(selectedId, latest.snapshot.map(n => n.id));
            await loadNodes();
            setSuccess(`Reverted: "${latest.label}"`);
            setUndoStack(prev => prev.slice(1));
        } catch {
            setError('Failed to revert');
        }
        setRestoringSnapshot(false);
    }

    // ── New node form ──
    const [newNode, setNewNode] = useState({
        step_key: '',
        label: '',
        emoji: '📋',
        prompt_id: '',
        pathway_condition: '',
        parent_node_id: '',
    });

    // ── Load data ──
    const loadSequences = useCallback(async () => {
        const data = await fetchPromptSequences();
        setSequences(data as Sequence[]);
        if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id);
        }
    }, [selectedId]);

    const loadNodes = useCallback(async () => {
        if (!selectedId) return;
        const seq = await fetchSequenceWithNodes(selectedId);
        if (seq) setNodes((seq as { nodes: SequenceNode[] }).nodes ?? []);
    }, [selectedId]);

    const loadPrompts = useCallback(async () => {
        const { data } = await fetchAIPrompts(1, 200);
        setPrompts(data as PromptOption[]);
    }, []);

    // Load versions for a node's linked prompt
    async function loadVersionsForPrompt(nodeId: string, promptId: string) {
        setLoadingVersions(nodeId);
        const versions = await fetchPromptVersions(promptId);
        setNodeVersions(prev => ({ ...prev, [nodeId]: versions as PromptVersionEntry[] }));
        setLoadingVersions(null);
    }

    // Load versions when we start editing a node that has a prompt
    useEffect(() => {
        if (editingNodeId) {
            const node = nodes.find(n => n.id === editingNodeId);
            if (node?.prompt_id && !nodeVersions[editingNodeId]) {
                loadVersionsForPrompt(editingNodeId, node.prompt_id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingNodeId]);

    useEffect(() => {
        Promise.all([loadSequences(), loadPrompts()]).then(() => setLoading(false));
    }, [loadSequences, loadPrompts]);

    useEffect(() => {
        if (selectedId) loadNodes();
    }, [selectedId, loadNodes]);

    // ── Clear feedback ──
    useEffect(() => {
        if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
    }, [success]);

    // ── Handlers ──
    async function handleCreateSequence() {
        if (!newSeqName.trim()) return;
        setSaving(true);
        const res = await addPromptSequence(newSeqName, sequences.length === 0);
        if (res.error) { setError(res.error); }
        else {
            setSuccess('Sequence created!');
            setNewSeqName('');
            setShowNewSeq(false);
            await loadSequences();
            if (res.data) setSelectedId(res.data.id);
        }
        setSaving(false);
    }

    async function handleSetDefault(id: string) {
        await editPromptSequence(id, { is_default: true });
        setSuccess('Set as default!');
        await loadSequences();
    }

    async function handleDeleteSequence(id: string) {
        if (!confirm('Delete this sequence and all its nodes? This cannot be undone.')) return;
        const res = await removePromptSequence(id);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSuccess('Sequence deleted');
        setSelectedId('');
        await loadSequences();
    }

    async function handleAddNode() {
        const doIt = async () => {
            if (!newNode.step_key.trim() || !newNode.label.trim()) { setError('Step key and label required'); return; }
            setSaving(true);
            const res = await addSequenceNode({
                sequence_id: selectedId,
                step_key: newNode.step_key,
                label: newNode.label,
                emoji: newNode.emoji,
                prompt_id: newNode.prompt_id || null,
                sort_order: nodes.length,
                parent_node_id: newNode.parent_node_id || null,
                pathway_condition: newNode.pathway_condition || null,
            });
            if (res.error) setError(res.error);
            else {
                setSuccess('Node added!');
                setShowAddNode(false);
                setNewNode({ step_key: '', label: '', emoji: '📋', prompt_id: '', pathway_condition: '', parent_node_id: '' });
                await loadNodes();
            }
            setSaving(false);
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleUpdateNodePrompt(nodeId: string, promptId: string | null) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            const promptName = promptId ? prompts.find(p => p.id === promptId)?.name : 'None';
            if (!confirm(`Link prompt "${promptName}" to "${node?.label}"?`)) return;
            saveSnapshot('prompt link change');
            await editSequenceNode(nodeId, { prompt_id: promptId });
            await loadNodes();
            setSuccess('Prompt linked!');
            if (promptId) {
                loadVersionsForPrompt(nodeId, promptId);
            } else {
                setNodeVersions(prev => { const n = { ...prev }; delete n[nodeId]; return n; });
            }
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleRollbackVersion(nodeId: string, promptId: string, versionId: string) {
        if (!confirm('Rollback this prompt to the selected version? The current version will be preserved in history.')) return;
        setRollingBack(true);
        const res = await rollbackToVersion(promptId, versionId);
        if (res.error) {
            setError(res.error);
        } else {
            setSuccess('Prompt rolled back!');
            await loadNodes();
            await loadPrompts();
            loadVersionsForPrompt(nodeId, promptId);
        }
        setRollingBack(false);
    }

    async function handleUpdateNodePathway(nodeId: string, condition: string) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            const condLabel = PATHWAY_CONDITIONS.find(c => c.value === condition)?.label || 'None';
            if (!confirm(`Set pathway condition to "${condLabel}" for "${node?.label}"?`)) return;
            saveSnapshot('pathway change');
            await editSequenceNode(nodeId, { pathway_condition: condition || null });
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleUpdateNodeParent(nodeId: string, parentId: string) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            const parentNode = nodes.find(n => n.id === parentId);
            if (!confirm(`Set parent of "${node?.label}" to "${parentNode?.label || 'None'}"?`)) return;
            saveSnapshot('parent change');
            await editSequenceNode(nodeId, { parent_node_id: parentId || null });
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleUpdateNodeGender(nodeId: string, condition: string) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            const genderLabel = GENDER_CONDITIONS.find(c => c.value === condition)?.label || 'None';
            if (!confirm(`Set gender condition to "${genderLabel}" for "${node?.label}"?`)) return;
            saveSnapshot('gender condition change');
            await editSequenceNode(nodeId, { gender_condition: condition || null });
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleUpdateNodeSpecialty(nodeId: string, condition: string) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            const specLabel = SPECIALTY_CONDITIONS.find(c => c.value === condition)?.label || 'None (global)';
            if (!confirm(`Set specialty condition to "${specLabel}" for "${node?.label}"?`)) return;
            saveSnapshot('specialty condition change');
            await editSequenceNode(nodeId, { specialty_condition: condition || null });
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleDeleteNode(nodeId: string) {
        const doIt = async () => {
            const node = nodes.find(n => n.id === nodeId);
            if (!confirm(`Delete node "${node?.label || nodeId}"? This cannot be undone.`)) return;
            saveSnapshot('node deletion');
            await removeSequenceNode(nodeId);
            setSuccess('Node deleted');
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    async function handleMoveNode(idx: number, direction: 'up' | 'down') {
        const doIt = async () => {
            const updated = [...nodes];
            const swap = direction === 'up' ? idx - 1 : idx + 1;
            if (swap < 0 || swap >= updated.length) return;
            if (!confirm(`Move "${updated[idx].label}" ${direction}?`)) return;
            saveSnapshot('reorder');
            [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
            const ids = updated.map(n => n.id);
            await reorderNodes(selectedId, ids);
            await loadNodes();
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    // ── Integrity Check Handlers ──────────────
    function runIntegrityCheck() {
        setCheckingIntegrity(true);
        const results: Record<string, RuleResult[]> = {};
        for (const node of nodes) {
            if (!node.prompt_id) continue;
            const prompt = prompts.find(p => p.id === node.prompt_id);
            const content = prompt?.content || '';
            results[node.id] = INTEGRITY_RULES.map(rule => ({
                ruleId: rule.id,
                pass: content.trim() ? rule.test(content) : false,
            }));
        }
        setIntegrityResults(results);
        setShowIntegrityCheck(true);
        setCheckingIntegrity(false);
    }

    async function handleFixRule(nodeId: string, ruleId: string) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node?.prompt_id) return;
        const prompt = prompts.find(p => p.id === node.prompt_id);
        if (!prompt?.content) return;
        const rule = INTEGRITY_RULES.find(r => r.id === ruleId);
        if (!rule) return;
        setFixingNodeId(nodeId);
        try {
            const fixedContent = rule.fix(prompt.content);
            await updatePrompt(prompt.id, { content: fixedContent });
            // Update local state
            const updated = prompts.map(p => p.id === prompt.id ? { ...p, content: fixedContent } : p);
            setPrompts(updated);
            // Re-check this node
            setIntegrityResults(prev => ({
                ...prev,
                [nodeId]: INTEGRITY_RULES.map(r => ({
                    ruleId: r.id,
                    pass: r.test(fixedContent),
                })),
            }));
            setSuccess(`Fixed "${rule.label}" for ${node.label}`);
        } catch {
            setError('Failed to apply fix');
        }
        setFixingNodeId(null);
    }

    async function handleFixAll() {
        setFixingNodeId('all');
        setError('');
        try {
            for (const node of nodes) {
                if (!node.prompt_id) continue;
                const prompt = prompts.find(p => p.id === node.prompt_id);
                if (!prompt?.content) continue;
                const nodeResults = integrityResults[node.id] || [];
                const failingRules = nodeResults.filter(r => !r.pass).map(r => INTEGRITY_RULES.find(rule => rule.id === r.ruleId)!).filter(Boolean);
                if (failingRules.length === 0) continue;
                let content = prompt.content;
                for (const rule of failingRules) {
                    if (!rule.test(content)) {
                        content = rule.fix(content);
                    }
                }
                await updatePrompt(prompt.id, { content });
                const updated = prompts.map(p => p.id === prompt.id ? { ...p, content } : p);
                setPrompts(updated);
            }
            runIntegrityCheck();
            setSuccess('All issues fixed!');
        } catch {
            setError('Failed to fix all issues');
        }
        setFixingNodeId(null);
    }

    async function handleApplyTemplate(template: typeof SEQUENCE_TEMPLATES[0]) {
        const doIt = async () => {
            let mode: 'replace' | 'append' = 'replace';
            if (nodes.length > 0) {
                const choice = confirm(
                    `Apply template "${template.name}"?\n\n` +
                    `Click OK to REPLACE all existing nodes (recommended).\n` +
                    `Click Cancel to CANCEL.`
                );
                if (!choice) return;
                mode = 'replace';
            }
            setSaving(true);
            setError('');
            saveSnapshot('template application');
            try {
                if (mode === 'replace' && nodes.length > 0) {
                    for (const node of nodes) {
                        await removeSequenceNode(node.id);
                    }
                }
                const baseOrder = mode === 'replace' ? 0 : nodes.length;
                for (let i = 0; i < template.nodes.length; i++) {
                    const t = template.nodes[i];
                    const matchingPrompt = prompts.find(p =>
                        p.name.toLowerCase().includes(t.step_key.replace(/_/g, ' ')) ||
                        t.label.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
                    );
                    await addSequenceNode({
                        sequence_id: selectedId,
                        step_key: t.step_key,
                        label: t.label,
                        emoji: t.emoji,
                        prompt_id: matchingPrompt?.id || null,
                        sort_order: baseOrder + i,
                    });
                }
                await loadNodes();
                setSuccess(`Template "${template.name}" applied!`);
            } catch {
                setError('Failed to apply template');
            }
            setSaving(false);
        };
        if (!guardActiveSequence(doIt)) return;
        await doIt();
    }

    const selectedSeq = sequences.find(s => s.id === selectedId);

    // ── Group nodes by pathway ──
    const pathwayNode = nodes.find(n => n.step_key === 'pathway');
    const linearNodes = nodes.filter(n => !n.pathway_condition);
    const branchNodes = {
        new_visit: nodes.filter(n => n.pathway_condition === 'new_visit'),
        follow_up: nodes.filter(n => n.pathway_condition === 'follow_up'),
        refill: nodes.filter(n => n.pathway_condition === 'refill'),
    };
    const hasBranches = branchNodes.new_visit.length > 0 || branchNodes.follow_up.length > 0 || branchNodes.refill.length > 0;
    const specialtyBranchNodes = SPECIALTY_CONDITIONS.filter(s => s.value).map(s => ({
        ...s,
        nodes: nodes.filter(n => n.specialty_condition === s.value),
    })).filter(s => s.nodes.length > 0);
    const hasSpecialtyBranches = specialtyBranchNodes.length > 0;

    // ── Section toggle ──
    function toggleSection(key: string) {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    }

    // ── Sidebar grouping ──
    const pipelinePhases = sequences.filter(s => ['global_intake', 'global_wrapup'].includes(s.sequence_type || ''));
    const specialtyFlows = sequences.filter(s => !['global_intake', 'global_wrapup'].includes(s.sequence_type || ''));

    // ── Grouped nodes for phase view ──
    const pathwayNodeIdx = nodes.findIndex(n => n.step_key === 'pathway');
    const systemNodes = nodes.filter(n => (n as any).node_type && (n as any).node_type !== 'chat');
    const prePathwayNodes = nodes.filter(n => !n.pathway_condition && !(n as any).node_type?.startsWith('system_') && n.sort_order <= (pathwayNode?.sort_order ?? 0));
    const postBranchNodes = nodes.filter(n => {
        if (n.pathway_condition) return false;
        if ((n as any).node_type && (n as any).node_type !== 'chat') return false;
        const lastBranchOrder = Math.max(
            ...nodes.filter(bn => bn.pathway_condition).map(bn => bn.sort_order),
            pathwayNode?.sort_order ?? -1
        );
        return n.sort_order > lastBranchOrder;
    });

    const nodeSections = [
        { key: 'always_start', label: '🌐 Always Runs (Start)', color: 'border-teal-500/40', bgColor: 'bg-teal-500/5', textColor: 'text-teal-400', nodes: prePathwayNodes },
        { key: 'system', label: '⚡ System Nodes', color: 'border-amber-500/40', bgColor: 'bg-amber-500/5', textColor: 'text-amber-400', nodes: systemNodes },
        { key: 'new_visit', label: '🆕 New Visit Path', color: 'border-blue-500/40', bgColor: 'bg-blue-500/5', textColor: 'text-blue-400', nodes: branchNodes.new_visit },
        { key: 'follow_up', label: '🔄 Follow-Up Path', color: 'border-violet-500/40', bgColor: 'bg-violet-500/5', textColor: 'text-violet-400', nodes: branchNodes.follow_up },
        { key: 'refill', label: '💊 Refill Path', color: 'border-emerald-500/40', bgColor: 'bg-emerald-500/5', textColor: 'text-emerald-400', nodes: branchNodes.refill },
        { key: 'always_end', label: '🌐 Always Runs (Wrapup)', color: 'border-teal-500/40', bgColor: 'bg-teal-500/5', textColor: 'text-teal-400', nodes: postBranchNodes },
    ].filter(s => s.nodes.length > 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <>
            {/* Feedback */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-error-faded border border-error/30 text-error text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button>
                </div>
            )}
            {success && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-success-faded border border-success/30 text-success text-sm">
                    ✓ {success}
                </div>
            )}

            <div className="flex gap-6 min-h-[calc(100vh-280px)]">
                {/* ── Left: Sequence List ────────── */}
                <div className="w-[260px] flex-shrink-0 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-text-primary">Flows</h3>
                        <button
                            onClick={() => setShowNewSeq(!showNewSeq)}
                            className="w-7 h-7 rounded-lg bg-accent-faded flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {showNewSeq && (
                        <div className="p-3 rounded-xl border border-accent/30 bg-bg-elevated space-y-2">
                            <input
                                type="text"
                                value={newSeqName}
                                onChange={e => setNewSeqName(e.target.value)}
                                placeholder="Flow name..."
                                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                onKeyDown={e => e.key === 'Enter' && handleCreateSequence()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateSequence} disabled={saving}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-accent text-bg-primary text-xs font-bold hover:bg-accent/80 transition-colors disabled:opacity-50">
                                    Create
                                </button>
                                <button onClick={() => setShowNewSeq(false)}
                                    className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-muted text-xs hover:text-text-primary transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pipeline Phases group */}
                    {pipelinePhases.length > 0 && (
                        <>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mt-2 mb-1">Pipeline Phases</p>
                            {pipelinePhases.map(seq => (
                                <button
                                    key={seq.id}
                                    onClick={() => setSelectedId(seq.id)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all ${seq.id === selectedId
                                        ? 'border-teal-500/50 bg-teal-500/10 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                                        : 'border-border bg-bg-elevated hover:border-border hover:bg-bg-tertiary'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">{seq.sequence_type === 'global_intake' ? '🌐' : '📋'}</span>
                                        <span className={`text-sm font-medium ${seq.id === selectedId ? 'text-teal-400' : 'text-text-primary'}`}>
                                            {seq.name}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}

                    {/* Specialty / Interview Flows group */}
                    {specialtyFlows.length > 0 && (
                        <>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mt-4 mb-1">Interview Flows</p>
                            {specialtyFlows.map(seq => (
                                <button
                                    key={seq.id}
                                    onClick={() => setSelectedId(seq.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${seq.id === selectedId
                                        ? 'border-accent/50 bg-accent-faded shadow-[0_0_20px_rgba(45,212,191,0.1)]'
                                        : 'border-border bg-bg-elevated hover:border-border hover:bg-bg-tertiary'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <GitBranchPlus className={`w-4 h-4 ${seq.id === selectedId ? 'text-accent' : 'text-text-muted'}`} />
                                        <span className={`text-sm font-medium ${seq.id === selectedId ? 'text-accent' : 'text-text-primary'}`}>
                                            {seq.name}
                                        </span>
                                    </div>
                                    {seq.is_default && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                                            <Star className="w-3 h-3" /> Default
                                        </span>
                                    )}
                                </button>
                            ))}
                        </>
                    )}

                    {sequences.length === 0 && !showNewSeq && (
                        <p className="text-xs text-text-muted text-center py-6">No sequences yet. Create one to get started.</p>
                    )}
                </div>

                {/* ── Right: Sequence Editor ────── */}
                <div className="flex-1">
                    {selectedSeq ? (
                        <>
                            {/* Sequence header */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary">{selectedSeq.name}</h2>
                                    <p className="text-xs text-text-muted">{nodes.length} nodes configured</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!selectedSeq.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(selectedSeq.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                        >
                                            <Star className="w-3.5 h-3.5" /> Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteSequence(selectedSeq.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-error hover:bg-error-faded transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                    {undoStack.length > 0 && (
                                        <button
                                            onClick={handleUndo}
                                            disabled={restoringSnapshot}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                        >
                                            {restoringSnapshot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                            Undo {undoStack[0]?.label} ({undoStack.length})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Active sequence warning banner */}
                            {isActiveSequence && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 animate-fade-in">
                                    <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-400">Active Production Sequence</p>
                                        <p className="text-xs text-amber-400/70">This sequence is currently being used by patients. Changes will affect live consultations.</p>
                                    </div>
                                    {!acknowledgedDirectEdit && (
                                        <button
                                            onClick={handleCloneAndEdit}
                                            disabled={cloning}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors whitespace-nowrap disabled:opacity-50"
                                        >
                                            {cloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                            Clone to Draft
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Pipeline / Detail toggle + Dev slug toggle */}
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <div className="flex rounded-lg border border-border overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('pipeline')}
                                        title="Visual flow diagram — see the branching structure at a glance"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            viewMode === 'pipeline'
                                                ? 'bg-accent text-bg-primary'
                                                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                        }`}
                                    >
                                        <Workflow className="w-3.5 h-3.5" />
                                        Pipeline
                                    </button>
                                    <button
                                        onClick={() => setViewMode('detail')}
                                        title="Node-by-node editor — modify prompts, conditions, and ordering"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            viewMode === 'detail'
                                                ? 'bg-accent text-bg-primary'
                                                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                        }`}
                                    >
                                        <LayoutList className="w-3.5 h-3.5" />
                                        Detail
                                    </button>
                                </div>
                                <span className="text-[10px] text-text-muted">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
                                <div className="ml-auto">
                                    <button
                                        onClick={() => setShowDevSlugs(!showDevSlugs)}
                                        title={showDevSlugs ? 'Hide developer step keys' : 'Show developer step keys'}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                            showDevSlugs
                                                ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                                                : 'bg-bg-tertiary text-text-muted hover:text-text-primary border border-transparent'
                                        }`}
                                    >
                                        🛠 Dev
                                    </button>
                                </div>
                            </div>

                            {/* ── Mini-Pipeline Diagram ── */}
                            {nodes.length > 0 && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500/5 via-violet-500/5 to-teal-500/5 border border-border">
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
                                        <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">🌐 Global Intake</span>
                                        <ChevronRight className="w-3 h-3 text-text-muted/40" />
                                        <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">🔀 Pathway Detection</span>
                                        <ChevronRight className="w-3 h-3 text-text-muted/40" />
                                        <span className="flex items-center gap-1">
                                            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">🆕</span>
                                            <span className="text-text-muted/40">|</span>
                                            <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">🔄</span>
                                            <span className="text-text-muted/40">|</span>
                                            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">💊</span>
                                        </span>
                                        <ChevronRight className="w-3 h-3 text-text-muted/40" />
                                        <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">🌐 Wrapup</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Condition Legend ── */}
                            {nodes.length > 0 && (
                                <div className="mb-4 flex items-center gap-3 flex-wrap text-[10px] text-text-muted">
                                    <span className="font-bold uppercase tracking-wider text-text-muted/60">Legend:</span>
                                    <span title="Runs only for new patient visits" className="cursor-help hover:text-blue-400 transition-colors">🆕 New Visit</span>
                                    <span title="Runs only for follow-up visits" className="cursor-help hover:text-violet-400 transition-colors">🔄 Follow-up</span>
                                    <span title="Runs only for medication refill requests" className="cursor-help hover:text-emerald-400 transition-colors">💊 Refill</span>
                                    <span className="text-text-muted/20">·</span>
                                    <span title="Runs only for female patients" className="cursor-help hover:text-pink-400 transition-colors">♀ Female Only</span>
                                    <span title="Runs only for male patients" className="cursor-help hover:text-blue-400 transition-colors">♂ Male Only</span>
                                    <span className="text-text-muted/20">·</span>
                                    <span title="System node — handles routing and analysis automatically" className="cursor-help hover:text-amber-400 transition-colors">⚡ System</span>
                                </div>
                            )}

                            {/* ── Pipeline View ── */}
                            {viewMode === 'pipeline' && nodes.length > 0 && (
                                <div className="mb-6 glass rounded-2xl p-5 border border-accent/20 overflow-x-auto">
                                    <div className="flex items-center gap-1 min-w-max">
                                        {nodes.map((node, i) => {
                                            const isSystem = (node as any).node_type === 'system_gate' || (node as any).node_type === 'system_analysis' || (node as any).node_type === 'system_integrity';
                                            const hasPrompt = !!node.prompt_id;
                                            const specColor = node.specialty_condition ? (SPECIALTY_CONDITIONS.find(s => s.value === node.specialty_condition)?.color || 'text-text-muted') : '';
                                            return (
                                                <div key={node.id} className="flex items-center gap-1">
                                                    <div
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-default ${
                                                            isSystem
                                                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                                                : hasPrompt
                                                                    ? 'bg-bg-elevated border border-border text-text-primary hover:border-accent/40'
                                                                    : 'bg-error/5 border border-error/30 text-error'
                                                        }`}
                                                        title={`${node.label}${node.pathway_condition ? ` (${node.pathway_condition})` : ''}${!hasPrompt && !isSystem ? ' — No prompt linked!' : ''}`}
                                                    >
                                                        <span className="text-base">{node.emoji || '📋'}</span>
                                                        <span className="whitespace-nowrap">{node.label}</span>
                                                        {isSystem && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20">⚡</span>}
                                                        {node.pathway_condition && (
                                                            <span className="text-[8px] px-1 py-0.5 rounded bg-accent-faded text-accent">{node.pathway_condition.replace('_', ' ')}</span>
                                                        )}
                                                        {node.gender_condition && (
                                                            <span className="text-[8px]">{node.gender_condition === 'female' ? '♀' : '♂'}</span>
                                                        )}
                                                        {node.specialty_condition && (
                                                            <span className={`text-[8px] px-1 py-0.5 rounded bg-purple-faded/30 ${specColor}`}>
                                                                {SPECIALTY_CONDITIONS.find(s => s.value === node.specialty_condition)?.label?.split(' ')[0] || node.specialty_condition}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {i < nodes.length - 1 && (
                                                        <ChevronRight className="w-4 h-4 text-text-muted/40 flex-shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Branching summary */}
                                    {hasBranches && (
                                        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                                            {branchNodes.new_visit.length > 0 && (
                                                <div className="text-[10px] text-text-muted">
                                                    <span className="text-emerald-400 font-semibold">🆕 New Visit:</span>{' '}
                                                    {branchNodes.new_visit.map(n => n.label).join(' → ')}
                                                </div>
                                            )}
                                            {branchNodes.follow_up.length > 0 && (
                                                <div className="text-[10px] text-text-muted">
                                                    <span className="text-blue-400 font-semibold">🔄 Follow-up:</span>{' '}
                                                    {branchNodes.follow_up.map(n => n.label).join(' → ')}
                                                </div>
                                            )}
                                            {branchNodes.refill.length > 0 && (
                                                <div className="text-[10px] text-text-muted">
                                                    <span className="text-purple font-semibold">💊 Refill:</span>{' '}
                                                    {branchNodes.refill.map(n => n.label).join(' → ')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Specialty branches */}
                                    {hasSpecialtyBranches && (
                                        <div className={`${hasBranches ? '' : 'mt-3'} pt-3 border-t border-border flex flex-wrap gap-3`}>
                                            {specialtyBranchNodes.map(sb => (
                                                <div key={sb.value} className="text-[10px] text-text-muted">
                                                    <span className={`${sb.color} font-semibold`}>{sb.label}:</span>{' '}
                                                    {sb.nodes.map(n => n.label).join(' → ')}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Node list */}
                            <div className="space-y-2 mb-4">
                                {nodes.length === 0 ? (
                                    <div className="border border-dashed border-border rounded-2xl p-6">
                                        <GitBranchPlus className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                                        <p className="text-sm text-text-muted text-center mb-4">No nodes yet. Start from a template or add sections manually.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {SEQUENCE_TEMPLATES.map((tmpl, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleApplyTemplate(tmpl)}
                                                    disabled={saving}
                                                    className="text-left p-3 rounded-xl border border-border bg-bg-elevated hover:border-accent/40 hover:bg-accent-faded/30 transition-all group disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Copy className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <span className="text-xs font-bold text-text-primary">{tmpl.name}</span>
                                                    </div>
                                                    <p className="text-[10px] text-text-muted leading-relaxed">{tmpl.desc}</p>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {tmpl.nodes.map((n, j) => (
                                                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{n.emoji} {n.label}</span>
                                                        ))}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    nodeSections.map(section => (
                                        <div key={section.key} className={`rounded-xl border-l-4 ${section.color} mb-3`}>
                                            {/* Section header */}
                                            <button
                                                onClick={() => toggleSection(section.key)}
                                                className={`w-full flex items-center gap-2 px-4 py-2.5 ${section.bgColor} rounded-t-xl transition-colors hover:brightness-110`}
                                            >
                                                <ChevronRight className={`w-3.5 h-3.5 ${section.textColor} transition-transform ${collapsedSections[section.key] ? '' : 'rotate-90'}`} />
                                                <span className={`text-xs font-bold ${section.textColor}`}>{section.label}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${section.bgColor} ${section.textColor} font-semibold ml-auto`}>
                                                    {section.nodes.length}
                                                </span>
                                            </button>
                                            {/* Section nodes */}
                                            {!collapsedSections[section.key] && (
                                                <div className="space-y-2 p-2">
                                    {section.nodes.map((node) => {
                                        const idx = nodes.indexOf(node);
                                        return (
                                        <div
                                            key={node.id}
                                            className={`rounded-xl border px-4 py-3 transition-all ${
                                                (node as any).node_type && (node as any).node_type !== 'chat'
                                                    ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-amber-500/10'
                                                    : 'border-border bg-bg-elevated'
                                            } ${editingNodeId === node.id ? 'ring-2 ring-accent/40' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Order arrows — disabled for system nodes */}
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => handleMoveNode(idx, 'up')}
                                                        disabled={idx === 0 || ((node as any).node_type && (node as any).node_type !== 'chat')}
                                                        className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent disabled:opacity-20 disabled:cursor-default transition-colors"
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveNode(idx, 'down')}
                                                        disabled={idx === nodes.length - 1 || ((node as any).node_type && (node as any).node_type !== 'chat')}
                                                        className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent disabled:opacity-20 disabled:cursor-default transition-colors"
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Order number */}
                                                <span className="text-[10px] text-text-muted font-mono w-5 text-center">{idx}</span>

                                                {/* Emoji */}
                                                <span className="text-lg">{node.emoji}</span>

                                                {/* Label + key + SYSTEM badge */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-text-primary">{node.label}</span>
                                                        {showDevSlugs && <span className="text-[10px] text-text-muted font-mono bg-bg-tertiary px-1.5 py-0.5 rounded">{node.step_key}</span>}
                                                        {(node as any).node_type && (node as any).node_type !== 'chat' && (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                                ⚡ SYSTEM
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* System node description or linked prompt */}
                                                    {(node as any).node_type === 'system_analysis' ? (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-amber-400/70">
                                                                🔍 Determines specialty from patient complaint
                                                            </span>
                                                        </div>
                                                    ) : (node as any).node_type === 'system_gate' ? (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-amber-400/70">
                                                                🛡️ Checks specialty availability
                                                            </span>
                                                            <a
                                                                href="/dashboard/specialties"
                                                                className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-accent-faded text-accent hover:bg-accent/20 transition-colors"
                                                            >
                                                                Configure →
                                                            </a>
                                                        </div>
                                                    ) : (node as any).node_type === 'system_integrity' ? (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-amber-400/70">
                                                                📊 Silent integrity analysis — generates doctor confidence score
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {node.ai_prompts ? (
                                                                <>
                                                                    <span className="text-[10px] text-accent flex items-center gap-1">
                                                                        <Link2 className="w-2.5 h-2.5" />
                                                                        {node.ai_prompts.name} v{node.ai_prompts.version}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPeekingPromptNodeId(peekingPromptNodeId === node.id ? null : node.id); }}
                                                                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold transition-colors ${peekingPromptNodeId === node.id
                                                                            ? 'bg-accent-faded text-accent'
                                                                            : 'bg-bg-tertiary text-text-muted hover:text-accent hover:bg-accent-faded'
                                                                            }`}
                                                                        title="Preview prompt content"
                                                                    >
                                                                        👁 Peek
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] text-warning">⚠ No prompt linked</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pathway badge */}
                                                {node.pathway_condition && (
                                                    <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${node.pathway_condition === 'new_visit' ? 'bg-blue-500/10 text-blue-400' :
                                                        node.pathway_condition === 'follow_up' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-green-500/10 text-green-400'
                                                        }`}>
                                                        {node.pathway_condition === 'new_visit' ? '🆕 New Visit' :
                                                            node.pathway_condition === 'follow_up' ? '🔄 Follow-up' :
                                                                '💊 Refill'}
                                                    </span>
                                                )}

                                                {/* Specialty badge */}
                                                {node.specialty_condition && (
                                                    <span className={`text-[10px] px-2 py-1 rounded-md font-semibold bg-purple-faded/50 ${SPECIALTY_CONDITIONS.find(s => s.value === node.specialty_condition)?.color || 'text-purple'}`}>
                                                        {SPECIALTY_CONDITIONS.find(s => s.value === node.specialty_condition)?.label || node.specialty_condition}
                                                    </span>
                                                )}

                                                {/* Gender badge */}
                                                {node.gender_condition && (
                                                    <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${node.gender_condition === 'female' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {node.gender_condition === 'female' ? '♀ Female Only' : '♂ Male Only'}
                                                    </span>
                                                )}

                                                {/* Actions — HIDDEN for system nodes */}
                                                {(!((node as any).node_type) || (node as any).node_type === 'chat') ? (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingNodeId(editingNodeId === node.id ? null : node.id)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent-faded transition-colors"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNode(node.id)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        🔒
                                                    </span>
                                                )}
                                            </div>

                                            {/* Inline prompt peek */}
                                            {peekingPromptNodeId === node.id && node.prompt_id && (() => {
                                                const linkedPrompt = prompts.find(p => p.id === node.prompt_id);
                                                return linkedPrompt?.content ? (
                                                    <div className="mt-2 p-3 rounded-lg bg-bg-primary border border-accent/20 animate-fade-in">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Prompt Content Preview</span>
                                                            <span className="text-[9px] text-text-muted">{linkedPrompt.content.length} chars</span>
                                                        </div>
                                                        <pre className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto font-mono">
                                                            {linkedPrompt.content}
                                                        </pre>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 p-3 rounded-lg bg-bg-primary border border-border">
                                                        <p className="text-[10px] text-text-muted italic">Prompt content not available</p>
                                                    </div>
                                                );
                                            })()}

                                            {/* Expanded edit panel */}
                                            {editingNodeId === node.id && (
                                                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Linked Prompt</label>
                                                            <select
                                                                value={node.prompt_id || ''}
                                                                onChange={e => handleUpdateNodePrompt(node.id, e.target.value || null)}
                                                                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                            >
                                                                <option value="">—  None  —</option>
                                                                {prompts.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} ({p.prompt_type}) — v{p.version ?? 1}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Pathway Condition</label>
                                                            <select
                                                                value={node.pathway_condition || ''}
                                                                onChange={e => handleUpdateNodePathway(node.id, e.target.value)}
                                                                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                            >
                                                                {PATHWAY_CONDITIONS.map(c => (
                                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Parent (Branch From)</label>
                                                            <select
                                                                value={node.parent_node_id || ''}
                                                                onChange={e => handleUpdateNodeParent(node.id, e.target.value)}
                                                                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                            >
                                                                <option value="">—  No parent  —</option>
                                                                {nodes.filter(n => n.id !== node.id).map(n => (
                                                                    <option key={n.id} value={n.id}>{n.emoji} {n.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Gender Condition</label>
                                                            <select
                                                                value={node.gender_condition || ''}
                                                                onChange={e => handleUpdateNodeGender(node.id, e.target.value)}
                                                                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                            >
                                                                {GENDER_CONDITIONS.map(c => (
                                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Specialty Branch</label>
                                                            <select
                                                                value={node.specialty_condition || ''}
                                                                onChange={e => handleUpdateNodeSpecialty(node.id, e.target.value)}
                                                                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                            >
                                                                {SPECIALTY_CONDITIONS.map(c => (
                                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* ── Prompt Version History ── */}
                                                    {node.prompt_id && (
                                                        <div className="rounded-xl border border-border bg-bg-primary p-3">
                                                            <button
                                                                onClick={() => setExpandedVersionNodeId(expandedVersionNodeId === node.id ? null : node.id)}
                                                                className="flex items-center gap-2 w-full text-left"
                                                            >
                                                                <History className="w-3.5 h-3.5 text-purple" />
                                                                <span className="text-[11px] font-bold text-text-primary flex-1">
                                                                    Version History
                                                                </span>
                                                                <span className="text-[10px] text-purple font-semibold px-1.5 py-0.5 rounded bg-purple-faded">
                                                                    Current: v{node.ai_prompts?.version ?? '?'}
                                                                </span>
                                                                <ChevronRight className={`w-3 h-3 text-text-muted transition-transform ${expandedVersionNodeId === node.id ? 'rotate-90' : ''}`} />
                                                            </button>

                                                            {expandedVersionNodeId === node.id && (
                                                                <div className="mt-3 space-y-1.5 max-h-[280px] overflow-y-auto">
                                                                    {loadingVersions === node.id ? (
                                                                        <div className="flex items-center gap-2 py-3 justify-center">
                                                                            <Loader2 className="w-3 h-3 animate-spin text-accent" />
                                                                            <span className="text-[10px] text-text-muted">Loading versions…</span>
                                                                        </div>
                                                                    ) : (nodeVersions[node.id] ?? []).length === 0 ? (
                                                                        <p className="text-[10px] text-text-muted text-center py-3">No previous versions found — this is v1</p>
                                                                    ) : (
                                                                        (nodeVersions[node.id] ?? []).map(ver => (
                                                                            <div
                                                                                key={ver.id}
                                                                                className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-bg-elevated hover:border-purple/30 transition-colors group"
                                                                            >
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[11px] font-bold text-purple">v{ver.version}</span>
                                                                                        <span className="text-[10px] text-text-muted">{ver.name}</span>
                                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ver.is_active ? 'bg-success-faded text-success' : 'bg-bg-tertiary text-text-muted'}`}>
                                                                                            {ver.is_active ? 'Active' : 'Inactive'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[400px]">
                                                                                        {ver.content?.slice(0, 120)}…
                                                                                    </p>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <Clock className="w-2.5 h-2.5 text-text-muted" />
                                                                                        <span className="text-[9px] text-text-muted">
                                                                                            {new Date(ver.created_at).toLocaleString()}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <button
                                                                                        onClick={() => setComparingVersionId(comparingVersionId === ver.id ? null : ver.id)}
                                                                                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${comparingVersionId === ver.id
                                                                                            ? 'bg-purple/20 text-purple'
                                                                                            : 'bg-bg-tertiary text-text-muted hover:text-purple hover:bg-purple-faded opacity-0 group-hover:opacity-100'
                                                                                            }`}
                                                                                    >
                                                                                        <History className="w-3 h-3" />
                                                                                        Diff
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRollbackVersion(node.id, node.prompt_id!, ver.id)}
                                                                                        disabled={rollingBack}
                                                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-purple-faded text-purple hover:bg-purple/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 whitespace-nowrap"
                                                                                    >
                                                                                        {rollingBack ? (
                                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                                        ) : (
                                                                                            <RotateCcw className="w-3 h-3" />
                                                                                        )}
                                                                                        Rollback
                                                                                    </button>
                                                                                </div>
                                                                                {/* Inline diff view */}
                                                                                {comparingVersionId === ver.id && (() => {
                                                                                    const currentPrompt = prompts.find(p => p.id === node.prompt_id);
                                                                                    const currentContent = currentPrompt?.content || '';
                                                                                    const oldContent = ver.content || '';
                                                                                    return (
                                                                                        <div className="mt-2 p-3 rounded-lg bg-bg-primary border border-purple/20 animate-fade-in">
                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                <span className="text-[10px] font-bold text-purple uppercase tracking-wider">Comparing v{ver.version} → Current</span>
                                                                                                <button onClick={() => setComparingVersionId(null)} className="text-text-muted hover:text-text-primary">
                                                                                                    <X className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                <div>
                                                                                                    <p className="text-[9px] text-error font-bold mb-1">v{ver.version} (old)</p>
                                                                                                    <pre className="text-[10px] text-text-muted whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto font-mono p-2 rounded bg-error/5 border border-error/10">
                                                                                                        {oldContent}
                                                                                                    </pre>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="text-[9px] text-success font-bold mb-1">Current (v{node.ai_prompts?.version})</p>
                                                                                                    <pre className="text-[10px] text-text-muted whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto font-mono p-2 rounded bg-success/5 border border-success/10">
                                                                                                        {currentContent}
                                                                                                    </pre>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ── Integrity Check Panel ── */}
                            {nodes.length > 0 && (
                                <div className="mb-4">
                                    <button
                                        onClick={runIntegrityCheck}
                                        disabled={checkingIntegrity}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/20 hover:to-blue-500/20 transition-all disabled:opacity-50 w-full justify-center"
                                    >
                                        {checkingIntegrity ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="w-4 h-4" />
                                        )}
                                        Check Sequence Integrity
                                    </button>

                                    {showIntegrityCheck && Object.keys(integrityResults).length > 0 && (() => {
                                        const totalRules = Object.values(integrityResults).flat();
                                        const passing = totalRules.filter(r => r.pass).length;
                                        const total = totalRules.length;
                                        const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
                                        const allGood = passing === total;
                                        return (
                                            <div className="mt-3 rounded-xl border border-border bg-bg-elevated p-4 space-y-3 animate-fade-in">
                                                {/* Overall Score */}
                                                <div className="flex items-center gap-3">
                                                    <ShieldCheck className={`w-5 h-5 ${allGood ? 'text-success' : 'text-warning'}`} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold text-text-primary">
                                                                {passing}/{total} checks passing
                                                            </span>
                                                            <span className={`text-[10px] font-bold ${allGood ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-error'}`}>
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${allGood ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-error'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Per-node results */}
                                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                    {nodes.map(node => {
                                                        const results = integrityResults[node.id];
                                                        if (!results) {
                                                            return node.prompt_id ? null : (
                                                                <div key={node.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/20">
                                                                    <span className="text-xs">{node.emoji}</span>
                                                                    <span className="text-xs text-text-primary font-medium flex-1">{node.label}</span>
                                                                    <span className="text-[10px] text-warning font-semibold">⚠ No prompt linked</span>
                                                                </div>
                                                            );
                                                        }
                                                        const fails = results.filter(r => !r.pass);
                                                        return (
                                                            <div key={node.id} className="rounded-lg border border-border bg-bg-primary p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="text-xs">{node.emoji}</span>
                                                                    <span className="text-xs font-bold text-text-primary flex-1">{node.label}</span>
                                                                    {fails.length === 0 ? (
                                                                        <span className="text-[10px] text-success font-bold flex items-center gap-1">
                                                                            <CheckCircle2 className="w-3 h-3" /> All good
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-error font-bold">{fails.length} issue{fails.length > 1 ? 's' : ''}</span>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                                    {results.map(r => {
                                                                        const rule = INTEGRITY_RULES.find(rl => rl.id === r.ruleId)!;
                                                                        return (
                                                                            <div key={r.ruleId} className="flex items-center gap-1.5 text-[10px]">
                                                                                {r.pass ? (
                                                                                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                                                                                ) : (
                                                                                    <AlertTriangle className="w-3 h-3 text-error flex-shrink-0" />
                                                                                )}
                                                                                <span className={`flex-1 ${r.pass ? 'text-text-muted' : 'text-text-primary font-medium'}`}>
                                                                                    {rule.label}
                                                                                </span>
                                                                                {!r.pass && (
                                                                                    <button
                                                                                        onClick={() => handleFixRule(node.id, r.ruleId)}
                                                                                        disabled={fixingNodeId !== null}
                                                                                        className="px-2 py-0.5 rounded bg-accent-faded text-accent font-bold hover:bg-accent/20 transition-colors disabled:opacity-40"
                                                                                    >
                                                                                        {fixingNodeId === node.id ? '...' : 'Fix'}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Actions */}
                                                {!allGood && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                                        <button
                                                            onClick={handleFixAll}
                                                            disabled={fixingNodeId !== null}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-accent text-bg-primary hover:bg-accent/80 transition-colors disabled:opacity-50 flex-1 justify-center"
                                                        >
                                                            {fixingNodeId === 'all' ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                            )}
                                                            Fix All Issues ({totalRules.filter(r => !r.pass).length})
                                                        </button>
                                                        <button
                                                            onClick={runIntegrityCheck}
                                                            className="px-3 py-2 rounded-lg text-xs font-semibold border border-border text-text-muted hover:text-text-primary transition-colors"
                                                        >
                                                            Re-check
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Add Node */}
                            {
                                showAddNode ? (
                                    <div className="rounded-xl border border-accent/30 bg-bg-elevated p-4 space-y-3" >
                                        <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-accent" /> Add Node
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Step Key *</label>
                                                <input
                                                    type="text"
                                                    value={newNode.step_key}
                                                    onChange={e => setNewNode(p => ({ ...p, step_key: e.target.value }))}
                                                    placeholder="e.g. hpi"
                                                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Label *</label>
                                                <input
                                                    type="text"
                                                    value={newNode.label}
                                                    onChange={e => setNewNode(p => ({ ...p, label: e.target.value }))}
                                                    placeholder="e.g. Present Illness"
                                                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Emoji</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {EMOJI_OPTIONS.map(e => (
                                                        <button
                                                            key={e}
                                                            onClick={() => setNewNode(p => ({ ...p, emoji: e }))}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${newNode.emoji === e ? 'bg-accent-faded border border-accent/30' : 'bg-bg-tertiary hover:bg-bg-primary'
                                                                }`}
                                                        >
                                                            {e}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Linked Prompt</label>
                                                <select
                                                    value={newNode.prompt_id}
                                                    onChange={e => setNewNode(p => ({ ...p, prompt_id: e.target.value }))}
                                                    className="w-full bg-bg-primary border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                >
                                                    <option value="">—  None  —</option>
                                                    {prompts.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.prompt_type})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Pathway Condition</label>
                                                <select
                                                    value={newNode.pathway_condition}
                                                    onChange={e => setNewNode(p => ({ ...p, pathway_condition: e.target.value }))}
                                                    className="w-full bg-bg-primary border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                >
                                                    {PATHWAY_CONDITIONS.map(c => (
                                                        <option key={c.value} value={c.value}>{c.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Parent (Branch From)</label>
                                                <select
                                                    value={newNode.parent_node_id}
                                                    onChange={e => setNewNode(p => ({ ...p, parent_node_id: e.target.value }))}
                                                    className="w-full bg-bg-primary border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                                                >
                                                    <option value="">—  No parent  —</option>
                                                    {nodes.map(n => (
                                                        <option key={n.id} value={n.id}>{n.emoji} {n.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleAddNode} disabled={saving}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg-primary text-sm font-bold hover:bg-accent/80 transition-colors disabled:opacity-50">
                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                Add Node
                                            </button>
                                            <button onClick={() => setShowAddNode(false)}
                                                className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddNode(true)}
                                        className="w-full py-3 rounded-xl border border-dashed border-accent/30 text-accent text-sm font-semibold hover:bg-accent-faded/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add Section Node
                                    </button>
                                )}

                            {/* Flow visualization */}
                            {hasBranches && (
                                <div className="mt-6 pt-6 border-t border-border">
                                    <h3 className="text-sm font-bold text-text-primary mb-3">Flow Preview</h3>
                                    <div className="bg-bg-elevated rounded-xl border border-border p-4">
                                        {/* Linear nodes before pathway */}
                                        {linearNodes.filter(n => n.sort_order <= (pathwayNode?.sort_order ?? 0)).map(n => (
                                            <div key={n.id} className="flex items-center gap-2 mb-2">
                                                <span className="text-sm">{n.emoji}</span>
                                                <span className="text-xs text-text-primary font-medium">{n.label}</span>
                                                <div className="flex-1 border-t border-border/30" />
                                            </div>
                                        ))}
                                        {/* Branches */}
                                        {pathwayNode && (
                                            <div className="ml-4 pl-4 border-l-2 border-purple/30 space-y-3 my-2">
                                                {Object.entries(branchNodes).map(([key, bnodes]) => bnodes.length > 0 && (
                                                    <div key={key}>
                                                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${key === 'new_visit' ? 'text-blue-400' : key === 'follow_up' ? 'text-amber-400' : 'text-green-400'
                                                            }`}>
                                                            {key === 'new_visit' ? '🆕 New Visit' : key === 'follow_up' ? '🔄 Follow-up' : '💊 Refill'}
                                                        </span>
                                                        <div className="ml-2 mt-1 space-y-1">
                                                            {bnodes.map(n => (
                                                                <div key={n.id} className="flex items-center gap-2">
                                                                    <span className="text-xs">{n.emoji}</span>
                                                                    <span className="text-[10px] text-text-secondary">{n.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Linear nodes after branches */}
                                        {linearNodes.filter(n => n.sort_order > (pathwayNode?.sort_order ?? 999)).map(n => (
                                            <div key={n.id} className="flex items-center gap-2 mt-2">
                                                <span className="text-sm">{n.emoji}</span>
                                                <span className="text-xs text-text-primary font-medium">{n.label}</span>
                                                <div className="flex-1 border-t border-border/30" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <GitBranchPlus className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                            <p className="text-text-muted text-sm">Select or create a sequence to start building.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Clone Dialog Modal ────────── */}
            {showCloneDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-bg-elevated rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 p-6 max-w-md w-full mx-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Active Sequence</h3>
                                <p className="text-xs text-text-muted">This sequence is currently in production</p>
                            </div>
                        </div>

                        <p className="text-sm text-text-secondary leading-relaxed">
                            <strong className="text-amber-400">&ldquo;{selectedSeq?.name}&rdquo;</strong> is currently being used by patients.
                            Editing it directly will affect live consultations immediately.
                        </p>

                        <div className="space-y-2 pt-2">
                            <button
                                onClick={handleCloneAndEdit}
                                disabled={cloning}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-accent to-teal-400 text-bg-primary hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(45,212,191,0.3)] transition-all duration-300 disabled:opacity-50"
                            >
                                {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                Clone & Edit Draft
                            </button>
                            <button
                                onClick={handleEditAnyway}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                                <Edit3 className="w-4 h-4" />
                                Edit Anyway (I understand the risk)
                            </button>
                            <button
                                onClick={handleCancelCloneDialog}
                                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-xs text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
