import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@cliniqone/api';
import { colors, typography } from '@cliniqone/ui';
import { useAuthStore } from '../../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@doctor_notification_settings';

const DEFAULT_NOTIFICATIONS = {
    newConsultation: true,
    urgentCase: true,
    patientMessage: true,
    weeklySummary: true,
    marketing: false,
};

export default function SettingsScreen() {
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

    // Load persisted settings on mount
    useEffect(() => {
        AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY).then((stored) => {
            if (stored) {
                try {
                    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(stored) });
                } catch { /* use defaults */ }
            }
        });
    }, []);

    const updateNotification = useCallback((key: keyof typeof DEFAULT_NOTIFICATIONS, value: boolean) => {
        setNotifications((prev) => {
            const updated = { ...prev, [key]: value };
            AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    useAuthStore.getState().clear();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>⚙️ Settings</Text>

                {/* Notification Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔔 Notifications</Text>
                    <View style={styles.card}>
                        <SettingToggle
                            label="New Consultation"
                            hint="When a new case enters your queue"
                            value={notifications.newConsultation}
                            onToggle={(v) => updateNotification('newConsultation', v)}
                        />
                        <SettingToggle
                            label="Urgent Cases"
                            hint="Immediate alerts for urgent cases"
                            value={notifications.urgentCase}
                            onToggle={(v) => updateNotification('urgentCase', v)}
                        />
                        <SettingToggle
                            label="Patient Messages"
                            hint="When a patient follows up"
                            value={notifications.patientMessage}
                            onToggle={(v) => updateNotification('patientMessage', v)}
                        />
                        <SettingToggle
                            label="Weekly Summary"
                            hint="Performance and earnings digest"
                            value={notifications.weeklySummary}
                            onToggle={(v) => updateNotification('weeklySummary', v)}
                        />
                        <SettingToggle
                            label="Marketing"
                            hint="News and promotions"
                            value={notifications.marketing}
                            onToggle={(v) => updateNotification('marketing', v)}
                        />
                    </View>
                </View>

                {/* Payment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💳 Payment Information</Text>
                    <View style={styles.card}>
                        <InfoRow label="Bank / IBAN" value="••••••••4521" />
                        <InfoRow label="Tax ID (VAT)" value="Not set" />
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonText}>Update Payment Info</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📱 App</Text>
                    <View style={styles.card}>
                        <InfoRow label="Language" value="English" />
                        <InfoRow label="Version" value="1.0.0" />
                    </View>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🆘 Support</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>📚 Help Center</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>📧 Contact Support</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>📄 Terms of Service</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>🔒 Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingToggle({ label, hint, value, onToggle }: { label: string; hint: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleHint}>{hint}</Text>
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

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12 },
    card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    toggleInfo: { flex: 1, marginRight: 12 },
    toggleLabel: { ...typography.body, color: colors.textPrimary },
    toggleHint: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { ...typography.caption, color: colors.textTertiary },
    infoValue: { ...typography.body, color: colors.textPrimary },
    editButton: { marginTop: 12, backgroundColor: colors.accentTealFaded, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    editButtonText: { ...typography.button, color: colors.accentTeal, fontWeight: '600' },
    linkRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    linkText: { ...typography.body, color: colors.textPrimary },
    logoutButton: { backgroundColor: colors.errorFaded, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    logoutText: { ...typography.button, color: colors.error, fontWeight: '700' },
});
