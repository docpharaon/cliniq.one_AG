import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { colors, typography } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { PatientNotification } from '../../hooks/usePatientNotifications';
import { useCapacitorPushNotifications } from '../../hooks/useCapacitorPushNotifications';

const ICON_MAP: Record<string, string> = {
    assigned: '👨‍⚕️',
    report_ready: '📋',
    message: '💬',
    system: '⚙️',
    info: 'ℹ️',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function NotificationItem({ item, onPress }: { item: PatientNotification; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.icon}>{ICON_MAP[item.type] || 'ℹ️'}</Text>
            <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
    );
}

export default function NotificationsScreen() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useCapacitorPushNotifications();

    const handlePress = useCallback((item: PatientNotification) => {
        if (!item.read) markAsRead(item.id);
        if (item.consultation_id) {
            router.push(`/consultation/${item.consultation_id}`);
        }
    }, [markAsRead]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.accentTeal} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('notifications.title') || 'Notifications'}</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationItem item={item} onPress={() => handlePress(item)} />
                )}
                contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyTitle}>No notifications yet</Text>
                        <Text style={styles.emptyText}>You'll receive updates about your consultations here</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refresh}
                        tintColor={colors.accentTeal}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: colors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    markAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0,212,170,0.15)',
    },
    markAllText: {
        ...typography.caption,
        color: colors.accentTeal,
        fontWeight: '600',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bgPrimary,
    },
    itemUnread: {
        backgroundColor: 'rgba(0,212,170,0.05)',
    },
    icon: {
        fontSize: 24,
        marginRight: 12,
        marginTop: 2,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '500',
        marginBottom: 2,
    },
    itemTitleUnread: {
        fontWeight: '700',
    },
    itemMessage: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 4,
    },
    itemTime: {
        ...typography.caption,
        color: colors.textTertiary,
        fontSize: 11,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accentTeal,
        marginTop: 8,
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    emptyText: {
        ...typography.body,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
