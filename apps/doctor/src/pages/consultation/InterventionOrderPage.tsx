import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { colors, typography, ClipboardList, Microscope, Camera, Doctor, Stethoscope, Calendar, Search, CheckCircle, Send } from '@cliniqone/ui';
import type { InterventionType, InterventionPriority, Specialty, CatalogIntervention } from '@cliniqone/types';
import { SPECIALTY_INTERVENTIONS, INTERVENTION_TYPE_LABELS } from '@cliniqone/types';
import { useCreateInterventionOrder } from '../../hooks/useDoctorData';
import { useAuthStore } from '../../stores/authStore';
import { BackButton } from '../../components/BackButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { haptic } from '../../hooks/useHaptics';
import type { CSSProperties } from 'react';

interface SelectedIntervention extends CatalogIntervention {
    selected: boolean; clinical_indication: string; doctor_notes: string; priority: InterventionPriority;
}

type FilterType = 'all' | InterventionType;

const FILTER_OPTIONS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'all' }, { key: 'lab_test', label: 'Labs', icon: 'lab' },
    { key: 'imaging', label: 'Imaging', icon: 'img' }, { key: 'referral', label: 'Referral', icon: 'ref' },
    { key: 'therapy', label: 'Therapy', icon: 'thpy' }, { key: 'follow_up', label: 'Follow-up', icon: 'fu' },
];

const PRIORITY_OPTIONS: { value: InterventionPriority; label: string; color: string }[] = [
    { value: 'routine', label: 'Routine', color: colors.success },
    { value: 'urgent', label: 'Urgent', color: colors.warning },
    { value: 'stat', label: 'STAT', color: colors.error },
];

