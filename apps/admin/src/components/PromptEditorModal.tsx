import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, AlertTriangle, Loader2, History, RotateCcw, ChevronDown, ChevronUp, Clock, Sparkles, Check, Columns } from 'lucide-react';
import { createPrompt, updatePrompt, deletePrompt, fetchPromptVersions, rollbackToVersion } from '@/lib/actions';
import { callAdminApi } from '@/lib/admin-api';

// ── Types ─────────────────────────────────
type PromptData = {
    id?: string;
    name: string;
    specialty: string;
    prompt_type: string;
    content: string;
    is_active: boolean;
    version?: number;
};

type VersionRow = {
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

type Props = {
    mode: 'create' | 'edit';
    initial?: PromptData | null;
    onClose: () => void;
    onSaved: () => void;
};

const SPECIALTIES = [
    { value: 'general', label: 'General' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'family_medicine', label: 'Family Medicine' },
    { value: 'pediatrics', label: 'Pediatrics' },
    { value: 'psychiatry', label: 'Psychiatry' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'diet', label: 'Diet & Nutrition' },
];

const PROMPT_TYPES = [
    { value: 'system', label: 'System', color: 'text-blue-400' },
    { value: 'intake', label: 'Intake', color: 'text-emerald-400' },
    { value: 'summary', label: 'Summary', color: 'text-amber-400' },
    { value: 'triage', label: 'Triage', color: 'text-gray-400' },
    { value: 'global_guard', label: 'Global Guard', color: 'text-red-400' },
    { value: 'locum_greeting', label: 'Locum Greeting', color: 'text-purple-400' },
];

// ── Component ─────────────────────────────
export default function PromptEditorModal({ mode, initial, onClose, onSaved }: Props) {
    const [form, setForm] = useState<PromptData>({
        name: '',
        specialty: 'general',
        prompt_type: 'system',
        content: '',
        is_active: true,
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Version history state
    const [showHistory, setShowHistory] = useState(false);
    const [versions, setVersions] = useState<VersionRow[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
    const [rollingBack, setRollingBack] = useState<string | null>(null);
    const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

    // AI Improve state
    const [improving, setImproving] = useState(false);
    const [improvedContent, setImprovedContent] = useState<string | null>(null);
    const [improveError, setImproveError] = useState('');

    // Split-screen preview
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        if (mode === 'edit' && initial) {
            setForm({
                id: initial.id,
                name: initial.name,
                specialty: initial.specialty,
                prompt_type: initial.prompt_type,
                content: initial.content,
                is_active: initial.is_active,
                version: initial.version,
            });
        }
    }, [mode, initial]);

    function updateField<K extends keyof PromptData>(key: K, value: PromptData[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    }

    async function loadVersions() {
        if (!form.id) return;
        setLoadingVersions(true);
        const data = await fetchPromptVersions(form.id);
        setVersions(data as VersionRow[]);
        setLoadingVersions(false);
    }

    async function handleToggleHistory() {
        if (!showHistory) {
            await loadVersions();
        }
        setShowHistory(!showHistory);
    }

    async function handleRollback(versionId: string) {
        if (!form.id) return;
        setRollingBack(versionId);
        setError('');
        try {
            const res = await rollbackToVersion(form.id, versionId);
            if (res.error) throw new Error(res.error);
            setSuccess(`Rolled back! Now at v${res.data?.version}`);
            // Update form with rolled-back data
            if (res.data) {
                setForm({
                    id: res.data.id,
                    name: res.data.name,
                    specialty: res.data.specialty,
                    prompt_type: res.data.prompt_type,
                    content: res.data.content,
                    is_active: res.data.is_active,
                    version: res.data.version,
                });
            }
            // Reload versions
            await loadVersions();
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to rollback');
        }
        setRollingBack(null);
    }

    async function handleSave() {
        if (!form.name.trim()) { setError('Prompt name is required'); return; }
        if (!form.content.trim()) { setError('Prompt content is required'); return; }

        setSaving(true);
        setError('');
        try {
            if (mode === 'create') {
                const res = await createPrompt({
                    name: form.name,
                    specialty: form.specialty,
                    prompt_type: form.prompt_type,
                    content: form.content,
                    is_active: form.is_active,
                });
                if (res.error) throw new Error(res.error);
                setSuccess('Prompt created successfully!');
            } else {
                if (!form.id) throw new Error('Missing prompt ID');
                const res = await updatePrompt(form.id, {
                    name: form.name,
                    specialty: form.specialty,
                    prompt_type: form.prompt_type,
                    content: form.content,
                    is_active: form.is_active,
                });
                if (res.error) throw new Error(res.error);
                setSuccess('Prompt updated! Version incremented.');
            }
            setTimeout(() => { onSaved(); onClose(); }, 600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!form.id) return;
        setDeleting(true);
        try {
            const res = await deletePrompt(form.id);
            if (res.error) throw new Error(res.error);
            setSuccess('Prompt deleted.');
            setTimeout(() => { onSaved(); onClose(); }, 600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
        setDeleting(false);
    }

    async function handleImproveWithAI() {
        if (!form.content.trim()) { setImproveError('Write some prompt content first'); return; }
        setImproving(true);
        setImproveError('');
        setImprovedContent(null);
        try {
            const data = await callAdminApi<{ improved: string }>('improve-prompt', {
                content: form.content,
                promptType: form.prompt_type,
            });
            if (!data.improved?.trim()) throw new Error('AI returned empty result');
            setImprovedContent(data.improved);
        } catch (err) {
            setImproveError(err instanceof Error ? err.message : 'Failed to improve prompt');
        }
        setImproving(false);
    }

    function handleApplyImprovement() {
        if (improvedContent) {
            updateField('content', improvedContent);
            setImprovedContent(null);
        }
    }

    const charCount = form.content.length;

    // Compute simple diff: lines added/removed between current content and a version
    function computeDiff(oldContent: string, newContent: string) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const maxLen = Math.max(oldLines.length, newLines.length);
        const result: { type: 'same' | 'added' | 'removed'; text: string }[] = [];

        for (let i = 0; i < maxLen; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (oldLine === newLine) {
                result.push({ type: 'same', text: oldLine ?? '' });
            } else {
                if (oldLine !== undefined) result.push({ type: 'removed', text: oldLine });
                if (newLine !== undefined) result.push({ type: 'added', text: newLine });
            }
        }
        return result;
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                style={{ pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-[1200px] max-h-[92vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in"
                style={{
                    pointerEvents: 'auto',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FA 100%)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
                }}
            >
                {/* ── Header ──────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent-faded flex items-center justify-center">
                            {mode === 'create' ? (
                                <Plus className="w-5 h-5 text-accent" />
                            ) : (
                                <Save className="w-5 h-5 text-accent" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">
                                {mode === 'create' ? 'New AI Prompt' : 'Edit Prompt'}
                            </h3>
                            {mode === 'edit' && form.version && (
                                <p className="text-xs text-text-muted">
                                    Current version: <span className="text-purple font-bold">v{form.version}</span>
                                    {' '}— saving will create <span className="text-accent font-bold">v{form.version + 1}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'edit' && (
                            <button
                                onClick={handleToggleHistory}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${showHistory
                                    ? 'bg-purple-faded text-purple border border-purple/30'
                                    : 'bg-bg-tertiary text-text-muted hover:text-purple hover:bg-purple-faded'
                                    }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                History
                            </button>
                        )}
                        {!showHistory && (
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${showPreview
                                    ? 'bg-accent-faded text-accent border border-accent/30'
                                    : 'bg-bg-tertiary text-text-muted hover:text-accent hover:bg-accent-faded'
                                    }`}
                            >
                                <Columns className="w-3.5 h-3.5" />
                                Preview
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Body ────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex h-full">
                        {/* Main Editor */}
                        <div className={`flex-1 px-6 py-5 space-y-5 ${(showHistory || showPreview) ? 'border-r border-border' : ''}`}>
                            {/* Row 1: Name */}
                            <div>
                                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">
                                    Prompt Name <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    placeholder="e.g. Medical Intake — General"
                                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                                />
                            </div>

                            {/* Row 2: Specialty + Type + Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">
                                        Specialty
                                    </label>
                                    <select
                                        value={form.specialty}
                                        onChange={e => updateField('specialty', e.target.value)}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all appearance-none cursor-pointer"
                                    >
                                        {SPECIALTIES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">
                                        Type
                                    </label>
                                    <select
                                        value={form.prompt_type}
                                        onChange={e => updateField('prompt_type', e.target.value)}
                                        className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all appearance-none cursor-pointer"
                                    >
                                        {PROMPT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">
                                        Status
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => updateField('is_active', !form.is_active)}
                                        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold border transition-all ${form.is_active
                                            ? 'bg-success-faded border-success/30 text-success'
                                            : 'bg-bg-elevated border-border text-text-muted'
                                            }`}
                                    >
                                        {form.is_active ? '● Active' : '○ Disabled'}
                                    </button>
                                </div>
                            </div>

                            {/* Row 3: Content Editor */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Prompt Content <span className="text-error">*</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-text-muted font-mono">{charCount.toLocaleString()} chars</span>
                                        <button
                                            type="button"
                                            onClick={handleImproveWithAI}
                                            disabled={improving || !form.content.trim()}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple/30 text-purple hover:from-purple-500/30 hover:to-blue-500/30 hover:border-purple/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {improving ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                            {improving ? 'Improving…' : 'Improve with AI'}
                                        </button>
                                    </div>
                                </div>

                                {improveError && (
                                    <div className="mb-2 px-3 py-2 rounded-lg bg-error-faded border border-error/20 text-xs text-error">
                                        {improveError}
                                    </div>
                                )}

                                {/* AI Improvement Diff Preview */}
                                {improvedContent && (
                                    <div className="mb-3 rounded-xl border border-purple/30 bg-[#0D1117] overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-2 bg-purple-faded/30 border-b border-purple/20">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-purple" />
                                                <span className="text-xs font-bold text-purple">AI Suggestion</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={handleApplyImprovement}
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/20 border border-success/30 text-success text-[11px] font-semibold hover:bg-success/30 transition-colors"
                                                >
                                                    <Check className="w-3 h-3" /> Apply
                                                </button>
                                                <button
                                                    onClick={() => setImprovedContent(null)}
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-tertiary border border-border text-text-muted text-[11px] font-semibold hover:text-text-primary transition-colors"
                                                >
                                                    <X className="w-3 h-3" /> Dismiss
                                                </button>
                                            </div>
                                        </div>
                                        <div className="max-h-[250px] overflow-y-auto p-3">
                                            {computeDiff(form.content, improvedContent).map((line, i) => (
                                                <div
                                                    key={i}
                                                    className={`text-[11px] font-mono leading-relaxed px-1 ${line.type === 'added'
                                                        ? 'bg-emerald-500/10 text-emerald-300'
                                                        : line.type === 'removed'
                                                            ? 'bg-red-500/10 text-red-300 line-through'
                                                            : 'text-text-muted'
                                                        }`}
                                                >
                                                    {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                                                    {line.text || ' '}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    value={form.content}
                                    onChange={e => updateField('content', e.target.value)}
                                    placeholder="You are a medical intake AI assistant for cliniq.one..."
                                    rows={14}
                                    className="w-full bg-[#0D1117] border border-border rounded-xl px-4 py-3 text-sm text-emerald-300 placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all resize-y leading-relaxed"
                                    style={{ fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace', tabSize: 4 }}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* ── Version History Panel ──────── */}
                        {showHistory && (
                            <div className="w-[340px] flex-shrink-0 overflow-y-auto px-4 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <History className="w-4 h-4 text-purple" />
                                    <h4 className="text-sm font-bold text-text-primary">Version History</h4>
                                </div>

                                {loadingVersions ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                    </div>
                                ) : versions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                                        <p className="text-xs text-text-muted">No previous versions yet.</p>
                                        <p className="text-[10px] text-text-muted mt-1">Versions are saved automatically when you edit.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {versions.map(v => {
                                            const isExpanded = expandedVersionId === v.id;
                                            const showDiff = diffVersionId === v.id;
                                            const diff = showDiff ? computeDiff(v.content, form.content) : null;

                                            return (
                                                <div
                                                    key={v.id}
                                                    className="rounded-xl border border-border bg-bg-elevated overflow-hidden transition-all"
                                                >
                                                    {/* Version header */}
                                                    <button
                                                        onClick={() => setExpandedVersionId(isExpanded ? null : v.id)}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-purple font-bold text-xs">v{v.version}</span>
                                                                <span className="text-[10px] text-text-muted">
                                                                    {new Date(v.created_at).toLocaleString(undefined, {
                                                                        month: 'short', day: 'numeric',
                                                                        hour: '2-digit', minute: '2-digit',
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[200px]">{v.name}</p>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                                                        ) : (
                                                            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                                                        )}
                                                    </button>

                                                    {/* Expanded details */}
                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 border-t border-border/50">
                                                            {/* Meta */}
                                                            <div className="flex gap-2 mt-2 mb-2">
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">{v.prompt_type}</span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-faded text-accent capitalize">{v.specialty}</span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${v.is_active ? 'bg-success-faded text-success' : 'bg-bg-tertiary text-text-muted'}`}>
                                                                    {v.is_active ? 'Active' : 'Disabled'}
                                                                </span>
                                                            </div>

                                                            {/* Content preview or diff */}
                                                            {showDiff && diff ? (
                                                                <div className="bg-[#0D1117] rounded-lg p-2 mb-2 max-h-[200px] overflow-y-auto">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Diff: v{v.version} → v{form.version}</span>
                                                                        <button
                                                                            onClick={() => setDiffVersionId(null)}
                                                                            className="text-[9px] text-purple hover:text-purple/80"
                                                                        >
                                                                            Show preview
                                                                        </button>
                                                                    </div>
                                                                    {diff.map((line, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className={`text-[10px] font-mono leading-relaxed px-1 ${line.type === 'added'
                                                                                ? 'bg-emerald-500/10 text-emerald-300'
                                                                                : line.type === 'removed'
                                                                                    ? 'bg-red-500/10 text-red-300 line-through'
                                                                                    : 'text-text-muted'
                                                                                }`}
                                                                        >
                                                                            {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                                                                            {line.text || ' '}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-[#0D1117] rounded-lg p-2 mb-2 max-h-[150px] overflow-y-auto">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Content preview</span>
                                                                        <button
                                                                            onClick={() => setDiffVersionId(v.id)}
                                                                            className="text-[9px] text-purple hover:text-purple/80"
                                                                        >
                                                                            Show diff
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[10px] text-emerald-300/70 font-mono whitespace-pre-wrap leading-relaxed">
                                                                        {v.content.slice(0, 500)}{v.content.length > 500 ? '…' : ''}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Actions */}
                                                            <button
                                                                onClick={() => handleRollback(v.id)}
                                                                disabled={rollingBack === v.id}
                                                                className="flex items-center gap-1.5 w-full justify-center px-3 py-2 rounded-lg bg-purple-faded text-purple text-xs font-semibold hover:bg-purple/20 transition-colors disabled:opacity-50"
                                                            >
                                                                {rollingBack === v.id ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="w-3 h-3" />
                                                                )}
                                                                Rollback to v{v.version}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Live Preview Panel ──────── */}
                        {!showHistory && showPreview && (
                            <div className="w-[380px] flex-shrink-0 overflow-y-auto px-5 py-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Columns className="w-4 h-4 text-accent" />
                                    <h4 className="text-sm font-bold text-text-primary">Live Preview</h4>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-semibold ${PROMPT_TYPES.find(t => t.value === form.prompt_type)?.color || 'text-text-muted'} bg-bg-tertiary`}>
                                        {form.prompt_type}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center px-2 py-2 rounded-lg bg-bg-elevated border border-border">
                                        <p className="text-[10px] text-text-muted">Chars</p>
                                        <p className="text-sm font-bold text-text-primary">{form.content.length.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center px-2 py-2 rounded-lg bg-bg-elevated border border-border">
                                        <p className="text-[10px] text-text-muted">Words</p>
                                        <p className="text-sm font-bold text-text-primary">{form.content.trim() ? form.content.trim().split(/\s+/).length.toLocaleString() : '0'}</p>
                                    </div>
                                    <div className="text-center px-2 py-2 rounded-lg bg-bg-elevated border border-border">
                                        <p className="text-[10px] text-text-muted">Lines</p>
                                        <p className="text-sm font-bold text-text-primary">{form.content ? form.content.split('\n').length : 0}</p>
                                    </div>
                                </div>

                                {/* Formatted preview */}
                                <div className="bg-[#0D1117] rounded-xl p-4 border border-border max-h-[calc(100%-110px)] overflow-y-auto">
                                    {!form.content.trim() ? (
                                        <p className="text-xs text-text-muted italic text-center py-8">Start typing to see a live preview&hellip;</p>
                                    ) : (
                                        <div className="text-[11px] font-mono text-emerald-300/80 whitespace-pre-wrap leading-relaxed">
                                            {form.content.split('\n').map((line, i) => (
                                                <div key={i} className="flex">
                                                    <span className="text-text-muted/30 select-none w-6 text-right mr-3 flex-shrink-0 text-[9px] leading-relaxed">{i + 1}</span>
                                                    <span>{line || '\u00A0'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ──────────────────────── */}
                <div className="px-6 py-4 border-t border-border bg-bg-secondary/30 flex items-center justify-between">
                    {/* Left: Delete */}
                    <div>
                        {mode === 'edit' && !showDeleteConfirm && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-error hover:bg-error-faded transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        )}
                        {showDeleteConfirm && (
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning" />
                                <span className="text-xs text-warning font-medium">Are you sure?</span>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-muted text-xs hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Save / Cancel */}
                    <div className="flex items-center gap-3">
                        {/* Toast feedback */}
                        {error && (
                            <span className="text-xs text-error font-medium max-w-[200px] truncate">{error}</span>
                        )}
                        {success && (
                            <span className="text-xs text-success font-medium">{success}</span>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {mode === 'create' ? 'Create Prompt' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scale-in animation */}
            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
