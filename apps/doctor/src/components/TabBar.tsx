import { NavLink } from 'react-router-dom';
import { haptic } from '../hooks/useHaptics';
import { typography, Home, ClipboardList, BarChart, User, Settings, useTheme } from '@cliniqone/ui';
import type { CSSProperties, ReactNode } from 'react';
import type { CliniqIconProps } from '@cliniqone/ui';

const tabs: { path: string; label: string; Icon: (p: CliniqIconProps) => ReactNode; end?: boolean }[] = [
    { path: '/tabs',         label: 'Home',      Icon: Home, end: true },
    { path: '/tabs/queue',   label: 'Queue',     Icon: ClipboardList },
    { path: '/tabs/analytics', label: 'Analytics', Icon: BarChart },
    { path: '/tabs/profile', label: 'Profile',   Icon: User },
    { path: '/tabs/settings', label: 'Settings',  Icon: Settings },
];

export function TabBar() {
    const { colors, isDark } = useTheme();

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
                    end={tab.end}
                    onClick={() => haptic.select()}
                    style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}
                >
                    {({ isActive }) => {
                        const color = isActive ? colors.accentTeal : colors.textTertiary;
                        return (
                            <>
                                <tab.Icon size={22} color={color} />
                                <span style={{ ...s.tabLabel, color }}>{tab.label}</span>
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
