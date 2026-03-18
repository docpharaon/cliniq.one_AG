import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@cliniqone/ui';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { useToast } from '../../components/ToastProvider';

interface NotifPrefs {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    consultUpdate: boolean;
    reportReady: boolean;
    tokenPurchase: boolean;
    promotions: boolean;
}

export default function NotificationsScreen() {
    const [prefs, setPrefs] = useState<NotifPrefs>({
        email: true,
        sms: true,
        whatsapp: false,
        push: true,
        consultUpdate: true,
        reportReady: true,
        tokenPurchase: true,
        promotions: false,
    });
    const [saving, setSaving] = useState(false);
    const toast = useToast((s) => s.show);

    function toggle(key: keyof NotifPrefs) {
        setPrefs({ ...prefs, [key]: !prefs[key] });
    }

    async function handleSave() {
        setSaving(true);
        // In production: save to user profile
        await new Promise((r) => setTimeout(r, 500));
        setSaving(false);
        toast('Notification preferences saved!', 'success');
        router.back();
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🔔 {t('profile.notifications')}</Text>
                </View>

                {/* Channels */}
                <Text style={styles.sectionTitle}>Channels</Text>
                <View style={styles.card}>
                    <ToggleRow icon="📱" label="Push Notifications" value={prefs.push} onToggle={() => toggle('push')} />
                    <ToggleRow icon="📧" label="Email" value={prefs.email} onToggle={() => toggle('email')} />
                    <ToggleRow icon="💬" label="SMS" value={prefs.sms} onToggle={() => toggle('sms')} />
                    <ToggleRow icon="📲" label="WhatsApp" value={prefs.whatsapp} onToggle={() => toggle('whatsapp')} last />
                </View>

                {/* Event Types */}
                <Text style={styles.sectionTitle}>What to notify</Text>
                <View style={styles.card}>
                    <ToggleRow icon="🔄" label="Consultation Updates" desc="Status changes, doctor assignment" value={prefs.consultUpdate} onToggle={() => toggle('consultUpdate')} />
                    <ToggleRow icon="📋" label="Report Ready" desc="When your doctor completes the report" value={prefs.reportReady} onToggle={() => toggle('reportReady')} />
                    <ToggleRow icon="💰" label="Token Purchases" desc="Payment confirmations" value={prefs.tokenPurchase} onToggle={() => toggle('tokenPurchase')} />
                    <ToggleRow icon="🎁" label="Promotions & Offers" desc="Special deals and announcements" value={prefs.promotions} onToggle={() => toggle('promotions')} last />
                </View>

                <View style={{ marginTop: spacing.xl }}>
                    <Button
                        title={saving ? 'Saving...' : 'Save Preferences'}
                        onPress={handleSave}
                        size="lg"
                        disabled={saving}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function ToggleRow({ icon, label, desc, value, onToggle, last }: {
    icon: string; label: string; desc?: string;
    value: boolean; onToggle: () => void; last?: boolean;
}) {
    return (
        <View style={[styles.toggleRow, !last && styles.toggleRowBorder]}>
            <Text style={styles.toggleIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{label}</Text>
                {desc && <Text style={styles.toggleDesc}>{desc}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: colors.bgTertiary, true: colors.accentTealFaded }}
                thumbColor={value ? colors.accentTeal : colors.textTertiary}
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

    sectionTitle: { ...typography.label, color: colors.textTertiary, textTransform: 'uppercase' as const, marginBottom: spacing.sm, marginTop: spacing.xl },

    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    toggleRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
    toggleIcon: { fontSize: 20 },
    toggleLabel: { ...typography.body, color: colors.textPrimary },
    toggleDesc: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
});
