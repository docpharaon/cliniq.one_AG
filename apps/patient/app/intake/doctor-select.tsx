import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { lookupDoctorByCode, searchDoctorsForPatient } from '@cliniqone/api';
import { useIntakeStore } from '../../stores/intakeStore';
import { useToast } from '../../components/ToastProvider';

type DoctorResult = {
    id: string;
    display_name: string;
    full_name: string;
    specialty: string;
    avatar_url: string | null;
    rating_avg: number;
    doctor_type: string;
    identifier_code: string;
    is_accepting?: boolean;
    consultation_fee_tokens?: number;
};

type Tab = 'search' | 'code';

export default function DoctorSelectScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [searchResults, setSearchResults] = useState<DoctorResult[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const setRequestedDoctor = useIntakeStore((s) => s.setRequestedDoctor);
    const toast = useToast((s) => s.show);

    // ── Search doctors ───────────────────────
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const results = await searchDoctorsForPatient(query.trim());
            setSearchResults(results as DoctorResult[]);
        } catch {
            setSearchResults([]);
        }
        setLoading(false);
    }, []);

    // ── Lookup by code ───────────────────────
    async function handleCodeLookup() {
        const code = codeInput.trim().toUpperCase();
        if (!code || code.length < 4) {
            setError('Please enter a valid doctor code (e.g. DR-A3F2)');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const doc = await lookupDoctorByCode(code);
            if (!doc) {
                setError('Doctor not found or credentials expired');
                setSelectedDoctor(null);
            } else {
                setSelectedDoctor(doc as DoctorResult);
                setError('');
            }
        } catch {
            setError('Failed to lookup doctor');
        }
        setLoading(false);
    }

    // ── Confirm selection ────────────────────
    function confirmDoctor(doc: DoctorResult, method: 'search' | 'code' | 'qr') {
        setRequestedDoctor(doc.id, method, doc.consultation_fee_tokens ?? null, doc.specialty ?? null);
        toast(`Selected Dr. ${doc.display_name}`, 'success');
        router.back();
    }

    // ── Skip ─────────────────────────────────
    function handleSkip() {
        setRequestedDoctor(null, 'auto');
        router.back();
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Choose Your Doctor</Text>
                    <Text style={styles.subtitle}>Select a specific doctor or let us assign the best available</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'search' && styles.tabActive]}
                        onPress={() => { setActiveTab('search'); setSelectedDoctor(null); setError(''); }}
                    >
                        <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>🔍 Search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'code' && styles.tabActive]}
                        onPress={() => { setActiveTab('code'); setSearchResults([]); setSelectedDoctor(null); setError(''); }}
                    >
                        <Text style={[styles.tabText, activeTab === 'code' && styles.tabTextActive]}>🔑 Code</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <View style={styles.section}>
                        <TextInput
                            style={styles.input}
                            placeholder="Search by name or specialty..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoCapitalize="none"
                        />
                        {loading && <ActivityIndicator size="small" color={colors.accentTeal} style={{ marginTop: spacing.md }} />}
                        {searchResults.map((doc) => (
                            <DoctorCard
                                key={doc.id}
                                doctor={doc}
                                onSelect={() => confirmDoctor(doc, 'search')}
                            />
                        ))}
                        {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
                            <Text style={styles.emptyText}>No doctors found matching "{searchQuery}"</Text>
                        )}
                    </View>
                )}

                {/* Code Tab */}
                {activeTab === 'code' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionDesc}>
                            Enter the doctor's identifier code (e.g. DR-A3F2)
                        </Text>
                        <View style={styles.codeRow}>
                            <TextInput
                                style={[styles.input, styles.codeInput]}
                                placeholder="DR-XXXX"
                                placeholderTextColor={colors.textTertiary}
                                value={codeInput}
                                onChangeText={(t) => { setCodeInput(t.toUpperCase()); setError(''); }}
                                autoCapitalize="characters"
                                maxLength={7}
                            />
                            <TouchableOpacity
                                style={styles.verifyButton}
                                onPress={handleCodeLookup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.verifyText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        {selectedDoctor && (
                            <DoctorCard
                                doctor={selectedDoctor}
                                onSelect={() => confirmDoctor(selectedDoctor, 'code')}
                                showConfirm
                            />
                        )}
                    </View>
                )}

                {/* Skip */}
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip — Let the clinic assign a doctor</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Doctor Card ──────────────────────────────────
function DoctorCard({ doctor, onSelect, showConfirm }: { doctor: DoctorResult; onSelect: () => void; showConfirm?: boolean }) {
    const isLocum = doctor.doctor_type === 'locum';
    return (
        <View style={styles.doctorCard}>
            <View style={styles.doctorInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {doctor.display_name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.doctorName}>{doctor.display_name}</Text>
                        <View style={[styles.typeBadge, isLocum ? styles.locumBadge : styles.permanentBadge]}>
                            <Text style={[styles.typeBadgeText, isLocum ? styles.locumText : styles.permanentText]}>
                                {isLocum ? 'Locum' : 'Staff'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty?.replace('_', ' ')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Text style={{ color: '#FBBF24', fontSize: 12 }}>★</Text>
                        <Text style={styles.doctorRating}>{Number(doctor.rating_avg).toFixed(1)}</Text>
                        <Text style={styles.doctorCode}>• {doctor.identifier_code}</Text>
                        {doctor.consultation_fee_tokens && doctor.consultation_fee_tokens !== 3 && (
                            <View style={styles.feeBadge}>
                                <Text style={styles.feeText}>💎 {doctor.consultation_fee_tokens} tokens</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
                <Text style={styles.selectText}>{showConfirm ? 'Confirm & Select' : 'Select'}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },

    // Tabs
    tabs: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: `${colors.accentTeal}15`,
        borderColor: colors.accentTeal,
    },
    tabText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.accentTeal },

    // Section
    section: { marginBottom: spacing.xl },
    sectionDesc: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.md },

    // Input
    input: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    codeRow: { flexDirection: 'row', gap: spacing.sm },
    codeInput: { flex: 1, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }), letterSpacing: 2, fontSize: 18, textAlign: 'center' },
    verifyButton: {
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyText: { ...typography.body, color: '#fff', fontWeight: '700' },

    // Error
    errorText: { ...typography.bodySm, color: colors.error, marginTop: spacing.sm },
    emptyText: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },

    // Doctor Card
    doctorCard: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    doctorInfo: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.accentTeal}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { ...typography.label, color: colors.accentTeal, fontWeight: '700' },
    doctorName: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    doctorSpecialty: { ...typography.bodySm, color: colors.textSecondary, textTransform: 'capitalize' },
    doctorRating: { ...typography.bodySm, color: colors.textSecondary },
    doctorCode: { ...typography.caption, color: colors.textTertiary },

    // Type Badge
    typeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    permanentBadge: {
        backgroundColor: `${colors.accentTeal}15`,
        borderColor: `${colors.accentTeal}30`,
    },
    locumBadge: {
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.3)',
    },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    permanentText: { color: colors.accentTeal },
    locumText: { color: '#F59E0B' },

    // Fee Badge
    feeBadge: {
        backgroundColor: 'rgba(99,102,241,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 4,
    },
    feeText: { fontSize: 10, color: '#818CF8', fontWeight: '700' },

    // Select Button
    selectButton: {
        backgroundColor: colors.accentTeal,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    selectText: { ...typography.body, color: '#fff', fontWeight: '700' },

    // Skip
    skipButton: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    skipText: { ...typography.body, color: colors.textTertiary, fontWeight: '500' },
});
