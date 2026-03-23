'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    Newspaper,
    Megaphone,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LogOut,
    Activity,
    ClipboardList,
    Fingerprint,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

const mainNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Patients', href: '/dashboard/users', icon: Users },
    { label: 'Doctors', href: '/dashboard/doctors', icon: Stethoscope },
    { label: 'Consultations', href: '/dashboard/consultations', icon: FileText },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

type NavItem = { label: string; href: string; icon: LucideIcon };

const managementGroups: { title: string; items: NavItem[] }[] = [
    {
        title: 'Clinical',
        items: [
            { label: 'Interventions', href: '/dashboard/interventions', icon: ClipboardList },
            { label: 'Protocol Alerts', href: '/dashboard/protocols', icon: ShieldAlert },
            { label: 'Error Reports', href: '/dashboard/errors', icon: AlertTriangle },
        ],
    },
    {
        title: 'Operations',
        items: [
            { label: 'HR Management', href: '/dashboard/hr', icon: UserCog },
            { label: 'Scheduling', href: '/dashboard/scheduling', icon: CalendarDays },
            { label: 'AI', href: '/dashboard/ai', icon: Bot },
            { label: 'ID Verification', href: '/dashboard/kyc', icon: Fingerprint },
        ],
    },
    {
        title: 'Content',
        items: [
            { label: 'News', href: '/dashboard/news', icon: Newspaper },
            { label: 'Ads', href: '/dashboard/ads', icon: Megaphone },
        ],
    },
    {
        title: 'Finance',
        items: [
            { label: 'Pricing', href: '/dashboard/pricing', icon: DollarSign },
            { label: 'Tokens', href: '/dashboard/tokens', icon: Coins },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        // Auto-expand all groups initially
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

    const renderNavLink = (item: NavItem, active: boolean) => (
        <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                }`}
            title={collapsed ? item.label : undefined}
        >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
            {!collapsed && <span className="text-[15px]">{item.label}</span>}
        </Link>
    );

    return (
        <aside
            className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-[280px]'
                }`}
            style={{
                background: '#0F172A',
                borderRight: '1px solid rgba(45, 212, 191, 0.2)',
            }}
        >
            {/* Logo Area */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-accent/20">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <Activity className="w-6 h-6 text-accent" />
                        <span className="text-lg font-bold text-text-primary">cliniq.one</span>
                        <span className="text-xs text-text-muted font-medium">Admin</span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-faded transition-colors text-text-secondary"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {/* Core Section */}
                {!collapsed && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mb-2">
                        Core
                    </p>
                )}
                {mainNav.map((item) => renderNavLink(item, isActive(item.href)))}

                {/* Management Section — Collapsible Groups */}
                {!collapsed && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mt-6 mb-2">
                        Management
                    </p>
                )}
                {managementGroups.map((group) => {
                    const isExpanded = expandedGroups[group.title] ?? true;
                    const hasActive = group.items.some(i => isActive(i.href));

                    if (collapsed) {
                        // When collapsed, just show icons without grouping
                        return group.items.map(item => renderNavLink(item, isActive(item.href)));
                    }

                    return (
                        <div key={group.title} className="mb-1">
                            <button
                                onClick={() => toggleGroup(group.title)}
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

                {/* Divider */}
                <div className="my-4 border-t border-[rgba(45,212,191,0.15)]" />

                {/* Bottom Nav */}
                {renderNavLink({ label: 'Settings', href: '/dashboard/settings', icon: Settings }, isActive('/dashboard/settings'))}
            </nav>

            {/* Admin Footer */}
            <div className="px-3 py-4 border-t border-accent/20">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-text-muted hover:bg-error-faded hover:text-error transition-all duration-200">
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-[15px]">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
