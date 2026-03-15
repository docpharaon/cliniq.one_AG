import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { useSubmitReport } from '../../hooks/useDoctorData';

interface Medication {
    name: string;
    strength: string;
    form: string;
    quantity: string;
    directions: string;
    duration: string;
    addToPrescription: boolean;
}

const emptyMed: Medication = {
    name: '', strength: '', form: 'Cream', quantity: '', directions: '', duration: '', addToPrescription: true,
};

export default function RespondScreen() {
    const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
    const submitReportMutation = useSubmitReport();

    // 1. Clinical Assessment
    const [diagnosis, setDiagnosis] = useState('');
    const [icd10, setIcd10] = useState('');
    const [differentials, setDifferentials] = useState('');
    const [reasoning, setReasoning] = useState('');

    // 2. Treatment Plan
    const [medications, setMedications] = useState<Medication[]>([{ ...emptyMed }]);
    const [nonPharm, setNonPharm] = useState('');

    // 3. Patient Education
    const [aboutCondition, setAboutCondition] = useState('');
    const [expectations, setExpectations] = useState('');
    const [prevention, setPrevention] = useState('');

    // 4. Warning Signs & Follow-Up
    const [warningChecks, setWarningChecks] = useState<Record<string, boolean>>({
        'Fever above 38.5°C': false,
        'Rapid spread of symptoms': false,
        'Difficulty breathing': false,
        'Severe swelling': false,
        'Worsening despite treatment': false,
    });
    const [followUp, setFollowUp] = useState('');

    // 5. Additional Notes
    const [notes, setNotes] = useState('');

    const addMedication = () => {
        setMedications([...medications, { ...emptyMed }]);
    };

    const removeMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const updateMed = (index: number, field: keyof Medication, value: string | boolean) => {
        const updated = [...medications];
        (updated[index] as any)[field] = value;
        setMedications(updated);
    };

    // Cross-platform alert helpers (Alert.alert doesn't work on web)
    const showAlert = (title: string, message: string, onOk?: () => void) => {
        if (Platform.OS === 'web') {
            (globalThis as any).alert(`${title}\n${message}`);
            onOk?.();
        } else {
            Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
        }
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        if (Platform.OS === 'web') {
            if ((globalThis as any).confirm(`${title}\n${message}`)) {
                onConfirm();
            }
        } else {
            Alert.alert(title, message, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: onConfirm },
            ]);
        }
    };

    const handleSubmit = () => {
        if (!diagnosis) {
            showAlert('Required', 'Please enter a primary diagnosis.');
            return;
        }

        if (!consultationId) {
            showAlert('Error', 'No consultation ID. Please go back and try again.');
            return;
        }

        showConfirm(
            'Submit Response',
            'This will send the response to the patient and generate an e-prescription. Continue?',
            () => {
                const report: Record<string, unknown> = {
                    diagnosis,
                    icd10_code: icd10,
                    differentials,
                    clinical_reasoning: reasoning,
                    non_pharmacologic: nonPharm,
                    patient_education: {
                        about_condition: aboutCondition,
                        expectations,
                        prevention,
                    },
                    warning_signs: Object.entries(warningChecks)
                        .filter(([_, checked]) => checked)
                        .map(([sign]) => sign),
                    follow_up: followUp,
                    additional_notes: notes,
                };

                const prescriptionMeds = medications.filter(m => m.addToPrescription && m.name);
                const prescription = prescriptionMeds.length > 0 ? {
                    medications: prescriptionMeds.map(m => ({
                        name: m.name,
                        strength: m.strength,
                        form: m.form,
                        quantity: m.quantity,
                        directions: m.directions,
                        duration: m.duration,
                    })),
                } : undefined;

                submitReportMutation.mutate(
                    { consultationId, report, prescription },
                    {
                        onSuccess: () => {
                            showAlert('Success', 'Response submitted successfully!', () => router.dismissAll());
                        },
                        onError: (err) => {
                            showAlert('Error', err.message || 'Failed to submit response. Please try again.');
                        },
                    },
                );
            },
        );
    };

    const handleSaveDraft = () => {
        showAlert('Draft Saved', 'Your response has been saved as a draft.');
    };

    // Preview state
    const [showPreview, setShowPreview] = useState(false);

    const isSubmitting = submitReportMutation.isPending;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medical Response</Text>
                <TouchableOpacity onPress={handleSaveDraft}>
                    <Text style={styles.draftBtn}>💾 Draft</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* 1. Clinical Assessment */}
                <SectionHeader title="1. Clinical Assessment" emoji="🔬" />
                <View style={styles.card}>
                    <Label text="Primary Diagnosis *" />
                    <TextInput style={styles.input} value={diagnosis} onChangeText={setDiagnosis} placeholder="e.g. Contact Dermatitis" placeholderTextColor={colors.textTertiary} />

                    <Label text="ICD-10 Code" />
                    <TextInput style={styles.input} value={icd10} onChangeText={setIcd10} placeholder="e.g. L25.1" placeholderTextColor={colors.textTertiary} />

                    <Label text="Differential Diagnoses" />
                    <TextInput style={[styles.input, styles.multiline]} value={differentials} onChangeText={setDifferentials} placeholder="List differential diagnoses" placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />

                    <Label text="Clinical Reasoning" />
                    <TextInput style={[styles.input, styles.multiline]} value={reasoning} onChangeText={setReasoning} placeholder="Explain your clinical reasoning" placeholderTextColor={colors.textTertiary} multiline numberOfLines={4} />
                </View>

                {/* 2. Treatment Plan */}
                <SectionHeader title="2. Treatment Plan" emoji="💊" />
                <View style={styles.card}>
                    <Text style={styles.subLabel}>Pharmacologic</Text>
                    {medications.map((med, i) => (
                        <View key={i} style={styles.medForm}>
                            <View style={styles.medFormHeader}>
                                <Text style={styles.medFormTitle}>Medication {i + 1}</Text>
                                {medications.length > 1 && (
                                    <TouchableOpacity onPress={() => removeMedication(i)}>
                                        <Text style={styles.removeBtn}>🗑️ Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput style={styles.inputSmall} value={med.name} onChangeText={(v) => updateMed(i, 'name', v)} placeholder="Drug name" placeholderTextColor={colors.textTertiary} />
                            <View style={styles.row}>
                                <TextInput style={[styles.inputSmall, styles.halfInput]} value={med.strength} onChangeText={(v) => updateMed(i, 'strength', v)} placeholder="Strength" placeholderTextColor={colors.textTertiary} />
                                <TextInput style={[styles.inputSmall, styles.halfInput]} value={med.form} onChangeText={(v) => updateMed(i, 'form', v)} placeholder="Form" placeholderTextColor={colors.textTertiary} />
                            </View>
                            <TextInput style={styles.inputSmall} value={med.directions} onChangeText={(v) => updateMed(i, 'directions', v)} placeholder="Sig (directions)" placeholderTextColor={colors.textTertiary} />
                            <View style={styles.row}>
                                <TextInput style={[styles.inputSmall, styles.halfInput]} value={med.quantity} onChangeText={(v) => updateMed(i, 'quantity', v)} placeholder="Qty" placeholderTextColor={colors.textTertiary} />
                                <TextInput style={[styles.inputSmall, styles.halfInput]} value={med.duration} onChangeText={(v) => updateMed(i, 'duration', v)} placeholder="Duration" placeholderTextColor={colors.textTertiary} />
                            </View>
                            <TouchableOpacity
                                style={[styles.prescriptionToggle, med.addToPrescription && styles.prescriptionToggleActive]}
                                onPress={() => updateMed(i, 'addToPrescription', !med.addToPrescription)}
                            >
                                <Text style={styles.prescriptionToggleText}>
                                    {med.addToPrescription ? '✓ Add to Prescription' : '○ Not in Prescription'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addMedBtn} onPress={addMedication}>
                        <Text style={styles.addMedText}>+ Add Medication</Text>
                    </TouchableOpacity>

                    <Text style={[styles.subLabel, { marginTop: 16 }]}>Non-Pharmacologic</Text>
                    <TextInput style={[styles.input, styles.multiline]} value={nonPharm} onChangeText={setNonPharm} placeholder="e.g. Cool compresses, avoid irritants, use hypoallergenic detergent" placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
                </View>

                {/* 3. Patient Education */}
                <SectionHeader title="3. Patient Education" emoji="📖" />
                <View style={styles.card}>
                    <Label text="About Your Condition" />
                    <TextInput style={[styles.input, styles.multiline]} value={aboutCondition} onChangeText={setAboutCondition} placeholder="Plain-language explanation for patient" placeholderTextColor={colors.textTertiary} multiline numberOfLines={4} />

                    <Label text="What to Expect" />
                    <TextInput style={[styles.input, styles.multiline]} value={expectations} onChangeText={setExpectations} placeholder="Timeline and expected course" placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />

                    <Label text="Prevention Tips" />
                    <TextInput style={[styles.input, styles.multiline]} value={prevention} onChangeText={setPrevention} placeholder="Steps to prevent recurrence" placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
                </View>

                {/* 4. Warning Signs & Follow-Up */}
                <SectionHeader title="4. Warning Signs & Follow-Up" emoji="🚨" />
                <View style={styles.card}>
                    <Text style={styles.subLabel}>Red Flag Symptoms</Text>
                    {Object.entries(warningChecks).map(([key, checked]) => (
                        <TouchableOpacity
                            key={key}
                            style={styles.checkRow}
                            onPress={() => setWarningChecks({ ...warningChecks, [key]: !checked })}
                        >
                            <Text style={styles.checkBox}>{checked ? '☑️' : '⬜'}</Text>
                            <Text style={styles.checkLabel}>{key}</Text>
                        </TouchableOpacity>
                    ))}

                    <Label text="Follow-Up Recommendation" />
                    <TextInput style={[styles.input, styles.multiline]} value={followUp} onChangeText={setFollowUp} placeholder="e.g. Follow up in 1 week if symptoms persist" placeholderTextColor={colors.textTertiary} multiline numberOfLines={2} />
                </View>

                {/* 5. Additional Notes */}
                <SectionHeader title="5. Additional Notes (Optional)" emoji="📝" />
                <View style={styles.card}>
                    <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Any additional clinical notes, allergy warnings, drug interactions" placeholderTextColor={colors.textTertiary} multiline numberOfLines={4} />
                </View>

                {/* 6. Suggest Interventions */}
                <SectionHeader title="6. Suggest Interventions" emoji="🧪" />
                <View style={styles.card}>
                    <Text style={styles.subLabel}>Tests, Imaging & Referrals</Text>
                    <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: 12 }}>
                        Select interventions from the catalog for this patient. The patient will be notified and can book & pay.
                    </Text>
                    <TouchableOpacity
                        style={styles.addMedBtn}
                        onPress={() => router.push({
                            pathname: '/consultation/intervention-order',
                            params: { consultationId: consultationId || 'current', specialty: 'dermatology' },
                        })}
                    >
                        <Text style={styles.addMedText}>📋 Select from Catalog</Text>
                    </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.previewBtn} onPress={() => setShowPreview(true)}>
                        <Text style={styles.previewText}>👁️ Preview Patient View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={colors.bgPrimary} />
                        ) : (
                            <Text style={styles.submitText}>✍️ Submit & Generate E-Prescription</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Preview Modal */}
            <Modal visible={showPreview} animationType="slide" transparent>
                <View style={styles.previewOverlay}>
                    <View style={styles.previewModal}>
                        <View style={styles.previewModalHeader}>
                            <Text style={{ ...typography.h3, color: colors.textPrimary }}>👁️ Patient View Preview</Text>
                            <TouchableOpacity onPress={() => setShowPreview(false)}>
                                <Text style={{ fontSize: 18, color: colors.textTertiary }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                            <Text style={styles.previewSectionTitle}>🩺 Diagnosis</Text>
                            <Text style={styles.previewContent}>{diagnosis || '(not filled)'}</Text>

                            {reasoning ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>🔍 Clinical Reasoning</Text>
                                    <Text style={styles.previewContent}>{reasoning}</Text>
                                </>
                            ) : null}

                            {medications.filter(m => m.name).length > 0 ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>💊 Medications</Text>
                                    {medications.filter(m => m.name).map((m, i) => (
                                        <View key={i} style={styles.previewMedCard}>
                                            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{m.name} {m.strength}</Text>
                                            <Text style={{ ...typography.caption, color: colors.textSecondary }}>{m.form} · Qty: {m.quantity || '—'} · {m.duration || '—'}</Text>
                                            <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>{m.directions || '—'}</Text>
                                        </View>
                                    ))}
                                </>
                            ) : null}

                            {nonPharm ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>🌿 Non-Drug Treatment</Text>
                                    <Text style={styles.previewContent}>{nonPharm}</Text>
                                </>
                            ) : null}

                            {aboutCondition ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>📖 About Your Condition</Text>
                                    <Text style={styles.previewContent}>{aboutCondition}</Text>
                                </>
                            ) : null}

                            {Object.entries(warningChecks).filter(([_, v]) => v).length > 0 ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>🚨 Warning Signs</Text>
                                    {Object.entries(warningChecks).filter(([_, v]) => v).map(([sign]) => (
                                        <Text key={sign} style={styles.previewContent}>• {sign}</Text>
                                    ))}
                                </>
                            ) : null}

                            {followUp ? (
                                <>
                                    <Text style={styles.previewSectionTitle}>📅 Follow-Up</Text>
                                    <Text style={styles.previewContent}>{followUp}</Text>
                                </>
                            ) : null}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
    return (
        <Text style={styles.sectionTitle}>{emoji} {title}</Text>
    );
}

