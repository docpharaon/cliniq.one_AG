import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { supabase, safeFetch } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { COUNTRIES } from '@cliniqone/config';
import type { Gender } from '@cliniqone/types';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

// ── City data per country ────────────────────
const CITIES: Record<string, string[]> = {
    SA: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran', 'Tabuk', 'Abha', 'Other'],
    AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain', 'Other'],
    KW: ['Kuwait City', 'Hawalli', 'Salmiya', 'Other'],
    BH: ['Manama', 'Muharraq', 'Riffa', 'Other'],
    QA: ['Doha', 'Al Wakrah', 'Al Khor', 'Other'],
    OM: ['Muscat', 'Salalah', 'Sohar', 'Other'],
};

// ── Insurance providers ──────────────────────
const INSURANCE_PROVIDERS: Record<string, string[]> = {
    SA: ['Bupa Arabia', 'Tawuniya', 'MedGulf', 'CCHI', 'Malath', 'Al Rajhi Takaful', 'Other'],
    AE: ['Daman', 'AXA', 'ADNIC', 'Oman Insurance', 'MetLife', 'Cigna', 'Other'],
    KW: ['Gulf Insurance Group', 'Warba Insurance', 'Other'],
    BH: ['GIG Bahrain', 'Solidarity', 'Other'],
    QA: ['Qatar Insurance', 'QLM', 'Other'],
    OM: ['National Life', 'Oman Insurance', 'Other'],
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1924 - 12 }, (_, i) => currentYear - 13 - i);

type InsuranceChoice = 'yes' | 'no' | null;