export function InterventionOrderPage() {
    const { id: consultationId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const specialty: Specialty = (searchParams.get('specialty') as Specialty) || 'dermatology';
    const catalog = SPECIALTY_INTERVENTIONS[specialty] || [];
    const { doctor } = useAuthStore();
    const createOrderMutation = useCreateInterventionOrder();

    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const [selections, setSelections] = useState<Map<string, SelectedIntervention>>(new Map());
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [showCustom, setShowCustom] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customNotes, setCustomNotes] = useState('');
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const toast = useToast((s) => s.show);

    const filteredCatalog = useMemo(() => {
        let items = catalog;
        if (filter !== 'all') items = items.filter(i => i.type === filter);
        if (search.trim()) { const q = search.trim().toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)); }
        return items;
    }, [catalog, filter, search]);

    const selectedCount = selections.size;
    const totalCost = Array.from(selections.values()).reduce((sum, s) => sum + s.estimated_cost_sar, 0);

    const toggleSelection = (item: CatalogIntervention) => {
        const key = item.name; const newSel = new Map(selections);
        if (newSel.has(key)) { newSel.delete(key); if (expandedItem === key) setExpandedItem(null); }
        else { newSel.set(key, { ...item, selected: true, clinical_indication: '', doctor_notes: '', priority: 'routine' }); setExpandedItem(key); }
        setSelections(newSel);
    };

    const updateSelection = (key: string, field: keyof SelectedIntervention, value: string) => {
        const newSel = new Map(selections); const item = newSel.get(key);
        if (item) { newSel.set(key, { ...item, [field]: value }); setSelections(newSel); }
    };

    const updatePriority = (key: string, priority: InterventionPriority) => {
        const newSel = new Map(selections); const item = newSel.get(key);
        if (item) { newSel.set(key, { ...item, priority }); setSelections(newSel); }
    };

    const handleAddCustom = () => {
        if (!customName.trim()) { toast('Please enter a name.', 'warning'); return; }
        const ci: CatalogIntervention = { name: customName.trim(), type: 'lab_test', category: 'Custom', estimated_cost_sar: 0 };
        const newSel = new Map(selections);
        newSel.set(ci.name, { ...ci, selected: true, clinical_indication: '', doctor_notes: customNotes, priority: 'routine' });
        setSelections(newSel); setCustomName(''); setCustomNotes(''); setShowCustom(false);
    };

    const handleSubmit = () => {
        if (selectedCount === 0) { toast('Please select at least one intervention.', 'warning'); return; }
        setShowSubmitConfirm(true);
    };

    const confirmSubmit = () => {
        setShowSubmitConfirm(false);
        const data = Array.from(selections.values()).map(s => ({
            consultation_id: consultationId || '', patient_id: '', doctor_id: doctor?.id || '',
            type: s.type, title: s.name, category: s.category,
            clinical_indication: s.clinical_indication || 'As indicated', doctor_notes: s.doctor_notes || '',
            priority: s.priority, estimated_cost_sar: s.estimated_cost_sar,
        }));
        createOrderMutation.mutate(data, {
            onSuccess: () => { toast(`${selectedCount} intervention(s) ordered.`, 'success'); navigate(-1); },
            onError: (err) => toast(err.message || 'Failed to create order.', 'error'),
        });
    };

    const specialtyLabel = specialty === 'dermatology' ? 'Dermatology' : 'Family Medicine';

    return (
        <>
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <BackButton />
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: typography.h3.fontSize, fontWeight: 600, color: colors.textPrimary }}>Order Interventions</span>
                    <span style={{ display: 'block', fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{specialtyLabel} Catalog</span>
                </div>
                <div style={{ width: 50 }} />
            </div>

            <div style={s.scrollArea} className="scrollable">
                <div style={s.scrollInner}>
                    {/* Search */}
                    <div style={s.searchBar}>
                        <Search size={16} color={colors.textTertiary} />
                        <input style={s.searchInput} placeholder="Search interventions..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button onClick={() => { haptic.light(); setSearch(''); }}><span style={{ fontSize: 14, color: colors.textTertiary }}>✕</span></button>}
                    </div>

                    {/* Filter Chips */}
                    <div style={s.filterRow}>
                        {FILTER_OPTIONS.map(opt => (
                            <button key={opt.key} style={{ ...s.filterChip, ...(filter === opt.key ? s.filterChipActive : {}) }} className="pressable" onClick={() => { haptic.select(); setFilter(opt.key); }}>
                                <span style={{ fontSize: 11, color: filter === opt.key ? colors.accentTeal : colors.textSecondary, fontWeight: filter === opt.key ? 600 : 400 }}>{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Summary */}
                    {selectedCount > 0 && (
                        <div style={s.summaryBar}>
                            <span style={{ fontSize: 14, color: colors.accentTeal, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CheckCircle size={14} color={colors.accentTeal} /> {selectedCount} selected • Est. {totalCost} SAR</span>
                        </div>
                    )}

                    {/* Catalog */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: typography.h4.fontSize, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}><ClipboardList size={16} color={colors.textPrimary} /> Available Interventions ({filteredCatalog.length})</span>

                    {filteredCatalog.map((item) => {
                        const key = item.name;
                        const isSelected = selections.has(key);
                        const isExpanded = expandedItem === key;
                        const sel = selections.get(key);
                        const typeInfo = INTERVENTION_TYPE_LABELS[item.type];

                        return (
                            <div key={key}>
                                <button style={{ ...s.catCard, ...(isSelected ? s.catCardSel : {}), width: '100%', textAlign: 'left' as any }} className="pressable" onClick={() => { haptic.select(); toggleSelection(item); }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? colors.accentTeal : colors.border}`, backgroundColor: isSelected ? colors.accentTealFaded : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {isSelected && <CheckCircle size={14} color={colors.accentTeal} />}
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: 14, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</span>
                                                <span style={{ display: 'block', fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{typeInfo.icon} {typeInfo.en} • {item.category}</span>
                                            </div>
                                        </div>
                                        <span style={{ backgroundColor: colors.warningFaded, paddingInline: 10, paddingBlock: 4, borderRadius: 8, fontSize: 11, color: colors.warning, fontWeight: 700 }}>{item.estimated_cost_sar} SAR</span>
                                    </div>
                                    {item.instructions && (
                                        <div style={{ marginTop: 8, paddingInline: 10, paddingBlock: 6, backgroundColor: colors.bgTertiary, borderRadius: 8 }}>
                                            <span style={{ fontSize: 11, color: colors.textSecondary }}>{item.instructions}</span>
                                        </div>
                                    )}
                                </button>

                                {isSelected && isExpanded && sel && (
                                    <div style={s.expandedCard}>
                                        <span style={s.expandLabel}>Priority</span>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                            {PRIORITY_OPTIONS.map(p => (
                                                <button key={p.value} style={{ ...s.priorityBtn, ...(sel.priority === p.value ? { borderColor: p.color, backgroundColor: p.color + '20' } : {}) }} className="pressable" onClick={() => { haptic.select(); updatePriority(key, p.value); }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color, display: 'inline-block' }} />
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: sel.priority === p.value ? p.color : colors.textSecondary }}>{p.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <span style={s.expandLabel}>Clinical Indication</span>
                                        <textarea style={s.expandInput} placeholder="Why is this needed?" value={sel.clinical_indication} onChange={(e) => updateSelection(key, 'clinical_indication', e.target.value)} />
                                        <span style={s.expandLabel}>Notes (internal)</span>
                                        <textarea style={s.expandInput} placeholder="Internal notes..." value={sel.doctor_notes} onChange={(e) => updateSelection(key, 'doctor_notes', e.target.value)} />
                                        <button style={{ paddingBlock: 8, width: '100%' }} onClick={() => { haptic.light(); setExpandedItem(null); }}>
                                            <span style={{ fontSize: 11, color: colors.accentTeal, fontWeight: 600 }}>▲ Collapse</span>
                                        </button>
                                    </div>
                                )}

                                {isSelected && !isExpanded && (
                                    <button style={{ paddingBlock: 6, marginBottom: 4, width: '100%' }} onClick={() => { haptic.light(); setExpandedItem(key); }}>
                                        <span style={{ fontSize: 11, color: colors.accentTeal }}>▼ Tap to add details (priority, notes)</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {filteredCatalog.length === 0 && (
                        <div style={{ textAlign: 'center', paddingBlock: 40 }}>
                            <Search size={40} color={colors.textTertiary} />
                            <span style={{ fontSize: 14, color: colors.textTertiary }}>No interventions match your search</span>
                        </div>
                    )}

                    {/* Custom */}
                    <button style={s.customBtn} className="pressable" onClick={() => { haptic.light(); setShowCustom(!showCustom); }}>
                        <span style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 600 }}>{showCustom ? '✕ Cancel' : '+ Add Custom Intervention'}</span>
                    </button>

                    {showCustom && (
                        <div style={s.customForm}>
                            <input style={{ ...s.expandInput as any, display: 'block', width: '100%' }} placeholder="Custom intervention name *" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                            <textarea style={{ ...s.expandInput as any, display: 'block', width: '100%' }} placeholder="Notes (optional)" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} />
                            <button style={s.customAddBtn} className="pressable" onClick={() => { haptic.medium(); handleAddCustom(); }}><span style={{ fontSize: 14, color: colors.accentTeal }}>+ Add to Order</span></button>
                        </div>
                    )}

                    {/* Submit */}
                    <button style={{ ...s.submitBtn, opacity: selectedCount === 0 ? 0.4 : 1 }} className="pressable" onClick={() => { haptic.heavy(); handleSubmit(); }} disabled={selectedCount === 0}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: colors.bgPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Send size={16} color={colors.bgPrimary} /> Order {selectedCount > 0 ? `${selectedCount} Intervention(s)` : 'Interventions'}{totalCost > 0 ? ` • ${totalCost} SAR` : ''}
                            </span>
                    </button>
                    <div style={{ height: 40 }} />
                </div>
            </div>
        </div>

        <ConfirmDialog
            visible={showSubmitConfirm}
            title="Confirm Order"
            message={`Order ${selectedCount} intervention(s)? Total est: ${totalCost} SAR`}
            confirmLabel="Order"
            cancelLabel="Cancel"
            onConfirm={confirmSubmit}
            onCancel={() => setShowSubmitConfirm(false)}
        />
        </>
    );
}

const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', backgroundColor: colors.bgPrimary },
    header: { display: 'flex', alignItems: 'center', paddingInline: 20, paddingBlock: 12, borderBottom: `1px solid ${colors.border}` },
    scrollArea: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingInline: 14, paddingBlock: 10, marginBottom: 12, border: `1px solid ${colors.border}`, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, backgroundColor: 'transparent', border: 'none', outline: 'none' } as any,
    filterRow: { display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' as any, flexWrap: 'nowrap' as any },
    filterChip: { display: 'flex', alignItems: 'center', paddingInline: 14, paddingBlock: 8, borderRadius: 20, backgroundColor: colors.bgTertiary, gap: 4, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap' as any },
    filterChipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    summaryBar: { backgroundColor: colors.accentTealFaded, borderRadius: 12, paddingBlock: 10, paddingInline: 16, marginBottom: 16, border: `1px solid ${colors.accentTeal}` },
    catCard: { backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 14, marginBottom: 4, border: `1.5px solid ${colors.border}` },
    catCardSel: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded + '30' },
    expandedCard: { backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 14, marginBottom: 4, border: `1px solid ${colors.accentTeal}`, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 } as any,
    expandLabel: { display: 'block', fontSize: 11, color: colors.textSecondary, fontWeight: 600, textTransform: 'uppercase' as any, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
    expandInput: { display: 'block', width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 10, paddingInline: 12, paddingBlock: 10, color: colors.textPrimary, fontSize: 11, border: `1px solid ${colors.border}`, marginBottom: 4, minHeight: 40, fontFamily: 'inherit', resize: 'vertical' as any },
    priorityBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBlock: 8, borderRadius: 10, border: `1.5px solid ${colors.border}`, backgroundColor: colors.bgSecondary },
    customBtn: { width: '100%', paddingBlock: 14, borderRadius: 12, border: `1.5px dashed ${colors.border}`, marginTop: 16 },
    customForm: { backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14, marginTop: 8, border: `1px solid ${colors.border}` },
    customAddBtn: { width: '100%', backgroundColor: colors.accentTealFaded, borderRadius: 10, paddingBlock: 10, marginTop: 4 },
    submitBtn: { width: '100%', backgroundColor: colors.accentTeal, borderRadius: 16, paddingBlock: 18, marginTop: 24 },
};
