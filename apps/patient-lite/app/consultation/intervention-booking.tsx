import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { INTERVENTION_TYPE_LABELS } from '@cliniqone/types';
import type { InterventionType } from '@cliniqone/types';
import { useToast } from '../../components/ToastProvider';

// ──────────────────────────────────────────
// Mock schedule data (will come from doctor_schedules table)
// ──────────────────────────────────────────

const MOCK_AVAILABLE_DATES = [
    { date: '2026-02-26', dayLabel: 'Wed', dateLabel: 'Feb 26' },
    { date: '2026-02-27', dayLabel: 'Thu', dateLabel: 'Feb 27' },
    { date: '2026-03-01', dayLabel: 'Sat', dateLabel: 'Mar 1' },
    { date: '2026-03-02', dayLabel: 'Sun', dateLabel: 'Mar 2' },
    { date: '2026-03-03', dayLabel: 'Mon', dateLabel: 'Mar 3' },
];

const MOCK_SLOTS: Record<string, string[]> = {
    '2026-02-26': ['09:00', '09:30', '10:00', '11:00', '14:00', '14:30', '15:00'],
    '2026-02-27': ['09:00', '10:30', '11:00', '13:00', '14:00'],
    '2026-03-01': ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
    '2026-03-02': ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    '2026-03-03': ['09:00', '09:30', '10:00', '14:00', '14:30'],
};

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────

