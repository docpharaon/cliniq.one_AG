import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

const COMMON_ALLERGIES = [
    'Penicillin', 'Sulfa drugs', 'Aspirin', 'NSAIDs',
    'Latex', 'Adhesive tape', 'Fragrance', 'Nickel',
];

export default function AllergiesScreen() {
    const [allergies, setAllergies] = useState<string[]>([]);
    const [newAllergy, setNewAllergy] = useState('');
    const [noAllergies, setNoAllergies] = useState(false);

    function toggleAllergy(name: string) {
        if (allergies.includes(name)) {
            setAllergies(allergies.filter((a) => a !== name));
        } else {
            setAllergies([...allergies, name]);
            setNoAllergies(false);
        }
    }

    function addCustom() {
        if (!newAllergy.trim()) return;
        if (!allergies.includes(newAllergy.trim())) {
            setAllergies([...allergies, newAllergy.trim()]);
        }
        setNewAllergy('');
        setNoAllergies(false);
    }

    const canContinue = noAllergies || allergies.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '85%' }]} />
                    </View>
                </View>

                <Text style={styles.icon}>⚠️</Text>
                <Text style={styles.title}>{t('intake.allergiesTitle')}</Text>
                <Text style={styles.subtitle}>{t('intake.allergiesDesc')}</Text>

                {/* No Allergies */}
                <TouchableOpacity
                    style={[styles.noAllergyButton, noAllergies && styles.noAllergyActive]}
                    onPress={() => { setNoAllergies(!noAllergies); if (!noAllergies) setAllergies([]); }}
                >
                    <Text style={[styles.noAllergyText, noAllergies && styles.noAllergyTextActive]}>
                        {noAllergies ? '✅' : '⬜'} {t('intake.noKnownAllergies')}
                    </Text>
                </TouchableOpacity>

                {!noAllergies && (
                    <>
                        {/* Common Allergies */}
                        <Text style={styles.sectionLabel}>{t('intake.commonAllergies')}</Text>
                        <View style={styles.chips}>
                            {COMMON_ALLERGIES.map((allergy) => (
                                <TouchableOpacity
                                    key={allergy}
                                    style={[styles.chip, allergies.includes(allergy) && styles.chipActive]}
                                    onPress={() => toggleAllergy(allergy)}
                                >
                                    <Text style={[styles.chipText, allergies.includes(allergy) && styles.chipTextActive]}>{allergy}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom */}
                        <View style={styles.customRow}>
                            <TextInput
                                style={styles.customInput}
                                placeholder={t('intake.addCustomAllergy')}
                                placeholderTextColor={colors.textTertiary}
                                value={newAllergy}
                                onChangeText={setNewAllergy}
                                onSubmitEditing={addCustom}
                            />
                            <TouchableOpacity
                                style={[styles.addButton, !newAllergy.trim() && styles.addButtonDisabled]}
                                onPress={addCustom}
                                disabled={!newAllergy.trim()}
                            >
                                <Text style={styles.addButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selected */}
                        {allergies.length > 0 && (
                            <View style={styles.selected}>
                                <Text style={styles.sectionLabel}>{t('intake.yourAllergies')} ({allergies.length})</Text>
                                {allergies.map((a, i) => (
                                    <View key={i} style={styles.selectedItem}>
                                        <Text style={styles.selectedText}>⚠️ {a}</Text>
                                        <TouchableOpacity onPress={() => toggleAllergy(a)}>
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
                        onPress={() => router.push('/intake/review')}
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

    noAllergyButton: {
        backgroundColor: colors.bgCard,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginBottom: spacing['2xl'],
    },
    noAllergyActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    noAllergyText: { ...typography.body, color: colors.textPrimary },
    noAllergyTextActive: { color: colors.accentTeal, fontWeight: '600' },

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
    chipActive: { backgroundColor: colors.warningFaded, borderColor: colors.warning },
    chipText: { ...typography.bodySm, color: colors.textSecondary },
    chipTextActive: { color: colors.warning, fontWeight: '600' },

    customRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
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

    selected: { marginTop: spacing.md },
    selectedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.warningFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.warning + '40',
    },
    selectedText: { ...typography.body, color: colors.textPrimary },
    removeText: { color: colors.error, fontSize: 16, fontWeight: '600', padding: spacing.sm },
});
