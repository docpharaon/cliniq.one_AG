import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';
import { usePatientNotifications } from '../../hooks/usePatientNotifications';

export default function TabLayout() {
    const { unreadCount } = usePatientNotifications();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.accentTeal,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('tabs.home'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="consultations"
                options={{
                    title: t('tabs.consultations'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: t('tabs.notifications'),
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: t('tabs.wallet'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.bgSecondary,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 85,
        paddingBottom: 20,
        paddingTop: 8,
    },
    tabLabel: {
        ...typography.caption,
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -10,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '700',
    },
});

