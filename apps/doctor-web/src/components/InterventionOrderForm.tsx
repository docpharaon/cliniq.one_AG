'use client';

import { useState, useEffect } from 'react';
import {
    Search, X, FlaskConical, Loader2, Plus, AlertCircle,
} from 'lucide-react';
import { fetchServiceCatalog, createIntervention } from '@/lib/actions';
import StatusBadge from './StatusBadge';

type Service = {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    type: string;
    sample_required: string;
    fasting_required: boolean;
    avg_cost_sar: number;
    avg_turnaround_days: number;
};

type Props = {
    consultationId: string;
    patientId: string;
    doctorId: string;
    onOrderCreated: () => void;
    onClose: () => void;
};

const TYPES = [
    { key: 'all', label: 'All' },
    { key: 'lab_test', label: 'Lab Test' },
    { key: 'imaging', label: 'Imaging' },
    { key: 'referral', label: 'Referral' },
    { key: 'therapy', label: 'Therapy' },
    { key: 'follow_up', label: 'Follow-up' },
];

const PRIORITIES = ['routine', 'urgent', 'stat'];

export default function InterventionOrderForm({ consultationId, patientId, doctorId, onOrderCreated, onClose }: Props) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [catalog, setCatalog] = useState<Service[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [selected, setSelected] = useState<Service | null>(null);

    // Order form fields
    const [priority, setPriority] = useState('routine');
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [instructions, setInstructions] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            setLoadingCatalog(true);
            try {
                const data = await fetchServiceCatalog(
                    search.trim() || undefined,
                    undefined,
                    typeFilter !== 'all' ? typeFilter : undefined,
                );
                setCatalog(data as Service[]);
            } catch (err) {
                console.error('Catalog load error:', err);
            }
            setLoadingCatalog(false);
        }
        const timer = setTimeout(load, 300);
        return () => clearTimeout(timer);
    }, [search, typeFilter]);

    async function handleSubmit() {
        if (!selected) return;
        if (!clinicalIndication.trim()) {
            setError('Clinical indication is required.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const result = await createIntervention({
                consultation_id: consultationId,
                patient_id: patientId,
                doctor_id: doctorId,
                type: selected.type,
                priority,
                title: selected.name,
                description: selected.subcategory || undefined,
                clinical_indication: clinicalIndication.trim(),
                category: selected.category,
                specific_test: selected.name,
                instructions_for_patient: instructions.trim() || undefined,
                doctor_notes: notes.trim() || undefined,
            });

            if (result.error) {
                setError(result.error);
            } else {
                onOrderCreated();
            }
        } catch {
            setError('Failed to create order. Please try again.');
        }
        setSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-[700px] max-h-[85vh] bg-bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info-faded flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">
                                {selected ? 'Review Order' : 'Order Test / Intervention'}
                            </h3>
                            <p className="text-xs text-text-muted">
                                {selected ? selected.name : 'Browse the service catalog'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-bg-elevated flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-text-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {!selected ? (
                        <>
                            {/* Search & Filter */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search tests, procedures..."
                                        className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                                    />
                                </div>
                            </div>

                            {/* Type Tabs */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                                {TYPES.map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTypeFilter(t.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${typeFilter === t.key
                                            ? 'bg-accent text-bg-primary'
                                            : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Catalog List */}
                            {loadingCatalog ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                                </div>
                            ) : catalog.length === 0 ? (
                                <div className="text-center py-12 text-text-muted text-sm">
                                    No services found. Try a different search.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                    {catalog.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => setSelected(service)}
                                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-bg-elevated border border-border hover:border-accent/30 transition-all text-left group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{service.name}</p>
                                                <p className="text-xs text-text-muted">
                                                    {service.category}{service.subcategory ? ` → ${service.subcategory}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0 space-y-1">
                                                <StatusBadge label={service.type.replace('_', ' ')} variant="info" />
                                                {service.avg_cost_sar && (
                                                    <p className="text-xs text-gold font-semibold">~{service.avg_cost_sar} SAR</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Back to catalog */}
                            <button
                                onClick={() => setSelected(null)}
                                className="text-xs text-accent hover:underline"
                            >
                                ← Back to catalog
                            </button>

                            {/* Selected Service Info */}
                            <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                <p className="font-bold text-text-primary">{selected.name}</p>
                                <p className="text-xs text-text-muted mt-1">
                                    {selected.category}{selected.subcategory ? ` → ${selected.subcategory}` : ''}
                                    {selected.sample_required ? ` · Sample: ${selected.sample_required}` : ''}
                                    {selected.fasting_required ? ' · Fasting required' : ''}
                                </p>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Priority</label>
                                <div className="flex gap-2">
                                    {PRIORITIES.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPriority(p)}
                                            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${priority === p
                                                ? p === 'stat' ? 'bg-error text-white' : p === 'urgent' ? 'bg-warning text-bg-primary' : 'bg-accent text-bg-primary'
                                                : 'bg-bg-elevated text-text-muted hover:text-text-primary border border-border'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Clinical Indication */}
                            <div>
                                <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                    Clinical Indication *
                                </label>
                                <textarea
                                    value={clinicalIndication}
                                    onChange={e => setClinicalIndication(e.target.value)}
                                    placeholder="Reason for ordering this test..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                                />
                            </div>

                            {/* Instructions */}
                            <div>
                                <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                    Instructions for Patient
                                </label>
                                <textarea
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    placeholder="e.g. Fast for 12 hours before test..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm resize-none"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                                    Doctor Notes
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Internal notes..."
                                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-error text-sm px-3 py-2 bg-error-faded rounded-xl">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {selected && (
                    <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-bg-elevated transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-purple text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,212,191,0.4)] transition-all disabled:opacity-60"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {submitting ? 'Creating…' : 'Create Order'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
