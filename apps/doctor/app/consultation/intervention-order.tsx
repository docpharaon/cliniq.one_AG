import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import type { InterventionType, InterventionPriority, Specialty, CatalogIntervention } from '@cliniqone/types';
import { SPECIALTY_INTERVENTIONS, INTERVENTION_TYPE_LABELS } from '@cliniqone/types';
import { useCreateInterventionOrder } from '../../hooks/useDoctorData';
import { useAuthStore } from '../../stores/authStore';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface SelectedIntervention extends CatalogIntervention {
    selected: boolean;
    clinical_indication: string;
    doctor_notes: string;
    priority: InterventionPriority;
}

type FilterType = 'all' | InterventionType;

const FILTER_OPTIONS: { key: FilterType; label: string; emoji: string }[] = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'lab_test', label: 'Labs', emoji: '🔬' },
    { key: 'imaging', label: 'Imaging', emoji: '📸' },
    { key: 'referral', label: 'Referral', emoji: '👨‍⚕️' },
    { key: 'therapy', label: 'Therapy', emoji: '💪' },
    { key: 'follow_up', label: 'Follow-up', emoji: '📅' },
];

const PRIORITY_OPTIONS: { value: InterventionPriority; label: string; emoji: string; color: string }[] = [
    { value: 'routine', label: 'Routine', emoji: '🟢', color: colors.success },
    { value: 'urgent', label: 'Urgent', emoji: '🟡', color: colors.warning },
    { value: 'stat', label: 'STAT', emoji: '🔴', color: colors.error },
];

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────

