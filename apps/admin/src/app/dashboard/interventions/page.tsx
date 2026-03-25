'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchInterventions,
    fetchInterventionStats,
    fetchServiceCatalog,
    fetchServiceProviders,
    addServiceCatalogItem,
    editServiceCatalogItem,
    removeServiceCatalogItem,
    addServiceProvider,
    editServiceProvider,
    removeServiceProvider,
} from '@/lib/actions';
import {
    ClipboardList,
    Clock,
    CheckCircle2,
    XCircle,
    FlaskConical,
    ScanLine,
    UserCheck,
    Dumbbell,
    Home,
    CalendarClock,
    Plus,
    Building2,
    MapPin,
    Star,
    Phone,
    Globe,
    BadgeCheck,
    BarChart3,
    TrendingUp,
    Activity,
    X,
    Pencil,
    Trash2,
} from 'lucide-react';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

type TabId = 'overview' | 'catalog' | 'providers' | 'analytics';

type InterventionRow = {
    id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    category: string;
    patient_id: string;
    doctor_id: string;
    estimated_cost_sar: number | null;
    created_at: string;
};

type CatalogRow = {
    id: string;
    name: string;
    name_ar: string;
    category: string;
    subcategory: string | null;
    type: string;
    sample_required: string | null;
    fasting_required: boolean;
    avg_cost_sar: number | null;
    avg_turnaround_days: number | null;
    is_active: boolean;
    created_at: string;
};

