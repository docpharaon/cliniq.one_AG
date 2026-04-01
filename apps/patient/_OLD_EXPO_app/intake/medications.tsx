import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

interface Medication {
    name: string;
    dosage: string;
    duration: string;
}

const COMMON_MEDS = [
    'Paracetamol', 'Ibuprofen', 'Vitamin D', 'Antihistamine',
    'Topical Steroid', 'Moisturizer', 'Sunscreen SPF50',
];

export default function MedicationsScreen() {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [newMed, setNewMed] = useState('');
    const [noMeds, setNoMeds] = useState(false);

    function addMed(name: string) {
        if (medications.some((m) => m.name === name)) return;
        setMedications([...medications, { name, dosage: '', duration: '' }]);
        setNewMed('');
        setNoMeds(false);
    }

    function removeMed(index: number) {
        setMedications(medications.filter((_, i) => i !== index));
    }

    function handleContinue() {
        router.push('/intake/allergies');
    }

    const canContinue = noMeds || medications.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '75%' }]} />
                    </View>
                </View>

                <Text style={styles.icon}>💊</Text>
                <Text style={styles.title}>{t('intake.medsTitle')}</Text>
                <Text style={styles.subtitle}>{t('intake.medsDesc')}</Text>

                {/* No Medications Toggle */}
                <TouchableOpacity
                    style={[styles.noMedsButton, noMeds && styles.noMedsActive]}
                    onPress={() => { setNoMeds(!noMeds); if (!noMeds) setMedications([]); }}
                >
                    <Text style={[styles.noMedsText, noMeds && styles.noMedsTextActive]}>
                        {noMeds ? '✅' : '⬜'} {t('intake.noCurrentMeds')}
                    </Text>
                </TouchableOpacity>

                {!noMeds && (
                    <>
                        {/* Quick Add */}
                        <Text style={styles.sectionLabel}>{t('intake.commonMeds')}</Text>
                        <View style={styles.chips}>
                            {COMMON_MEDS.map((med) => (
                                <TouchableOpacity
                                    key={med}
                                    style={[styles.chip, medications.some((m) => m.name === med) && styles.chipActive]}
                                    onPress={() => medications.some((m) => m.name === med)
                                        ? removeMed(medications.findIndex((m) => m.name === med))
                                        : addMed(med)
                                    }
                                >
                                    <Text style={[styles.chipText, medications.some((m) => m.name === med) && styles.chipTextActive]}>
                                        {med}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom Input */}
                        <View style={styles.customInputRow}>
                            <TextInput
                                style={styles.customInput}
                                placeholder={t('intake.addCustomMed')}
                                placeholderTextColor={colors.textTertiary}
                                value={newMed}
                                onChangeText={setNewMed}
                                onSubmitEditing={() => { if (newMed.trim()) addMed(newMed.trim()); }}
                            />
                            <TouchableOpacity
                                style={[styles.addButton, !newMed.trim() && styles.addButtonDisabled]}
                                onPress={() => { if (newMed.trim()) addMed(newMed.trim()); }}
                                disabled={!newMed.trim()}
                            >
                                <Text style={styles.addButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Added Medications List */}
                        {medications.length > 0 && (
                            <View style={styles.medsList}>
                                <Text style={styles.sectionLabel}>{t('intake.yourMeds')} ({medications.length})</Text>
                                {medications.map((med, idx) => (
                                    <View key={idx} style={styles.medItem}>
                                        <Text style={styles.medName}>💊 {med.name}</Text>
                                        <TouchableOpacity onPress={() => removeMed(idx)}>
                                            <Text style={styles.removeText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                <View style={{ marginTop: spacing['2xl'] }}>
                    <Button
                        title={t('common.continue')}
                        onPress={handleContinue}
                        size="lg"
                        disabled={!canContinue}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
    progressFill: { height: 4, backgroundColor: colors.accentTeal, borderRadius: 2 },

    icon: { fontSize: 48, textAlign: 'center', marginBottom: spacing.lg },
    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'] },

    noMedsButton: {
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginBottom: spacing['2xl'],
    },
    noMedsActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    noMedsText: { ...typography.body, color: colors.textPrimary },
    noMedsTextActive: { color: colors.accentTeal, fontWeight: '600' },

    sectionLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    chip: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accentTealFaded, borderColor: colors.accentTeal },
    chipText: { ...typography.bodySm, color: colors.textSecondary },
    chipTextActive: { color: colors.accentTeal, fontWeight: '600' },

    customInputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    customInput: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: { opacity: 0.4 },
    addButtonText: { fontSize: 22, color: colors.textInverse, fontWeight: '700' },

    medsList: { marginTop: spacing.md },
    medItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    medName: { ...typography.body, color: colors.textPrimary },
    removeText: { color: colors.error, fontSize: 16, fontWeight: '600', padding: spacing.sm },
});
