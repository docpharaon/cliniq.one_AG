import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors, typography } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

export default function TabLayout() {
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
                    tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🏠</Text>,
                }}
            />
            <Tabs.Screen
                name="consultations"
                options={{
                    title: t('tabs.consultations'),
                    tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>📋</Text>,
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: t('tabs.wallet'),
                    tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>💰</Text>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>👤</Text>,
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
    icon: {
        fontSize: 22,
    },
});
