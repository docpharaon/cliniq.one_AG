import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { updateUserProfile } from '@cliniqone/api';
import { useAuthStore } from '../../stores/authStore';
import { t } from '@cliniqone/i18n';

const GENDERS = [
    { key: 'male', label: 'Male' },
    { key: 'female', label: 'Female' },
    { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const COUNTRIES = ['Saudi Arabia', 'UAE', 'Kuwait', 'Bahrain', 'Oman', 'Qatar', 'Egypt', 'Jordan'];

export default function EditProfileScreen() {
    const { user, setUser } = useAuthStore();
    const [saving, setSaving] = useState(false);

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
            Alert.alert('Error', 'Nickname is required');
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

            await updateUserProfile(updates as any);
            setUser({ ...user!, ...updates } as any);
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert('Error', 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>👤 {t('profile.editProfile')}</Text>
                </View>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{nickname?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <Text style={styles.avatarHint}>Tap to change photo</Text>
                </View>

                {/* Form Fields */}
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <FormField label="Nickname" value={nickname} onChangeText={setNickname} placeholder="Your first name" />
                <FormField label="Email" value={user?.email || ''} editable={false} />
                <FormField label="Phone" value={phone} onChangeText={setPhone} placeholder="+966 5XX XXX XXXX" keyboardType="phone-pad" />
                <FormField label="Year of Birth" value={yearOfBirth} onChangeText={setYearOfBirth} placeholder="e.g. 1990" keyboardType="number-pad" maxLength={4} />

                {/* Gender */}
                <Text style={styles.fieldLabel}>{t('registration.gender')}</Text>
                <View style={styles.genderRow}>
                    {GENDERS.map((g) => (
                        <TouchableOpacity
                            key={g.key}
                            style={[styles.genderOption, gender === g.key && styles.genderActive]}
                            onPress={() => setGender(g.key)}
                        >
                            <Text style={[styles.genderText, gender === g.key && styles.genderTextActive]}>{g.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Location */}
                <Text style={styles.sectionTitle}>Location</Text>

                <Text style={styles.fieldLabel}>{t('registration.country')}</Text>
                <View style={styles.countryChips}>
                    {COUNTRIES.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.countryChip, country === c && styles.countryChipActive]}
                            onPress={() => setCountry(c)}
                        >
                            <Text style={[styles.countryChipText, country === c && styles.countryChipTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <FormField label={t('registration.city')} value={city} onChangeText={setCity} placeholder="Your city" />

                {/* Insurance */}
                <Text style={styles.sectionTitle}>Insurance</Text>
                <FormField label={t('registration.insuranceProvider')} value={insurance} onChangeText={setInsurance} placeholder="e.g. Bupa, Tawuniya" />
                <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} placeholder="Optional" />

                {/* Save */}
                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title={saving ? 'Saving...' : 'Save Changes'}
                        onPress={handleSave}
                        size="lg"
                        disabled={saving}
                    />
                </View>
            </ScrollView>
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