export default function PersonalDetailsScreen() {
    const [yearOfBirth, setYearOfBirth] = useState<number | null>(null);
    const [gender, setGender] = useState<Gender | null>(null);
    const [country, setCountry] = useState<string | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [hasInsurance, setHasInsurance] = useState<InsuranceChoice>(null);
    const [insuranceProvider, setInsuranceProvider] = useState<string | null>(null);
    const [emailNotif, setEmailNotif] = useState(true);
    const [smsNotif, setSmsNotif] = useState(true);
    const [whatsappNotif, setWhatsappNotif] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const toast = useToast((s) => s.show);

    // ── Sections open/closed ─────────────────
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [showInsurancePicker, setShowInsurancePicker] = useState(false);

    const calculatedAge = yearOfBirth ? currentYear - yearOfBirth : null;
    const cities = country ? CITIES[country] || [] : [];
    const insuranceProviders = country ? INSURANCE_PROVIDERS[country] || [] : [];
    const hasAtLeastOneNotif = emailNotif || smsNotif || whatsappNotif;

    const isValid = yearOfBirth && gender && country && city && hasInsurance !== null && hasAtLeastOneNotif;

    async function handleComplete() {
        if (!isValid) return;
        setLoading(true);
        setFormError('');

        try {
            console.log('[Registration] Starting profile update...');

            // Try getSession first (fast, cached), then refreshSession with timeout
            let session = null;
            const { data: sessionData } = await safeFetch(
                () => supabase.auth.getSession(),
                { timeout: 5000, retries: 0, label: 'getSession' },
            );
            session = sessionData?.session;
            console.log('[Registration] getSession:', !!session);

            if (!session) {
                const refreshResult = await safeFetch(
                    () => supabase.auth.refreshSession(),
                    { timeout: 5000, retries: 0, label: 'refreshSession' },
                );
                session = refreshResult?.data?.session;
                console.log('[Registration] refreshSession:', !!session);
            }

            if (!session?.user?.id) {
                throw new Error('Not authenticated. Please go back and sign in again.');
            }

            console.log('[Registration] User ID:', session.user.id);

            const { data: updateData, error, count } = await safeFetch(
                () => supabase
                    .from('users')
                    .update({
                        year_of_birth: yearOfBirth,
                        gender: gender!,
                        country: country!,
                        city: city!,
                        insurance_provider: hasInsurance === 'yes' ? insuranceProvider : null,
                        onboarding_completed: true,
                    })
                    .eq('id', session!.user.id)
                    .select(),
                { timeout: 8000, retries: 1, label: 'updateProfile' },
            );

            console.log('[Registration] Update result:', { error: error?.message, rowsUpdated: updateData?.length, count });

            if (error) throw error;

            if (!updateData || updateData.length === 0) {
                throw new Error('Profile not found. Your user record may not exist yet. Please try signing up again.');
            }

            // Re-initialize auth store with timeout (don't block navigation)
            try {
                await safeFetch(
                    () => useAuthStore.getState().initialize(),
                    { timeout: 3000, retries: 0, label: 'authReinit' },
                );
            } catch {
                console.warn('[Registration] Auth re-init timed out, continuing...');
            }

            console.log('[Registration] Navigating to welcome...');
            router.replace('/(auth)/welcome');
        } catch (err: any) {
            console.error('[Registration] Error:', err);
            const message = err?.message?.includes('timed out')
                ? 'Connection is slow. Please try again.'
                : err?.message || t('errors.serverError');
            setFormError(message);
            toast(message, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.title}>{t('registration.step3Title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('registration.stepOf', { current: '3', total: '3' })}: {t('registration.step3Title')}
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                </View>

                <Text style={styles.sectionLabel}>🧑‍⚕️ {t('registration.tellUsAboutYou')}</Text>
                <Text style={styles.sectionHint}>{t('registration.personalizedCare')}</Text>

                {/* ── Year of Birth ────────────────── */}
                <Text style={styles.fieldLabel}>{t('registration.yearOfBirth')} *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowYearPicker(!showYearPicker)}>
                    <Text style={yearOfBirth ? styles.pickerValue : styles.pickerPlaceholder}>
                        {yearOfBirth ? `${yearOfBirth} (${calculatedAge} years old)` : 'Select year'}
                    </Text>
                    <Text style={styles.pickerArrow}>{showYearPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showYearPicker && (
                    <ScrollView style={styles.pickerList} nestedScrollEnabled>
                        {YEARS.map((year) => (
                            <TouchableOpacity
                                key={year}
                                style={[styles.pickerItem, yearOfBirth === year && styles.pickerItemActive]}
                                onPress={() => { setYearOfBirth(year); setShowYearPicker(false); }}
                            >
                                <Text style={[styles.pickerItemText, yearOfBirth === year && styles.pickerItemTextActive]}>
                                    {year} ({currentYear - year} yrs)
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* ── Gender ──────────────────────── */}
                <Text style={styles.fieldLabel}>{t('registration.gender')} *</Text>
                <View style={styles.radioGroup}>
                    {([
                        { key: 'male' as Gender, label: t('registration.male'), icon: '♂️' },
                        { key: 'female' as Gender, label: t('registration.female'), icon: '♀️' },
                        { key: 'prefer_not_to_say' as Gender, label: t('registration.preferNotToSay'), icon: '—' },
                    ]).map(({ key, label, icon }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.radioItem, gender === key && styles.radioItemActive]}
                            onPress={() => setGender(key)}
                        >
                            <Text style={styles.radioIcon}>{icon}</Text>
                            <Text style={[styles.radioLabel, gender === key && styles.radioLabelActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Country ─────────────────────── */}
                <Text style={styles.fieldLabel}>{t('registration.country')} *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCountryPicker(!showCountryPicker)}>
                    <Text style={country ? styles.pickerValue : styles.pickerPlaceholder}>
                        {country ? `${COUNTRIES.find((c) => c.code === country)?.flag} ${COUNTRIES.find((c) => c.code === country)?.name}` : 'Select country'}
                    </Text>
                    <Text style={styles.pickerArrow}>{showCountryPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showCountryPicker && (
                    <View style={styles.pickerList}>
                        {COUNTRIES.map((c) => (
                            <TouchableOpacity
                                key={c.code}
                                style={[styles.pickerItem, country === c.code && styles.pickerItemActive]}
                                onPress={() => { setCountry(c.code); setCity(null); setShowCountryPicker(false); }}
                            >
                                <Text style={[styles.pickerItemText, country === c.code && styles.pickerItemTextActive]}>
                                    {c.flag} {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── City ────────────────────────── */}
                {country && (
                    <>
                        <Text style={styles.fieldLabel}>{t('registration.city')} *</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCityPicker(!showCityPicker)}>
                            <Text style={city ? styles.pickerValue : styles.pickerPlaceholder}>
                                {city || 'Select city'}
                            </Text>
                            <Text style={styles.pickerArrow}>{showCityPicker ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {showCityPicker && (
                            <View style={styles.pickerList}>
                                {cities.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.pickerItem, city === c && styles.pickerItemActive]}
                                        onPress={() => { setCity(c); setShowCityPicker(false); }}
                                    >
                                        <Text style={[styles.pickerItemText, city === c && styles.pickerItemTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* ── Insurance ───────────────────── */}
                <Text style={styles.fieldLabel}>{t('registration.haveInsurance')}</Text>
                <View style={styles.radioGroup}>
                    <TouchableOpacity
                        style={[styles.radioItem, hasInsurance === 'yes' && styles.radioItemActive]}
                        onPress={() => setHasInsurance('yes')}
                    >
                        <Text style={[styles.radioLabel, hasInsurance === 'yes' && styles.radioLabelActive]}>
                            ✅ {t('registration.yesInsurance')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.radioItem, hasInsurance === 'no' && styles.radioItemActive]}
                        onPress={() => { setHasInsurance('no'); setInsuranceProvider(null); }}
                    >
                        <Text style={[styles.radioLabel, hasInsurance === 'no' && styles.radioLabelActive]}>
                            💳 {t('registration.noInsurance')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {hasInsurance === 'yes' && country && insuranceProviders.length > 0 && (
                    <>
                        <Text style={styles.fieldLabel}>{t('registration.insuranceProvider')}</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowInsurancePicker(!showInsurancePicker)}>
                            <Text style={insuranceProvider ? styles.pickerValue : styles.pickerPlaceholder}>
                                {insuranceProvider || 'Select provider'}
                            </Text>
                            <Text style={styles.pickerArrow}>{showInsurancePicker ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {showInsurancePicker && (
                            <View style={styles.pickerList}>
                                {insuranceProviders.map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.pickerItem, insuranceProvider === p && styles.pickerItemActive]}
                                        onPress={() => { setInsuranceProvider(p); setShowInsurancePicker(false); }}
                                    >
                                        <Text style={[styles.pickerItemText, insuranceProvider === p && styles.pickerItemTextActive]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <Text style={styles.insuranceHint}>💡 {t('registration.addLater')}</Text>
                    </>
                )}

                {/* ── Communication Preferences ──── */}
                <Text style={[styles.fieldLabel, { marginTop: spacing['2xl'] }]}>{t('registration.commPrefs')}</Text>
                <View style={styles.checkboxGroup}>
                    <CheckboxRow label={`📧 ${t('registration.emailNotif')}`} checked={emailNotif} onToggle={() => setEmailNotif(!emailNotif)} />
                    <CheckboxRow label={`📱 ${t('registration.smsNotif')}`} checked={smsNotif} onToggle={() => setSmsNotif(!smsNotif)} />
                    <CheckboxRow label={`💬 ${t('registration.whatsappNotif')}`} checked={whatsappNotif} onToggle={() => setWhatsappNotif(!whatsappNotif)} />
                </View>
                {!hasAtLeastOneNotif && (
                    <Text style={styles.errorText}>{t('errors.minOneNotif')}</Text>
                )}

                {/* ── Submit ──────────────────────── */}
                {formError ? (
                    <View style={styles.formErrorBanner}>
                        <Text style={styles.formErrorText}>⚠️ {formError}</Text>
                    </View>
                ) : null}
                <View style={{ marginTop: formError ? spacing.md : spacing['2xl'] }}>
                    <Button
                        title={loading ? t('registration.completing') : t('registration.completeReg')}
                        onPress={handleComplete}
                        size="lg"
                        loading={loading}
                        disabled={!isValid}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Checkbox Component ───────────────────────
function CheckboxRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
    return (
        <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['6xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing['2xl'] },
    backButton: { marginBottom: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
    progressBar: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2, marginTop: spacing.md },
    progressFill: { height: 4, backgroundColor: colors.success, borderRadius: 2 },
    sectionLabel: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
    sectionHint: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing['2xl'] },
    fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },

    // Picker
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
    },
    pickerValue: { ...typography.body, color: colors.textPrimary },
    pickerPlaceholder: { ...typography.body, color: colors.textTertiary },
    pickerArrow: { color: colors.textTertiary, fontSize: 12 },
    pickerList: {
        maxHeight: 200,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        marginTop: spacing.xs,
    },
    pickerItem: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    pickerItemActive: { backgroundColor: colors.accentTealFaded },
    pickerItemText: { ...typography.body, color: colors.textPrimary },
    pickerItemTextActive: { color: colors.accentTeal, fontWeight: '600' },

    // Radio
    radioGroup: { gap: spacing.sm },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    radioItemActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    radioIcon: { fontSize: 18 },
    radioLabel: { ...typography.body, color: colors.textPrimary },
    radioLabelActive: { color: colors.accentTeal, fontWeight: '600' },

    // Checkboxes
    checkboxGroup: { gap: spacing.sm },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.textTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    checkmark: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
    checkboxLabel: { ...typography.body, color: colors.textPrimary },

    // Insurance hint
    insuranceHint: { ...typography.bodySm, color: colors.textTertiary, marginTop: spacing.sm },

    // Error
    errorText: { ...typography.bodySm, color: colors.error, marginTop: spacing.xs },
    formErrorBanner: {
        backgroundColor: colors.errorFaded,
        padding: spacing.md,
        borderRadius: radius.md,
        marginTop: spacing['2xl'],
        borderLeftWidth: 3,
        borderLeftColor: colors.error,
    },
    formErrorText: { ...typography.body, color: colors.error },
});