export default function InterventionBookingScreen() {
    const params = useLocalSearchParams<{
        interventionId: string;
        name: string;
        type: string;
        category: string;
        cost: string;
        instructions: string;
        consultationId: string;
    }>();

    const typeInfo = INTERVENTION_TYPE_LABELS[(params.type as InterventionType) || 'lab_test'];
    const cost = parseInt(params.cost || '0', 10);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const toast = useToast((s) => s.show);

    const availableSlots = useMemo(() => {
        if (!selectedDate) return [];
        return MOCK_SLOTS[selectedDate] || [];
    }, [selectedDate]);

    const tokenCost = Math.ceil(cost / 50); // Convert SAR to tokens (50 SAR per token)

    const handleConfirm = () => {
        if (!selectedDate || !selectedSlot) {
            toast('Please select a date and time slot.', 'warning');
            return;
        }

        const confirmed = (globalThis as any).confirm?.(
            `Book "${params.name}" on ${selectedDate} at ${selectedSlot}?\n\nCost: ${cost} SAR (${tokenCost} tokens)`
        ) ?? true;

        if (!confirmed) return;

        setConfirming(true);
        // TODO: Call Supabase API to create booking + deduct tokens
        setTimeout(() => {
            setConfirming(false);
            toast(`✅ ${params.name} booked for ${selectedDate} at ${selectedSlot}!`, 'success');
            router.back();
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Intervention</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Intervention Summary */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryTop}>
                        <Text style={styles.summaryEmoji}>{typeInfo.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryName}>{params.name}</Text>
                            <Text style={styles.summaryMeta}>{typeInfo.en} • {params.category}</Text>
                        </View>
                    </View>

                    {params.instructions ? (
                        <View style={styles.instructionBox}>
                            <Text style={styles.instructionText}>📋 {params.instructions}</Text>
                        </View>
                    ) : null}

                    <View style={styles.costRow}>
                        <View style={styles.costItem}>
                            <Text style={styles.costLabel}>Cost</Text>
                            <Text style={styles.costValue}>{cost} SAR</Text>
                        </View>
                        <View style={styles.costDivider} />
                        <View style={styles.costItem}>
                            <Text style={styles.costLabel}>Tokens</Text>
                            <Text style={styles.costValueTokens}>{tokenCost} 🪙</Text>
                        </View>
                    </View>
                </View>

                {/* Date Selection */}
                <Text style={styles.sectionTitle}>📅 Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                    {MOCK_AVAILABLE_DATES.map(d => (
                        <TouchableOpacity
                            key={d.date}
                            style={[styles.dateCard, selectedDate === d.date && styles.dateCardActive]}
                            onPress={() => {
                                setSelectedDate(d.date);
                                setSelectedSlot(null);
                            }}
                        >
                            <Text style={[styles.dateDay, selectedDate === d.date && styles.dateDayActive]}>
                                {d.dayLabel}
                            </Text>
                            <Text style={[styles.dateDate, selectedDate === d.date && styles.dateDateActive]}>
                                {d.dateLabel}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Time Slots */}
                {selectedDate && (
                    <>
                        <Text style={styles.sectionTitle}>
                            🕐 Available Slots ({availableSlots.length})
                        </Text>
                        <View style={styles.slotGrid}>
                            {availableSlots.map(slot => (
                                <TouchableOpacity
                                    key={slot}
                                    style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                                    onPress={() => setSelectedSlot(slot)}
                                >
                                    <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
                                        {slot}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* Payment Summary */}
                {selectedDate && selectedSlot && (
                    <View style={styles.paymentCard}>
                        <Text style={styles.paymentTitle}>💳 Payment Summary</Text>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>{params.name}</Text>
                            <Text style={styles.paymentAmount}>{cost} SAR</Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Date & Time</Text>
                            <Text style={styles.paymentAmount}>{selectedDate} at {selectedSlot}</Text>
                        </View>
                        <View style={styles.paymentDivider} />
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentTotalLabel}>Total</Text>
                            <Text style={styles.paymentTotal}>{tokenCost} tokens 🪙</Text>
                        </View>
                    </View>
                )}

                {/* Confirm Button */}
                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        (!selectedDate || !selectedSlot) && styles.confirmBtnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={!selectedDate || !selectedSlot || confirming}
                >
                    <Text style={styles.confirmBtnText}>
                        {confirming ? '⏳ Processing...' : `✅ Pay ${tokenCost} Tokens & Confirm`}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    scroll: { padding: 20 },

    // Summary
    summaryCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    summaryEmoji: { fontSize: 32 },
    summaryName: { ...typography.h3, color: colors.textPrimary },
    summaryMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    instructionBox: {
        backgroundColor: colors.warningFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.md,
    },
    instructionText: { ...typography.bodySm, color: colors.warning },
    costRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    costItem: { flex: 1, alignItems: 'center' },
    costLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: 4 },
    costValue: { ...typography.h3, color: colors.textPrimary },
    costValueTokens: { ...typography.h3, color: colors.accentTeal },
    costDivider: { width: 1, height: 30, backgroundColor: colors.border },

    // Section
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.lg },

    // Date selection
    dateScroll: { marginBottom: spacing.md },
    dateCard: {
        width: 72,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    dateCardActive: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    dateDay: { ...typography.caption, color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
    dateDayActive: { color: colors.accentTeal },
    dateDate: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '700' },
    dateDateActive: { color: colors.accentTeal },

    // Slot grid
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    slotChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: colors.bgCard,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    slotChipActive: {
        borderColor: colors.accentTeal,
        backgroundColor: colors.accentTealFaded,
    },
    slotText: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
    slotTextActive: { color: colors.accentTeal },

    // Payment
    paymentCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginTop: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    paymentTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    paymentLabel: { ...typography.bodySm, color: colors.textSecondary },
    paymentAmount: { ...typography.bodySm, color: colors.textPrimary, fontWeight: '600' },
    paymentDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    paymentTotalLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    paymentTotal: { ...typography.h4, color: colors.accentTeal, fontWeight: '700' },

    // Confirm
    confirmBtn: {
        backgroundColor: colors.accentTeal,
        borderRadius: radius.xl,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    confirmBtnDisabled: { opacity: 0.4 },
    confirmBtnText: { ...typography.button, color: '#fff', fontWeight: '700', fontSize: 16 },
});