type ProviderRow = {
    id: string;
    name: string;
    name_ar: string;
    type: string;
    city: string;
    phone: string | null;
    email: string | null;
    rating_avg: number;
    rating_count: number;
    is_active: boolean;
    is_verified: boolean;
    home_collection_available: boolean;
    created_at: string;
};

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'catalog', label: 'Service Catalog', icon: FlaskConical },
    { id: 'providers', label: 'Provider Network', icon: Building2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const typeIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    lab_test: { icon: FlaskConical, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    imaging: { icon: ScanLine, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    referral: { icon: UserCheck, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    therapy: { icon: Dumbbell, color: 'text-green-400', bg: 'bg-green-400/10' },
    home_health: { icon: Home, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    follow_up: { icon: CalendarClock, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
};

const typeLabels: Record<string, string> = {
    lab_test: 'Lab Test',
    imaging: 'Imaging',
    referral: 'Referral',
    therapy: 'Therapy',
    home_health: 'Home Health',
    follow_up: 'Follow-up',
};

const providerTypeLabels: Record<string, string> = {
    lab: 'Laboratory',
    imaging_center: 'Imaging Center',
    specialist: 'Specialist',
    therapy_center: 'Therapy Center',
    home_health: 'Home Health',
};

const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    ordered: 'warning',
    pending_auth: 'warning',
    authorized: 'info',
    scheduled: 'info',
    in_progress: 'info',
    completed: 'success',
    results_ready: 'success',
    reviewed: 'success',
    cancelled: 'error',
};

// ──────────────────────────────────────────
// Intervention Overview Columns
// ──────────────────────────────────────────

const interventionColumns = [
    {
        key: 'title',
        label: 'Intervention',
        render: (row: InterventionRow) => {
            const typeInfo = typeIcons[row.type] || typeIcons.lab_test;
            const Icon = typeInfo.icon;
            return (
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary text-sm">{row.title}</p>
                        <p className="text-xs text-text-muted">{row.category}</p>
                    </div>
                </div>
            );
        },
    },
    {
        key: 'type',
        label: 'Type',
        render: (row: InterventionRow) => (
            <span className="text-sm text-accent capitalize">{typeLabels[row.type] || row.type}</span>
        ),
    },
    {
        key: 'priority',
        label: 'Priority',
        render: (row: InterventionRow) => (
            <StatusBadge
                label={row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                variant={row.priority === 'stat' ? 'error' : row.priority === 'urgent' ? 'warning' : 'neutral'}
            />
        ),
    },
    {
        key: 'status',
        label: 'Status',
        render: (row: InterventionRow) => (
            <StatusBadge
                label={row.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                variant={statusMap[row.status] ?? 'neutral'}
            />
        ),
    },
    {
        key: 'estimated_cost_sar',
        label: 'Est. Cost',
        render: (row: InterventionRow) => (
            <span className="text-sm text-text-secondary">
                {row.estimated_cost_sar ? `${row.estimated_cost_sar} SAR` : '—'}
            </span>
        ),
    },
    {
        key: 'created_at',
        label: 'Ordered',
        render: (row: InterventionRow) => (
            <span className="text-sm text-text-secondary">
                {new Date(row.created_at).toLocaleDateString()}
            </span>
        ),
    },
];

// ──────────────────────────────────────────
// Service Catalog Columns
// ──────────────────────────────────────────

const catalogColumns = (onEdit: (row: CatalogRow) => void, onDelete: (id: string) => void) => [
    {
        key: 'name',
        label: 'Service',
        render: (row: CatalogRow) => {
            const typeInfo = typeIcons[row.type] || typeIcons.lab_test;
            const Icon = typeInfo.icon;
            return (
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary text-sm">{row.name}</p>
                        <p className="text-xs text-text-muted">{row.name_ar}</p>
                    </div>
                </div>
            );
        },
    },
    {
        key: 'category',
        label: 'Category',
        render: (row: CatalogRow) => (
            <div>
                <span className="text-sm text-text-primary">{row.category}</span>
                {row.subcategory && (
                    <span className="text-xs text-text-muted block">{row.subcategory}</span>
                )}
            </div>
        ),
    },
    {
        key: 'type',
        label: 'Type',
        render: (row: CatalogRow) => (
            <span className="text-sm text-accent capitalize">{typeLabels[row.type] || row.type}</span>
        ),
    },
    {
        key: 'details',
        label: 'Details',
        render: (row: CatalogRow) => (
            <div className="text-xs space-y-0.5">
                {row.sample_required && (
                    <p className="text-text-muted">Sample: {row.sample_required}</p>
                )}
                {row.fasting_required && (
                    <p className="text-warning">⚠ Fasting required</p>
                )}
            </div>
        ),
    },
    {
        key: 'avg_cost_sar',
        label: 'Avg Cost',
        render: (row: CatalogRow) => (
            <span className="text-sm text-text-secondary">
                {row.avg_cost_sar ? `${row.avg_cost_sar} SAR` : '—'}
            </span>
        ),
    },
    {
        key: 'is_active',
        label: 'Status',
        render: (row: CatalogRow) => (
            <StatusBadge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'neutral'} />
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: CatalogRow) => (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onEdit(row)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-accent transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(row.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ),
    },
];

// ──────────────────────────────────────────
// Provider Columns
// ──────────────────────────────────────────

const providerColumns = (onEdit: (row: ProviderRow) => void, onDelete: (id: string) => void) => [
    {
        key: 'name',
        label: 'Provider',
        render: (row: ProviderRow) => (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                    <p className="font-semibold text-text-primary text-sm">{row.name}</p>
                    <p className="text-xs text-text-muted">{row.name_ar}</p>
                </div>
            </div>
        ),
    },
    {
        key: 'type',
        label: 'Type',
        render: (row: ProviderRow) => (
            <span className="text-sm text-accent capitalize">{providerTypeLabels[row.type] || row.type}</span>
        ),
    },
    {
        key: 'city',
        label: 'Location',
        render: (row: ProviderRow) => (
            <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-sm text-text-secondary">{row.city}</span>
            </div>
        ),
    },
    {
        key: 'phone',
        label: 'Contact',
        render: (row: ProviderRow) => (
            <div className="text-xs space-y-0.5">
                {row.phone && (
                    <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-text-muted" />
                        <span className="text-text-secondary">{row.phone}</span>
                    </div>
                )}
                {row.email && (
                    <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-text-muted" />
                        <span className="text-text-secondary">{row.email}</span>
                    </div>
                )}
            </div>
        ),
    },
    {
        key: 'rating_avg',
        label: 'Rating',
        render: (row: ProviderRow) => (
            <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm text-text-primary font-medium">{row.rating_avg.toFixed(1)}</span>
                <span className="text-xs text-text-muted">({row.rating_count})</span>
            </div>
        ),
    },
    {
        key: 'is_verified',
        label: 'Verified',
        render: (row: ProviderRow) => (
            <div className="flex items-center gap-2">
                {row.is_verified ? (
                    <BadgeCheck className="w-4 h-4 text-success" />
                ) : (
                    <XCircle className="w-4 h-4 text-text-muted" />
                )}
                <StatusBadge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'neutral'} />
            </div>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: ProviderRow) => (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onEdit(row)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-accent transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(row.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ),
    },
];

// ──────────────────────────────────────────
// Catalog Modal
// ──────────────────────────────────────────

function CatalogModal({
    isOpen,
    onClose,
    onSave,
    initial,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initial?: CatalogRow | null;
}) {
    const [form, setForm] = useState({
        name: initial?.name ?? '',
        name_ar: initial?.name_ar ?? '',
        category: initial?.category ?? '',
        subcategory: initial?.subcategory ?? '',
        type: initial?.type ?? 'lab_test',
        sample_required: initial?.sample_required ?? '',
        fasting_required: initial?.fasting_required ?? false,
        avg_cost_sar: initial?.avg_cost_sar?.toString() ?? '',
        avg_turnaround_days: initial?.avg_turnaround_days?.toString() ?? '',
        is_active: initial?.is_active ?? true,
        description: '',
        description_ar: '',
    });

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.name,
                name_ar: initial.name_ar,
                category: initial.category,
                subcategory: initial.subcategory ?? '',
                type: initial.type,
                sample_required: initial.sample_required ?? '',
                fasting_required: initial.fasting_required,
                avg_cost_sar: initial.avg_cost_sar?.toString() ?? '',
                avg_turnaround_days: initial.avg_turnaround_days?.toString() ?? '',
                is_active: initial.is_active,
                description: '',
                description_ar: '',
            });
        }
    }, [initial]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...form,
            avg_cost_sar: form.avg_cost_sar ? Number(form.avg_cost_sar) : null,
            avg_turnaround_days: form.avg_turnaround_days ? Number(form.avg_turnaround_days) : null,
            subcategory: form.subcategory || null,
            sample_required: form.sample_required || null,
            description: form.description || null,
            description_ar: form.description_ar || null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass rounded-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-text-muted"
                >
                    <X className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold text-text-primary mb-4">
                    {initial ? 'Edit Service' : 'Add Service'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Name (EN)" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                        <InputField label="Name (AR)" value={form.name_ar} onChange={v => setForm(f => ({ ...f, name_ar: v }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} required />
                        <InputField label="Subcategory" value={form.subcategory} onChange={v => setForm(f => ({ ...f, subcategory: v }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-text-muted mb-1.5">Type</label>
                        <select
                            value={form.type}
                            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-text-primary text-sm focus:border-accent focus:outline-none transition-colors"
                        >
                            {Object.entries(typeLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Avg Cost (SAR)" value={form.avg_cost_sar} onChange={v => setForm(f => ({ ...f, avg_cost_sar: v }))} type="number" />
                        <InputField label="Avg Turnaround (days)" value={form.avg_turnaround_days} onChange={v => setForm(f => ({ ...f, avg_turnaround_days: v }))} type="number" />
                    </div>
                    <InputField label="Sample Required" value={form.sample_required} onChange={v => setForm(f => ({ ...f, sample_required: v }))} placeholder="e.g. Blood (serum)" />
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.fasting_required}
                                onChange={e => setForm(f => ({ ...f, fasting_required: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/20 bg-surface accent-accent"
                            />
                            Fasting Required
                        </label>
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/20 bg-surface accent-accent"
                            />
                            Active
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-white/10 text-text-secondary text-sm hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                        >
                            {initial ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────
// Provider Modal
// ──────────────────────────────────────────

function ProviderModal({
    isOpen,
    onClose,
    onSave,
    initial,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initial?: ProviderRow | null;
}) {
    const [form, setForm] = useState({
        name: initial?.name ?? '',
        name_ar: initial?.name_ar ?? '',
        type: initial?.type ?? 'lab',
        city: initial?.city ?? '',
        phone: initial?.phone ?? '',
        email: initial?.email ?? '',
        address: '',
        address_ar: '',
        is_active: initial?.is_active ?? true,
        is_verified: initial?.is_verified ?? false,
        home_collection_available: initial?.home_collection_available ?? false,
    });

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.name,
                name_ar: initial.name_ar,
                type: initial.type,
                city: initial.city,
                phone: initial.phone ?? '',
                email: initial.email ?? '',
                address: '',
                address_ar: '',
                is_active: initial.is_active,
                is_verified: initial.is_verified,
                home_collection_available: initial.home_collection_available,
            });
        }
    }, [initial]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...form,
            phone: form.phone || null,
            email: form.email || null,
            address: form.address || form.name,
            address_ar: form.address_ar || form.name_ar,
            rating_avg: 0,
            rating_count: 0,
            insurance_accepted: [],
            services_offered: [],
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass rounded-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-text-muted"
                >
                    <X className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold text-text-primary mb-4">
                    {initial ? 'Edit Provider' : 'Add Provider'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Name (EN)" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                        <InputField label="Name (AR)" value={form.name_ar} onChange={v => setForm(f => ({ ...f, name_ar: v }))} required />
                    </div>
                    <div>
                        <label className="block text-xs text-text-muted mb-1.5">Provider Type</label>
                        <select
                            value={form.type}
                            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-text-primary text-sm focus:border-accent focus:outline-none transition-colors"
                        >
                            {Object.entries(providerTypeLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <InputField label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} required />
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                        <InputField label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/20 bg-surface accent-accent"
                            />
                            Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_verified}
                                onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/20 bg-surface accent-accent"
                            />
                            Verified
                        </label>
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.home_collection_available}
                                onChange={e => setForm(f => ({ ...f, home_collection_available: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/20 bg-surface accent-accent"
                            />
                            Home Collection
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-white/10 text-text-secondary text-sm hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                        >
                            {initial ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────
// InputField helper
// ──────────────────────────────────────────

function InputField({
    label,
    value,
    onChange,
    type = 'text',
    required = false,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-xs text-text-muted mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                required={required}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-text-primary text-sm placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors"
            />
        </div>
    );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────

export default function InterventionsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [loading, setLoading] = useState(true);

    // Overview state
    const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0 });
    const [interventions, setInterventions] = useState<InterventionRow[]>([]);
    const [interventionCount, setInterventionCount] = useState(0);

    // Catalog state
    const [catalogItems, setCatalogItems] = useState<CatalogRow[]>([]);
    const [catalogCount, setCatalogCount] = useState(0);
    const [catalogModal, setCatalogModal] = useState<CatalogRow | null | undefined>(undefined);

    // Provider state
    const [providers, setProviders] = useState<ProviderRow[]>([]);
    const [providerCount, setProviderCount] = useState(0);
    const [providerModal, setProviderModal] = useState<ProviderRow | null | undefined>(undefined);

    // ──────────────────────────────────────────
    // Loaders
    // ──────────────────────────────────────────

    const loadOverview = useCallback(async () => {
        setLoading(true);
        const [statsRes, interventionsRes] = await Promise.all([
            fetchInterventionStats(),
            fetchInterventions(1, 20),
        ]);
        setStats(statsRes);
        setInterventions(interventionsRes.data as InterventionRow[]);
        setInterventionCount(interventionsRes.count);
        setLoading(false);
    }, []);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        const res = await fetchServiceCatalog(1, 100);
        setCatalogItems(res.data as CatalogRow[]);
        setCatalogCount(res.count);
        setLoading(false);
    }, []);

    const loadProviders = useCallback(async () => {
        setLoading(true);
        const res = await fetchServiceProviders(1, 100);
        setProviders(res.data as ProviderRow[]);
        setProviderCount(res.count);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'overview') loadOverview();
        else if (activeTab === 'catalog') loadCatalog();
        else if (activeTab === 'providers') loadProviders();
        else setLoading(false);
    }, [activeTab, loadOverview, loadCatalog, loadProviders]);

    // ──────────────────────────────────────────
    // Catalog CRUD handlers
    // ──────────────────────────────────────────

    const handleSaveCatalog = async (data: Record<string, unknown>) => {
        if (catalogModal) {
            await editServiceCatalogItem(catalogModal.id, data);
        } else {
            await addServiceCatalogItem(data as Parameters<typeof addServiceCatalogItem>[0]);
        }
        setCatalogModal(undefined);
        loadCatalog();
    };

    const handleDeleteCatalog = async (id: string) => {
        if (!confirm('Delete this catalog item?')) return;
        await removeServiceCatalogItem(id);
        loadCatalog();
    };

    // ──────────────────────────────────────────
    // Provider CRUD handlers
    // ──────────────────────────────────────────

    const handleSaveProvider = async (data: Record<string, unknown>) => {
        if (providerModal) {
            await editServiceProvider(providerModal.id, data);
        } else {
            await addServiceProvider(data);
        }
        setProviderModal(undefined);
        loadProviders();
    };

    const handleDeleteProvider = async (id: string) => {
        if (!confirm('Delete this provider?')) return;
        await removeServiceProvider(id);
        loadProviders();
    };

    // ──────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────

    return (
        <>
            <Header title="Intervention Management" subtitle="Service catalog, provider network & monitoring" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Tab bar */}
                <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active
                                        ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <StatCard icon={ClipboardList} value={String(stats.total)} label="Total Interventions" />
                            <StatCard icon={Clock} value={String(stats.pending)} label="Pending / Scheduled" iconColor="text-warning" iconBg="bg-warning-faded" />
                            <StatCard icon={CheckCircle2} value={String(stats.completed)} label="Completed" iconColor="text-success" iconBg="bg-success-faded" />
                            <StatCard icon={XCircle} value={String(stats.cancelled)} label="Cancelled" iconColor="text-error" iconBg="bg-error-faded" />
                        </div>

                        {/* Type breakdown */}
                        <div className="glass rounded-2xl p-4 md:p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4">By Type</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(typeIcons).map(([key, info]) => {
                                    const Icon = info.icon;
                                    return (
                                        <div key={key} className={`${info.bg} rounded-xl p-4 text-center`}>
                                            <Icon className={`w-6 h-6 ${info.color} mx-auto mb-2`} />
                                            <p className="text-sm font-medium text-text-primary">{typeLabels[key]}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent interventions table */}
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <DataTable
                                title="Recent Interventions"
                                subtitle={`${interventionCount} total interventions`}
                                columns={interventionColumns}
                                data={interventions}
                                totalCount={interventionCount}
                                searchPlaceholder="Search interventions..."
                                rowKey={(row) => row.id}
                            />
                        )}
                    </>
                )}

                {activeTab === 'catalog' && (
                    <>
                        {/* Quick actions */}
                        <div className="glass rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-text-primary">Service Catalog</h3>
                                <p className="text-sm text-text-muted mt-1">Manage medical tests, imaging, and referral services</p>
                            </div>
                            <button
                                onClick={() => setCatalogModal(null)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Service
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <DataTable
                                title="Services"
                                subtitle={`${catalogCount} services in catalog`}
                                columns={catalogColumns(
                                    (row) => setCatalogModal(row),
                                    handleDeleteCatalog,
                                )}
                                data={catalogItems}
                                totalCount={catalogCount}
                                searchPlaceholder="Search services..."
                                rowKey={(row) => row.id}
                            />
                        )}

                        <CatalogModal
                            isOpen={catalogModal !== undefined}
                            onClose={() => setCatalogModal(undefined)}
                            onSave={handleSaveCatalog}
                            initial={catalogModal}
                        />
                    </>
                )}

                {activeTab === 'providers' && (
                    <>
                        {/* Quick actions */}
                        <div className="glass rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-text-primary">Provider Network</h3>
                                <p className="text-sm text-text-muted mt-1">Manage laboratories, imaging centers, and specialist clinics</p>
                            </div>
                            <button
                                onClick={() => setProviderModal(null)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Provider
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <DataTable
                                title="Providers"
                                subtitle={`${providerCount} registered providers`}
                                columns={providerColumns(
                                    (row) => setProviderModal(row),
                                    handleDeleteProvider,
                                )}
                                data={providers}
                                totalCount={providerCount}
                                searchPlaceholder="Search providers..."
                                rowKey={(row) => row.id}
                            />
                        )}

                        <ProviderModal
                            isOpen={providerModal !== undefined}
                            onClose={() => setProviderModal(undefined)}
                            onSave={handleSaveProvider}
                            initial={providerModal}
                        />
                    </>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        {/* Analytics dashboard */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Completion rate card */}
                            <div className="glass rounded-2xl p-4 md:p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">Completion Rate</h3>
                                        <p className="text-xs text-text-muted">Interventions successfully completed</p>
                                    </div>
                                </div>
                                <div className="flex items-end gap-4">
                                    <span className="text-5xl font-bold text-success">
                                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                    </span>
                                    <div className="flex-1 h-3 rounded-full bg-surface overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700"
                                            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-text-primary">{stats.completed}</p>
                                        <p className="text-xs text-text-muted">Completed</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-text-primary">{stats.pending}</p>
                                        <p className="text-xs text-text-muted">Pending</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-text-primary">{stats.cancelled}</p>
                                        <p className="text-xs text-text-muted">Cancelled</p>
                                    </div>
                                </div>
                            </div>

                            {/* Type distribution */}
                            <div className="glass rounded-2xl p-4 md:p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">Type Distribution</h3>
                                        <p className="text-xs text-text-muted">Breakdown by intervention type</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(typeIcons).map(([key, info]) => {
                                        const Icon = info.icon;
                                        const count = interventions.filter(i => i.type === key).length;
                                        const pct = interventionCount > 0 ? (count / interventionCount) * 100 : 0;
                                        return (
                                            <div key={key} className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg ${info.bg} flex items-center justify-center`}>
                                                    <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                                                </div>
                                                <span className="text-sm text-text-secondary w-24">{typeLabels[key]}</span>
                                                <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${info.bg.replace('/10', '/60')} transition-all duration-500`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-text-muted w-8 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Provider / Catalog stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <StatCard icon={FlaskConical} value={String(catalogCount)} label="Catalog Services" iconColor="text-blue-400" iconBg="bg-blue-400/10" />
                            <StatCard icon={Building2} value={String(providerCount)} label="Registered Providers" iconColor="text-teal-400" iconBg="bg-teal-400/10" />
                            <StatCard icon={Clock} value="—" label="Avg Turnaround" iconColor="text-amber-400" iconBg="bg-amber-400/10" />
                            <StatCard icon={TrendingUp} value="—" label="Avg Cost (SAR)" iconColor="text-purple-400" iconBg="bg-purple-400/10" />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
