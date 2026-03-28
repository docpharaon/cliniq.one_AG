import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { updateUserProfile, safeFetch } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { t, getLocale } from '@cliniqone/i18n';
import { COUNTRIES } from '@cliniqone/config';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';

const GENDERS = [
    { key: 'male', labelKey: 'settings.genderMale' },
    { key: 'female', labelKey: 'settings.genderFemale' },
    { key: 'prefer_not_to_say', labelKey: 'settings.genderPreferNot' },
];



export default function EditProfileScreen() {
    const { user, setUser } = useAuthStore();
    const [saving, setSaving] = useState(false);
    const toast = useToast((s) => s.show);

    const [nickname, setNickname] = useState(user?.nickname || '');
    const [yearOfBirth, setYearOfBirth] = useState(String(user?.year_of_birth || ''));
    const [gender, setGender] = useState(user?.gender || '');
    const [country, setCountry] = useState(user?.country || '');
    const [city, setCity] = useState(user?.city || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [insurance, setInsurance] = useState(user?.insurance_provider || '');
    const [policyNumber, setPolicyNumber] = useState(user?.insurance_policy_number || '');

    async function handleSave() {
        if (!nickname.trim()) {
            toast(t('settings.nicknameRequired'), 'warning');
            return;
        }

        setSaving(true);
        try {
            const updates = {
                nickname: nickname.trim(),
                year_of_birth: yearOfBirth ? parseInt(yearOfBirth) : null,
                gender: gender || null,
                country: country || null,
                city: city.trim() || null,
                phone: phone.trim() || null,
                insurance_provider: insurance.trim() || null,
                insurance_policy_number: policyNumber.trim() || null,
            };

            await safeFetch(
                () => updateUserProfile(updates as any),
                { timeout: 8000, retries: 1, label: 'updateProfile' },
            );
            setUser({ ...user!, ...updates } as any);
            toast(t('settings.profileUpdated'), 'success');
            router.back();
        } catch (err: any) {
            toast(err?.message?.includes('timed out') ? t('settings.connectionSlow') : t('settings.saveFailed'), 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.title}>👤 {t('profile.editProfile')}</Text>
                </View>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{nickname?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <Text style={styles.avatarHint}>{t('settings.tapToChangePhoto')}</Text>
                </View>

                {/* Form Fields */}
                <Text style={styles.sectionTitle}>{t('settings.personalInfo')}</Text>

                <FormField label={t('settings.nickname')} value={nickname} onChangeText={setNickname} placeholder={t('settings.nicknamePlaceholder')} />
                <FormField label={t('settings.emailLabel')} value={user?.email || ''} editable={false} />
                <FormField label={t('settings.phoneLabel')} value={phone} onChangeText={setPhone} placeholder={t('settings.phonePlaceholder')} keyboardType="phone-pad" />
                <FormField label={t('settings.yearOfBirth')} value={yearOfBirth} onChangeText={setYearOfBirth} placeholder={t('settings.yearPlaceholder')} keyboardType="number-pad" maxLength={4} />

                {/* Gender */}
                <Text style={styles.fieldLabel}>{t('registration.gender')}</Text>
                <View style={styles.genderRow}>
                    {GENDERS.map((g) => (
                        <TouchableOpacity
                            key={g.key}
                            style={[styles.genderOption, gender === g.key && styles.genderActive]}
                            onPress={() => setGender(g.key)}
                        >
                            <Text style={[styles.genderText, gender === g.key && styles.genderTextActive]}>{t(g.labelKey)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Location */}
                <Text style={styles.sectionTitle}>{t('settings.location')}</Text>

                <Text style={styles.fieldLabel}>{t('registration.country')}</Text>
                <View style={styles.countryChips}>
                    {COUNTRIES.map((c) => (
                        <TouchableOpacity
                            key={c.code}
                            style={[styles.countryChip, country === c.code && styles.countryChipActive]}
                            onPress={() => setCountry(c.code)}
                        >
                            <Text style={[styles.countryChipText, country === c.code && styles.countryChipTextActive]}>{c.flag} {getLocale() === 'ar' ? c.nameAr : c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <FormField label={t('registration.city')} value={city} onChangeText={setCity} placeholder={t('settings.cityPlaceholder')} />

                {/* Insurance */}
                <Text style={styles.sectionTitle}>{t('settings.insuranceSection')}</Text>
                <FormField label={t('registration.insuranceProvider')} value={insurance} onChangeText={setInsurance} placeholder={t('settings.insurancePlaceholder')} />
                <FormField label={t('settings.policyNumber')} value={policyNumber} onChangeText={setPolicyNumber} placeholder={t('settings.optional')} />

                {/* Save */}
                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title={saving ? t('settings.saving') : t('settings.saveChanges')}
                        onPress={handleSave}
                        size="lg"
                        disabled={saving}
                    />
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function FormField({ label, value, onChangeText, placeholder, editable = true, keyboardType, maxLength }: {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    editable?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'number-pad';
    maxLength?: number;
}) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textTertiary}
                editable={editable}
                keyboardType={keyboardType}
                maxLength={maxLength}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
    header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
    backText: { ...typography.body, color: colors.accentTeal, marginBottom: spacing.md },
    title: { ...typography.h2, color: colors.textPrimary },

    avatarSection: { alignItems: 'center', marginBottom: spacing['2xl'] },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    avatarText: { fontSize: 32, fontWeight: '700', color: colors.accentTeal },
    avatarHint: { ...typography.caption, color: colors.accentTeal },

    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },

    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    inputDisabled: { opacity: 0.5 },

    genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    genderOption: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
    },
    genderActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    genderText: { ...typography.bodySm, color: colors.textSecondary },
    genderTextActive: { color: colors.accentTeal, fontWeight: '600' },

    countryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    countryChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    countryChipActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTealFaded },
    countryChipText: { ...typography.bodySm, color: colors.textSecondary },
    countryChipTextActive: { color: colors.accentTeal, fontWeight: '600' },
});