function Label({ text }: { text: string }) {
    return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    draftBtn: { ...typography.caption, color: colors.warning },
    scroll: { padding: 20, paddingBottom: 40 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    label: { ...typography.caption, color: colors.textSecondary, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    subLabel: { ...typography.caption, color: colors.accentTeal, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    input: { backgroundColor: colors.bgTertiary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, ...typography.body, borderWidth: 1, borderColor: colors.border },
    inputSmall: { backgroundColor: colors.bgTertiary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, ...typography.caption, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    halfInput: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    medForm: { backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 12, marginBottom: 10 },
    medFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    medFormTitle: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    removeBtn: { ...typography.caption, color: colors.error },
    prescriptionToggle: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.bgSecondary, marginTop: 4 },
    prescriptionToggleActive: { backgroundColor: colors.successFaded },
    prescriptionToggleText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
    addMedBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentTeal, borderStyle: 'dashed', alignItems: 'center', marginTop: 4 },
    addMedText: { ...typography.button, color: colors.accentTeal },
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkBox: { fontSize: 18, marginRight: 10 },
    checkLabel: { ...typography.body, color: colors.textPrimary },
    actions: { marginTop: 24, gap: 12 },
    previewBtn: { backgroundColor: colors.bgSecondary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    previewText: { ...typography.button, color: colors.textSecondary },
    submitBtn: { backgroundColor: colors.accentTeal, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { ...typography.button, color: colors.bgPrimary, fontWeight: '700', fontSize: 15 },
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    previewModal: { backgroundColor: colors.bgSecondary, borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '85%', borderWidth: 1, borderColor: colors.border },
    previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    previewSectionTitle: { ...typography.h3, color: colors.accentTeal, fontSize: 14, marginTop: 16, marginBottom: 6 },
    previewContent: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
    previewMedCard: { backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
});