export default function InterventionOrderScreen() {
    const { consultationId, specialty: specialtyParam } = useLocalSearchParams<{
        consultationId: string;
        specialty: string;
    }>();

    const specialty: Specialty = (specialtyParam as Specialty) || 'dermatology';
    const catalog = SPECIALTY_INTERVENTIONS[specialty] || [];

    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const [selections, setSelections] = useState<Map<string, SelectedIntervention>>(new Map());
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const createOrderMutation = useCreateInterventionOrder();
    const { doctor } = useAuthStore();

    // Custom intervention state
    const [showCustom, setShowCustom] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customNotes, setCustomNotes] = useState('');

    // Filter & search
    const filteredCatalog = useMemo(() => {
        let items = catalog;
        if (filter !== 'all') {
            items = items.filter(i => i.type === filter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q)
            );
        }
        return items;
    }, [catalog, filter, search]);

    const selectedCount = selections.size;
    const totalCost = Array.from(selections.values()).reduce((sum, s) => sum + s.estimated_cost_sar, 0);

    const toggleSelection = (item: CatalogIntervention) => {
        const key = item.name;
        const newSelections = new Map(selections);
        if (newSelections.has(key)) {
            newSelections.delete(key);
            if (expandedItem === key) setExpandedItem(null);
        } else {
            newSelections.set(key, {
                ...item,
                selected: true,
                clinical_indication: '',
                doctor_notes: '',
                priority: 'routine',
            });
            setExpandedItem(key);
        }
        setSelections(newSelections);
    };

    const updateSelection = (key: string, field: keyof SelectedIntervention, value: string) => {
        const newSelections = new Map(selections);
        const item = newSelections.get(key);
        if (item) {
            newSelections.set(key, { ...item, [field]: value });
            setSelections(newSelections);
        }
    };

    const updatePriority = (key: string, priority: InterventionPriority) => {
        const newSelections = new Map(selections);
        const item = newSelections.get(key);
        if (item) {
            newSelections.set(key, { ...item, priority });
            setSelections(newSelections);
        }
    };

    const handleAddCustom = () => {
        if (!customName.trim()) {
            Alert.alert('Required', 'Please enter a name for the custom intervention.');
            return;
        }
        const customItem: CatalogIntervention = {
            name: customName.trim(),
            type: 'lab_test',
            category: 'Custom',
            estimated_cost_sar: 0,
        };
        const newSelections = new Map(selections);
        newSelections.set(customItem.name, {
            ...customItem,
            selected: true,
            clinical_indication: '',
            doctor_notes: customNotes,
            priority: 'routine',
        });
        setSelections(newSelections);
        setCustomName('');
        setCustomNotes('');
        setShowCustom(false);
    };

    const handleSubmit = () => {
        if (selectedCount === 0) {
            Alert.alert('No Selection', 'Please select at least one intervention.');
            return;
        }

        const names = Array.from(selections.values()).map(s => s.name).join(', ');
        Alert.alert(
            'Confirm Order',
            `Order ${selectedCount} intervention(s) for this patient?\n\n${names}\n\nTotal est. cost: ${totalCost} SAR`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Order',
                    onPress: () => {
                        const interventionData = Array.from(selections.values()).map(s => ({
                            consultation_id: consultationId || '',
                            patient_id: '',
                            doctor_id: doctor?.id || '',
                            type: s.type,
                            title: s.name,
                            category: s.category,
                            clinical_indication: s.clinical_indication || 'As indicated',
                            doctor_notes: s.doctor_notes || '',
                            priority: s.priority,
                            estimated_cost_sar: s.estimated_cost_sar,
                        }));

                        createOrderMutation.mutate(interventionData, {
                            onSuccess: () => {
                                Alert.alert(
                                    '✅ Ordered',
                                    `${selectedCount} intervention(s) ordered successfully. Patient will be notified.`,
                                    [{ text: 'OK', onPress: () => router.back() }]
                                );
                            },
                            onError: (err) => {
                                Alert.alert('Error', err.message || 'Failed to create intervention order.');
                            },
                        });
                    },
                },
            ]
        );
    };

    const specialtyLabel = specialty === 'dermatology' ? 'Dermatology' : 'Family Medicine';

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Order Interventions</Text>
                    <Text style={styles.headerSubtitle}>🩺 {specialtyLabel} Catalog</Text>
                </View>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Search */}
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search interventions..."
                        placeholderTextColor={colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={styles.clearBtn}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Type Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {FILTER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
                            onPress={() => setFilter(opt.key)}
                        >
                            <Text style={styles.filterEmoji}>{opt.emoji}</Text>
                            <Text style={[styles.filterText, filter === opt.key && styles.filterTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Selection Summary */}
                {selectedCount > 0 && (
                    <View style={styles.summaryBar}>
                        <Text style={styles.summaryText}>
                            ✅ {selectedCount} selected • Est. {totalCost} SAR
                        </Text>
                    </View>
                )}

                {/* Intervention Catalog List */}
                <Text style={styles.sectionTitle}>
                    📋 Available Interventions ({filteredCatalog.length})
                </Text>

                {filteredCatalog.map((item) => {
                    const key = item.name;
                    const isSelected = selections.has(key);
                    const isExpanded = expandedItem === key;
                    const sel = selections.get(key);
                    const typeInfo = INTERVENTION_TYPE_LABELS[item.type];

                    return (
                        <View key={key}>
                            <TouchableOpacity
                                style={[styles.catalogCard, isSelected && styles.catalogCardSelected]}
                                activeOpacity={0.7}
                                onPress={() => toggleSelection(item)}
                            >
                                <View style={styles.catalogCardTop}>
                                    <View style={styles.catalogCardLeft}>
                                        <Text style={styles.checkBox}>
                                            {isSelected ? '☑️' : '⬜'}
                                        </Text>
                                        <View>
                                            <Text style={styles.catalogName}>{item.name}</Text>
                                            <Text style={styles.catalogMeta}>
                                                {typeInfo.icon} {typeInfo.en} • {item.category}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.priceTag}>
                                        <Text style={styles.priceText}>{item.estimated_cost_sar} SAR</Text>
                                    </View>
                                </View>

                                {item.instructions && (
                                    <View style={styles.instructionHint}>
                                        <Text style={styles.instructionHintText}>
                                            📋 {item.instructions}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Expanded Details */}
                            {isSelected && isExpanded && sel && (
                                <View style={styles.expandedCard}>
                                    {/* Priority */}
                                    <Text style={styles.expandLabel}>Priority</Text>
                                    <View style={styles.priorityRow}>
                                        {PRIORITY_OPTIONS.map(p => (
                                            <TouchableOpacity
                                                key={p.value}
                                                style={[
                                                    styles.priorityBtn,
                                                    sel.priority === p.value && { borderColor: p.color, backgroundColor: p.color + '20' },
                                                ]}
                                                onPress={() => updatePriority(key, p.value)}
                                            >
                                                <Text style={styles.priorityEmoji}>{p.emoji}</Text>
                                                <Text style={[
                                                    styles.priorityText,
                                                    sel.priority === p.value && { color: p.color },
                                                ]}>{p.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Clinical indication */}
                                    <Text style={styles.expandLabel}>Clinical Indication</Text>
                                    <TextInput
                                        style={styles.expandInput}
                                        placeholder="Why is this needed?"
                                        placeholderTextColor={colors.textTertiary}
                                        value={sel.clinical_indication}
                                        onChangeText={(v) => updateSelection(key, 'clinical_indication', v)}
                                        multiline
                                    />

                                    {/* Doctor notes */}
                                    <Text style={styles.expandLabel}>Notes (internal)</Text>
                                    <TextInput
                                        style={styles.expandInput}
                                        placeholder="Internal notes..."
                                        placeholderTextColor={colors.textTertiary}
                                        value={sel.doctor_notes}
                                        onChangeText={(v) => updateSelection(key, 'doctor_notes', v)}
                                        multiline
                                    />

                                    <TouchableOpacity
                                        style={styles.collapseBtn}
                                        onPress={() => setExpandedItem(null)}
                                    >
                                        <Text style={styles.collapseBtnText}>▲ Collapse</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Tap to expand if selected but collapsed */}
                            {isSelected && !isExpanded && (
                                <TouchableOpacity
                                    style={styles.expandHint}
                                    onPress={() => setExpandedItem(key)}
                                >
                                    <Text style={styles.expandHintText}>
                                        ▼ Tap to add details (priority, notes)
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {filteredCatalog.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🔍</Text>
                        <Text style={styles.emptyText}>No interventions match your search</Text>
                    </View>
                )}

                {/* Add Custom */}
                <TouchableOpacity
                    style={styles.customBtn}
                    onPress={() => setShowCustom(!showCustom)}
                >
                    <Text style={styles.customBtnText}>
                        {showCustom ? '✕ Cancel' : '+ Add Custom Intervention'}
                    </Text>
                </TouchableOpacity>

                {showCustom && (
                    <View style={styles.customForm}>
                        <TextInput
                            style={styles.expandInput}
                            placeholder="Custom intervention name *"
                            placeholderTextColor={colors.textTertiary}
                            value={customName}
                            onChangeText={setCustomName}
                        />
                        <TextInput
                            style={styles.expandInput}
                            placeholder="Notes (optional)"
                            placeholderTextColor={colors.textTertiary}
                            value={customNotes}
                            onChangeText={setCustomNotes}
                            multiline
                        />
                        <TouchableOpacity style={styles.customAddBtn} onPress={handleAddCustom}>
                            <Text style={styles.customAddBtnText}>+ Add to Order</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, selectedCount === 0 && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={selectedCount === 0}
                >
                    <Text style={styles.submitText}>
                        📤 Order {selectedCount > 0 ? `${selectedCount} Intervention(s)` : 'Interventions'}
                        {totalCost > 0 ? ` • ${totalCost} SAR` : ''}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
    headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    scroll: { padding: 20, paddingBottom: 40 },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, padding: 0 },
    clearBtn: { ...typography.body, color: colors.textTertiary, paddingHorizontal: 4 },

    // Filter chips
    filterScroll: { marginBottom: 16 },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.bgTertiary,
        marginRight: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.accentTealFaded,
        borderColor: colors.accentTeal,
    },
    filterEmoji: { fontSize: 14 },
    filterText: { ...typography.caption, color: colors.textSecondary },
    filterTextActive: { color: colors.accentTeal, fontWeight: '600' },

    // Summary bar
    summaryBar: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.accentTeal,
    },
    summaryText: { ...typography.body, color: colors.accentTeal, fontWeight: '600', textAlign: 'center' },

    // Section
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },

    // Catalog card
    catalogCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 14,
        padding: 14,
        marginBottom: 4,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    catalogCardSelected: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded + '30',
    },
    catalogCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    catalogCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    checkBox: { fontSize: 20 },
    catalogName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    catalogMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    priceTag: {
        backgroundColor: colors.warningFaded,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    priceText: { ...typography.caption, color: colors.warning, fontWeight: '700' },

    // Instruction hint
    instructionHint: {
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.bgTertiary,
        borderRadius: 8,
    },
    instructionHintText: { ...typography.caption, color: colors.textSecondary },

    // Expanded detail card
    expandedCard: {
        backgroundColor: colors.bgTertiary,
        borderRadius: 12,
        padding: 14,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: colors.accentTeal,
        borderTopWidth: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    expandLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 8,
        marginBottom: 4,
    },
    expandInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: colors.textPrimary,
        ...typography.caption,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 4,
        minHeight: 40,
    },
    collapseBtn: { alignItems: 'center', paddingVertical: 8 },
    collapseBtnText: { ...typography.caption, color: colors.accentTeal, fontWeight: '600' },

    // Expand hint
    expandHint: {
        alignItems: 'center',
        paddingVertical: 6,
        marginBottom: 4,
    },
    expandHintText: { ...typography.caption, color: colors.accentTeal },

    // Priority row
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    priorityBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    priorityEmoji: { fontSize: 14 },
    priorityText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyText: { ...typography.body, color: colors.textTertiary },

    // Custom
    customBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        marginTop: 16,
    },
    customBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
    customForm: {
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    customAddBtn: {
        backgroundColor: colors.accentTealFaded,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 4,
    },
    customAddBtnText: { ...typography.button, color: colors.accentTeal },

    // Submit
    submitBtn: {
        backgroundColor: colors.accentTeal,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 24,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitText: { ...typography.button, color: colors.bgPrimary, fontWeight: '700', fontSize: 15 },
});
