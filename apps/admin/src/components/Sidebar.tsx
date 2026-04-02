import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Stethoscope,
    FileText,
    ShieldAlert,
    Coins,
    Settings,
    BarChart3,
    UserCog,
    Bot,
    DollarSign,
    AlertTriangle,
    CalendarDays,
    Megaphone,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LogOut,
    Activity,
    ClipboardList,
    Fingerprint,
    Bell,
    X,
    Lightbulb,
    FlaskConical,
    Crown,
    RotateCcw,
    ShieldOff,
    ClipboardCheck,
    type LucideIcon,
    Sun,
    Moon,
} from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from './SidebarContext';
import { useAdminAuth } from './AdminAuthProvider';
import { useAdminTheme } from '@/lib/themeStore';
import { haptic } from '@/lib/useHaptics';

const mainNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Patients', href: '/dashboard/users', icon: Users },
    { label: 'Doctors', href: '/dashboard/doctors', icon: Stethoscope },
    { label: 'Consultations', href: '/dashboard/consultations', icon: FileText },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

type NavItem = { label: string; href: string; icon: LucideIcon; superadminOnly?: boolean };

const managementGroups: { title: string; items: NavItem[] }[] = [
    {
        title: 'Clinical',
        items: [
            { label: 'Interventions', href: '/dashboard/interventions', icon: ClipboardList },
            { label: 'ICD Codes', href: '/dashboard/icd-codes', icon: FileText },
            { label: 'Protocol Alerts', href: '/dashboard/protocols', icon: ShieldAlert, superadminOnly: true },
            { label: 'Error Reports', href: '/dashboard/errors', icon: AlertTriangle },
        ],
    },
    {
        title: 'Operations',
        items: [
            { label: 'Applications', href: '/dashboard/applications', icon: ClipboardCheck },
            { label: 'Specialties', href: '/dashboard/specialties', icon: ShieldOff },
            { label: 'Testers', href: '/dashboard/testers', icon: FlaskConical, superadminOnly: true },
            { label: 'HR Management', href: '/dashboard/hr', icon: UserCog, superadminOnly: true },
            { label: 'Scheduling', href: '/dashboard/scheduling', icon: CalendarDays },
            { label: 'Send Notification', href: '/dashboard/notifications', icon: Bell },
            { label: 'AI', href: '/dashboard/ai', icon: Bot, superadminOnly: true },
            { label: 'ID Verification', href: '/dashboard/kyc', icon: Fingerprint, superadminOnly: true },
        ],
    },
    {
        title: 'Content',
        items: [
            { label: 'Campaigns', href: '/dashboard/news', icon: Megaphone },
            { label: 'Health Tips', href: '/dashboard/health-tips', icon: Lightbulb },
        ],
    },
    {
        title: 'Finance',
        items: [
            { label: 'Refunds', href: '/dashboard/refunds', icon: RotateCcw },
            { label: 'Pricing', href: '/dashboard/pricing', icon: DollarSign, superadminOnly: true },
            { label: 'Tokens', href: '/dashboard/tokens', icon: Coins, superadminOnly: true },
        ],
    },
];

