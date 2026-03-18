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
} from 'lucide-react';
import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

const mainNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Queue', href: '/dashboard/queue', icon: ClipboardList },
    { label: 'Consultations', href: '/dashboard/consultations', icon: FileText },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

const managementNav = [
    { label: 'Schedule', href: '/dashboard/schedule', icon: CalendarDays, gradient: 'from-indigo-500 to-purple-500' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, gradient: 'from-pink-500 to-rose-500' },
];

const bottomNav = [
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DoctorSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname?.startsWith(href) ?? false;
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-[260px]'
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
                        <Stethoscope className="w-6 h-6 text-accent" />
                        <span className="text-lg font-bold text-text-primary">cliniq.one</span>
                        <span className="text-xs text-accent font-semibold px-1.5 py-0.5 rounded-md bg-accent-faded">Doctor</span>
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
                {mainNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {!collapsed && <span className="text-[15px]">{item.label}</span>}
                        </Link>
                    );
                })}

                {/* Management Section */}
                {!collapsed && (
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold px-3 mt-6 mb-2">
                        Manage
                    </p>
                )}
                {managementNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {!collapsed && <span className="text-[15px]">{item.label}</span>}
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${active
                                ? 'bg-accent-faded text-accent font-semibold border-l-4 border-accent'
                                : 'text-text-secondary hover:bg-accent/[0.08] hover:text-text-primary'
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                            {!collapsed && <span className="text-[15px]">{item.label}</span>}
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
                        // Clear any remaining sb- cookies manually
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
                    {!collapsed && <span className="text-[15px]">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
