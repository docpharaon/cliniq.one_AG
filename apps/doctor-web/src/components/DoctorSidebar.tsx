'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    BarChart3,
    UserCircle,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    ClipboardList,
    CalendarDays,
    Bell,
    X,
    Lock,
    Lightbulb,
} from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase';
import { useSidebar } from './SidebarContext';
import { useFeatureGate, type Feature } from '@/hooks/useFeatureGate';

const mainNav: { label: string; href: string; icon: any; gate?: Feature }[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Queue', href: '/dashboard/queue', icon: ClipboardList, gate: 'claim_cases' },
    { label: 'Consultations', href: '/dashboard/consultations', icon: FileText, gate: 'view_history' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, gate: 'view_analytics' },
];

const managementNav: { label: string; href: string; icon: any; gate?: Feature }[] = [
    { label: 'Health Advice', href: '/dashboard/health-advice', icon: Lightbulb },
    { label: 'Schedule', href: '/dashboard/schedule', icon: CalendarDays, gate: 'view_schedule' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, gate: 'notifications' },
];

const bottomNav = [
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DoctorSidebar() {
    const pathname = usePathname();
    const { collapsed, toggleCollapsed, mobileOpen, closeMobile, isMobile, doctorType } = useSidebar();
    const { can, isSandbox } = useFeatureGate();
    const isLocum = doctorType === 'locum';

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname?.startsWith(href) ?? false;
    };

    // Determine effective collapsed state: on tablet (md but not lg), auto-collapse
    const showLabels = !collapsed && !isMobile;

    const sidebarContent = (
        <>
            {/* Logo Area */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-accent/20">
                {(isMobile || !collapsed) && (
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-6 h-6 text-accent" />
                        <span className="text-lg font-bold text-text-primary">cliniq.one</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                            isLocum
                                ? 'text-yellow-400 bg-yellow-500/10'
                                : 'text-accent bg-accent-faded'
                        }`}>
                            {isLocum ? 'Locum' : 'Doctor'}
                        </span>
                    </div>
                )}
                {isMobile ? (
                    <button
                        onClick={closeMobile}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-faded transition-colors text-text-secondary"
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
                {/* Core Section */}
                {(showLabels || isMobile) && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mb-2">
                        Core
                    </p>
                )}
                {mainNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const locked = item.gate && !can(item.gate);
                    return (
                        <Link
                            key={item.href}
                            href={locked ? '#' : item.href}
                            onClick={(e) => {
                                if (locked) { e.preventDefault(); return; }
                                if (isMobile) closeMobile();
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : locked
                                    ? 'text-text-muted opacity-50 cursor-not-allowed'
                                    : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed && !isMobile ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {(showLabels || isMobile) && <span className="text-[15px] flex-1">{item.label}</span>}
                            {(showLabels || isMobile) && locked && <Lock className="w-3.5 h-3.5 text-warning" />}
                        </Link>
                    );
                })}

                {/* Management Section */}
                {(showLabels || isMobile) && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mt-6 mb-2">
                        Manage
                    </p>
                )}
                {managementNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const locked = item.gate && !can(item.gate);
                    return (
                        <Link
                            key={item.href}
                            href={locked ? '#' : item.href}
                            onClick={(e) => {
                                if (locked) { e.preventDefault(); return; }
                                if (isMobile) closeMobile();
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : locked
                                    ? 'text-text-muted opacity-50 cursor-not-allowed'
                                    : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed && !isMobile ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {(showLabels || isMobile) && <span className="text-[15px] flex-1">{item.label}</span>}
                            {(showLabels || isMobile) && locked && <Lock className="w-3.5 h-3.5 text-warning" />}
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="my-4 border-t border-[rgba(45,212,191,0.15)]" />

                {/* Bottom Nav */}
                {bottomNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={isMobile ? closeMobile : undefined}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed && !isMobile ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {(showLabels || isMobile) && <span className="text-[15px]">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-accent/20">
                <button
                    onClick={async () => {
                        try {
                            const supabase = createBrowserSupabase();
                            await supabase.auth.signOut();
                        } catch (e) {
                            console.error('Sign out error:', e);
                        }
                        document.cookie.split(';').forEach(c => {
                            const name = c.trim().split('=')[0];
                            if (name.startsWith('sb-')) {
                                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                            }
                        });
                        window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-text-muted hover:bg-error-faded hover:text-error transition-all duration-200"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {(showLabels || isMobile) && <span className="text-[15px]">Logout</span>}
                </button>
            </div>
        </>
    );

    // ─── Mobile: off-canvas drawer ───
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                {mobileOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={closeMobile}
                    />
                )}
                {/* Drawer */}
                <aside
                    className={`fixed left-0 top-0 h-screen w-[280px] flex flex-col z-50 transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    style={{
                        background: '#0F172A',
                        borderRight: '1px solid rgba(45, 212, 191, 0.2)',
                    }}
                >
                    {sidebarContent}
                </aside>
            </>
        );
    }

    // ─── Desktop / Tablet: fixed sidebar ───
    return (
        <aside
            className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-[260px]'
                }`}
            style={{
                background: '#0F172A',
                borderRight: '1px solid rgba(45, 212, 191, 0.2)',
            }}
        >
            {sidebarContent}
        </aside>
    );
}
