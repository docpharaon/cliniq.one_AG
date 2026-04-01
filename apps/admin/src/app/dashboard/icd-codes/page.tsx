import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import {
    Search, Plus, Edit3, ToggleLeft, ToggleRight,
    ClipboardList, Activity, CheckCircle2, X,
    ChevronLeft, ChevronRight, Loader2, Stethoscope,
    Brain, Heart,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchIcdCodes,
    fetchIcdCodeStats,
    addIcdCode,
    editIcdCode,
    toggleIcdCode,
} from '@/lib/actions';

type IcdRow = {
    id: string;
    code: string;
    description: string;
    description_ar: string;
    category: string;
    specialty_tags: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type IcdStats = {
    total: number;
    active: number;
    inactive: number;
    bySpecialty: Record<string, number>;
};

const SPECIALTY_OPTIONS = [
    { key: 'all', label: 'All Specialties' },
    { key: 'dermatology', label: 'Dermatology', icon: '🩺' },
    { key: 'family_medicine', label: 'Family Medicine', icon: '🏥' },
    { key: 'psychiatry', label: 'Psychiatry', icon: '🧠' },
];

const SPECIALTY_LABELS: Record<string, string> = {
    dermatology: 'Dermatology',
    family_medicine: 'Family Medicine',
    psychiatry: 'Psychiatry',
};

const SPECIALTY_COLORS: Record<string, string> = {
    dermatology: 'bg-rose-500/15 text-rose-400',
    family_medicine: 'bg-emerald-500/15 text-emerald-400',
    psychiatry: 'bg-violet-500/15 text-violet-400',
};

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Modal ────────────────────────────────

function IcdCodeModal({
    editData,
    onClose,
    onSave,
}: {
    editData: IcdRow | null;
    onClose: () => void;
    onSave: (data: Partial<IcdRow>) => void;
}) {
    const isEdit = !!editData;
    const [code, setCode] = useState(editData?.code || '');
    const [description, setDescription] = useState(editData?.description || '');
    const [descriptionAr, setDescriptionAr] = useState(editData?.description_ar || '');
    const [category, setCategory] = useState(editData?.category || '');
    const [specialtyTags, setSpecialtyTags] = useState<string[]>(editData?.specialty_tags || []);
    const [isActive, setIsActive] = useState(editData?.is_active ?? true);
    const [saving, setSaving] = useState(false);

    function toggleTag(tag: string) {
        setSpecialtyTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim() || !description.trim()) return;
        setSaving(true);
        await onSave({
            code: code.trim().toUpperCase(),
            description: description.trim(),
            description_ar: descriptionAr.trim(),
            category: category.trim(),
            specialty_tags: specialtyTags,
            is_active: isActive,
        });
        setSaving(false);
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[60]" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-lg bg-bg-primary border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-text-primary">
                        {isEdit ? 'Edit ICD Code' : 'Add ICD Code'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Code */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">ICD-10 Code *</label>
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="e.g. L70.0"
                            className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all font-mono"
                            required
                        />
                    </div>

                    {/* Description EN */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Description (English) *</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Acne vulgaris"
                            className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            required
                        />
                    </div>

                    {/* Description AR */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Description (Arabic)</label>
                        <input
                            type="text"
                            value={descriptionAr}
                            onChange={e => setDescriptionAr(e.target.value)}
                            placeholder="e.g. حب الشباب الشائع"
                            dir="rtl"
                            className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="e.g. Diseases of the skin"
                            className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                        />
                    </div>

                    {/* Specialty Tags */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-2">Specialties</label>
                        <div className="flex flex-wrap gap-2">
                            {['dermatology', 'family_medicine', 'psychiatry'].map(spec => (
                                <button
                                    key={spec}
                                    type="button"
                                    onClick={() => toggleTag(spec)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${specialtyTags.includes(spec)
                                        ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                        : 'bg-bg-elevated text-text-muted border border-border hover:border-accent/50'
                                        }`}
                                >
                                    {SPECIALTY_LABELS[spec] || spec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                            className="w-4 h-4 accent-accent cursor-pointer"
                        />
                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Active</span>
                    </label>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !code.trim() || !description.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isEdit ? 'Save Changes' : 'Add Code'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ── Page ─────────────────────────────────

export default function IcdCodesPage() {
    const [codes, setCodes] = useState<IcdRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<IcdStats>({ total: 0, active: 0, inactive: 0, bySpecialty: {} });
    const [search, setSearch] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('all');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<IcdRow | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const loadData = useCallback(() => {
        setLoading(true);
        fetchIcdCodes(page, perPage, search.trim() || undefined, specialtyFilter !== 'all' ? specialtyFilter : undefined)
            .then(({ data, count }) => {
                setCodes(data as IcdRow[]);
                setTotalCount(count);
                setLoading(false);
            });
    }, [page, search, specialtyFilter]);

    const loadStats = useCallback(() => {
        fetchIcdCodeStats().then(s => setStats(s as IcdStats));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadStats(); }, [loadStats]);

    function handleSearchChange(val: string) {
        setSearch(val);
        setPage(1);
    }

    function handleSpecialtyChange(key: string) {
        setSpecialtyFilter(key);
        setPage(1);
    }

    function openAdd() {
        setEditTarget(null);
        setModalOpen(true);
    }

    function openEdit(row: IcdRow) {
        setEditTarget(row);
        setModalOpen(true);
    }

    async function handleSave(data: Partial<IcdRow>) {
        if (editTarget) {
            await editIcdCode(editTarget.id, data);
        } else {
            await addIcdCode(data as { code: string; description: string; description_ar?: string; category?: string; specialty_tags?: string[]; is_active?: boolean });
        }
        setModalOpen(false);
        setEditTarget(null);
        loadData();
        loadStats();
    }

    async function handleToggle(row: IcdRow) {
        setToggling(row.id);
        await toggleIcdCode(row.id, !row.is_active);
        setToggling(null);
        loadData();
        loadStats();
    }

    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <>
            <Header title="ICD-10 Codes" subtitle="Manage the standardized diagnosis code library" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard label="Total Codes" value={stats.total} icon={ClipboardList} />
                    <StatCard label="Active" value={stats.active} icon={CheckCircle2} iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard label="Dermatology" value={stats.bySpecialty?.dermatology ?? 0} icon={Stethoscope} iconColor="text-rose-400" iconBg="bg-rose-500/10" />
                    <StatCard label="Family Medicine" value={stats.bySpecialty?.family_medicine ?? 0} icon={Heart} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
                    <StatCard label="Psychiatry" value={stats.bySpecialty?.psychiatry ?? 0} icon={Brain} iconColor="text-violet-400" iconBg="bg-violet-500/10" />
                </div>

                {/* ── Main Table Card ── */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                    {/* Table Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Disease Code Library</h2>
                            <p className="text-sm text-text-muted mt-0.5">{totalCount} codes</p>
                        </div>
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:bg-accent/90 transition-colors shadow-[0_2px_8px_rgba(45,212,191,0.3)]"
                        >
                            <Plus className="w-4 h-4" />
                            Add Code
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 py-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Search by code or description..."
                                className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                            />
                        </div>

                        {/* Specialty tabs */}
                        <div className="flex items-center gap-1">
                            {SPECIALTY_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => handleSpecialtyChange(opt.key)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${specialtyFilter === opt.key
                                        ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                        : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                        }`}
                                >
                                    {opt.icon ? `${opt.icon} ` : ''}{opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Code</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Description</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated hidden md:table-cell">Arabic</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Specialties</th>
                                            <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Status</th>
                                            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codes.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12 text-text-muted text-sm">
                                                    {search.trim() ? 'No codes match your search' : 'No ICD codes found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            codes.map(row => (
                                                <tr key={row.id} className="group">
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                        <span className="font-mono text-sm font-bold text-accent">{row.code}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <span className="font-medium text-text-primary">{row.description}</span>
                                                        <span className="block text-xs text-text-muted mt-0.5">{row.category}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors hidden md:table-cell">
                                                        <span className="text-text-secondary text-sm" dir="rtl">{row.description_ar || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.specialty_tags?.map(tag => (
                                                                <span key={tag} className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold ${SPECIALTY_COLORS[tag] || 'bg-bg-elevated text-text-muted'}`}>
                                                                    {SPECIALTY_LABELS[tag] || tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${row.is_active
                                                            ? 'bg-success-faded text-success'
                                                            : 'bg-bg-elevated text-text-muted'
                                                            }`}>
                                                            {row.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => openEdit(row)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors font-medium"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggle(row)}
                                                                disabled={toggling === row.id}
                                                                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors font-medium ${row.is_active
                                                                    ? 'text-warning hover:bg-warning-faded'
                                                                    : 'text-success hover:bg-success-faded'
                                                                    }`}
                                                            >
                                                                {toggling === row.id ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : row.is_active ? (
                                                                    <ToggleRight className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <ToggleLeft className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <span className="text-sm text-text-secondary font-medium">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Add/Edit Modal ── */}
            {modalOpen && (
                <IcdCodeModal
                    editData={editTarget}
                    onClose={() => { setModalOpen(false); setEditTarget(null); }}
                    onSave={handleSave}
                />
            )}
        </>
    );
}
