import type { CSSProperties, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { typography, Home, FileText, Bell, Coins, User, useTheme } from '@cliniqone/ui';
import type { CliniqIconProps } from '@cliniqone/ui';
import { t, useLocale } from '@cliniqone/i18n';
import { haptic } from '../hooks/useHaptics';

const tabs: { path: string; label: () => string; Icon: (p: CliniqIconProps) => ReactNode }[] = [
    { path: '/tabs', label: () => t('tabs.home'), Icon: Home },
    { path: '/tabs/consultations', label: () => t('tabs.consultations'), Icon: FileText },
    { path: '/tabs/notifications', label: () => t('tabs.notifications'), Icon: Bell },
    { path: '/tabs/wallet', label: () => t('tabs.wallet'), Icon: Coins },
    { path: '/tabs/profile', label: () => t('tabs.profile'), Icon: User },
];

export function TabBar() {
    useLocale(); // Re-render when locale changes
    const { colors, isDark } = useTheme(); // Reactive theme colors

    const tabBarStyle: CSSProperties = {
        display: 'flex',
        backgroundColor: isDark
            ? 'rgba(30, 41, 59, 0.85)'
            : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: `1px solid ${colors.border}`,
        height: 85,
        paddingBottom: 20,
        paddingTop: 8,
    };

    return (
        <nav style={tabBarStyle}>
            {tabs.map((tab) => (
                <NavLink
                    key={tab.path}
                    to={tab.path}
                    end={tab.path === '/tabs'}
                    onClick={() => haptic.light()}
                    style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}
                >
                    {({ isActive }) => {
                        const color = isActive ? colors.accentTeal : colors.textTertiary;
                        return (
                            <>
                                <tab.Icon size={22} color={color} />
                                <span style={{ ...s.tabLabel, color }}>{tab.label()}</span>
                            </>
                        );
                    }}
                </NavLink>
            ))}
        </nav>
    );
}

const s: Record<string, CSSProperties> = {
    tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textDecoration: 'none' },
    tabActive: {},
    tabLabel: { fontSize: typography.caption.fontSize, fontWeight: 600 },
};