export default function Sidebar() {
    const pathname = useLocation().pathname;
    const { collapsed, toggleCollapsed, mobileOpen, closeMobile, isMobile } = useSidebar();
    const { isSuperadmin, role, signOut } = useAdminAuth();
    const { isDark, setMode } = useAdminTheme();

    // Filter management groups based on role
    const filteredGroups = managementGroups.map(group => ({
        ...group,
        items: group.items.filter(item => !item.superadminOnly || isSuperadmin),
    })).filter(group => group.items.length > 0);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        const map: Record<string, boolean> = {};
        managementGroups.forEach(g => { map[g.title] = true; });
        return map;
    });

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname?.startsWith(href) ?? false;
    };

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const showLabels = !collapsed && !isMobile;

    const renderNavLink = (item: NavItem, active: boolean) => (
        <Link
            key={item.href}
            to={item.href}
            onClick={() => { haptic.select(); if (isMobile) closeMobile(); }}
            className={`pressable flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                }`}
            title={collapsed && !isMobile ? item.label : undefined}
        >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
            {(showLabels || isMobile) && <span className="text-[15px]">{item.label}</span>}
        </Link>
    );

    const sidebarContent = (
        <>
            {/* Logo Area */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-accent/20">
                {(isMobile || !collapsed) && (
                    <div className="flex items-center gap-2">
                        <Activity className="w-6 h-6 text-accent" />
                        <span className="text-lg font-bold text-text-primary">cliniq.one</span>
                        <span className="text-xs text-text-muted font-medium">Admin</span>
                    </div>
                )}
                {isMobile ? (
                    <button
                        onClick={() => { haptic.light(); closeMobile(); }}
                        className="pressable w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-faded transition-colors text-text-secondary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={toggleCollapsed}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-faded transition-colors text-text-secondary"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {(showLabels || isMobile) && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mb-2">
                        Core
                    </p>
                )}
                {mainNav.map((item) => renderNavLink(item, isActive(item.href)))}

                {(showLabels || isMobile) && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mt-6 mb-2">
                        Management
                    </p>
                )}
                {filteredGroups.map((group) => {
                    const isExpanded = expandedGroups[group.title] ?? true;
                    const hasActive = group.items.some(i => isActive(i.href));

                    if (collapsed && !isMobile) {
                        return group.items.map(item => renderNavLink(item, isActive(item.href)));
                    }

                    return (
                        <div key={group.title} className="mb-1">
                            <button
                                onClick={() => { haptic.light(); toggleGroup(group.title); }}
                                className={`flex items-center w-full px-3 py-1.5 text-[12px] uppercase tracking-wider font-semibold rounded-lg transition-colors ${hasActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                <ChevronDown className={`w-3.5 h-3.5 mr-1.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                {group.title}
                            </button>
                            {isExpanded && (
                                <div className="space-y-0.5 mt-0.5 ml-2">
                                    {group.items.map(item => renderNavLink(item, isActive(item.href)))}
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="my-4 border-t border-border" />

                {isSuperadmin && renderNavLink({ label: 'Admins', href: '/dashboard/admins', icon: Crown }, isActive('/dashboard/admins'))}
                {isSuperadmin && renderNavLink({ label: 'Settings', href: '/dashboard/settings', icon: Settings }, isActive('/dashboard/settings'))}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-accent/20">
                {role && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSuperadmin ? 'bg-purple-500' : 'bg-accent'}`} />
                        {(showLabels || isMobile) && (
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                                {isSuperadmin ? 'MomenCrafts' : 'Admin'}
                            </span>
                        )}
                    </div>
                )}
                <button
                    onClick={() => { haptic.light(); setMode(isDark ? 'light' : 'dark'); }}
                    className="pressable flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-text-muted hover:bg-accent-faded hover:text-accent transition-all duration-200"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
                    {(showLabels || isMobile) && <span className="text-[15px]">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button
                    onClick={() => { haptic.warning(); signOut(); }}
                    className="pressable flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-text-muted hover:bg-error-faded hover:text-error transition-all duration-200"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {(showLabels || isMobile) && <span className="text-[15px]">Logout</span>}
                </button>
            </div>
        </>
    );

    // Mobile: off-canvas drawer
    if (isMobile) {
        return (
            <>
                {mobileOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        onClick={closeMobile}
                    />
                )}
                <aside
                    className={`fixed left-0 top-0 h-screen w-[280px] flex flex-col z-50 transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    style={{
                        background: 'var(--color-bg-primary)',
                        borderRight: '1px solid var(--color-border)',
                    }}
                >
                    {sidebarContent}
                </aside>
            </>
        );
    }

    // Desktop: fixed sidebar
    return (
        <aside
            className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-[280px]'
                }`}
            style={{
                background: 'var(--color-bg-primary)',
                borderRight: '1px solid var(--color-border)',
            }}
        >
            {sidebarContent}
        </aside>
    );
}
