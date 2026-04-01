import { NavLink, useLocation } from 'react-router-dom';
import { haptic } from '../hooks/useHaptics';
import { colors, typography, Home, ClipboardList, BarChart, User, Settings } from '@cliniqone/ui';
import type { CSSProperties, ReactNode } from 'react';
import type { CliniqIconProps } from '@cliniqone/ui';

const tabs: { path: string; label: string; Icon: (p: CliniqIconProps) => ReactNode; end?: boolean }[] = [
    { path: '/tabs',         label: 'Home',      Icon: Home, end: true },
    { path: '/tabs/queue',   label: 'Queue',     Icon: ClipboardList },
    { path: '/tabs/analytics', label: 'Analytics', Icon: BarChart },
    { path: '/tabs/profile', label: 'Profile',   Icon: User },
    { path: '/tabs/settings', label: 'Settings',  Icon: Settings },
];

const styles = {
    bar: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        height: 85,
        paddingBottom: 20,
        paddingTop: 8,
    } as CSSProperties,
    tab: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        textDecoration: 'none',
    } as CSSProperties,
    label: {
        fontSize: typography.caption.fontSize,
        fontWeight: 600,
    } as CSSProperties,
};

export function TabBar() {
    const location = useLocation();

    return (
        <nav style={styles.bar}>
            {tabs.map((tab) => {
                const isActive = tab.end
                    ? location.pathname === tab.path
                    : location.pathname.startsWith(tab.path);
                const color = isActive ? colors.accentTeal : colors.textTertiary;
                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.end}
                        style={styles.tab}
                        className="pressable"
                        onClick={() => haptic.select()}
                    >
                        <tab.Icon size={22} color={color} />
                        <span style={{ ...styles.label, color }}>
                            {tab.label}
                        </span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
