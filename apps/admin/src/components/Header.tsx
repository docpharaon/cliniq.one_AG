'use client';

import { Search, Settings, Menu } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { isMobile, openMobile } = useSidebar();

    return (
        <header
            className="sticky top-0 z-40 flex items-center justify-between h-14 md:h-16 px-4 md:px-8 border-b gap-3"
            style={{
                background: 'rgba(15, 35, 40, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'rgba(98, 214, 197, 0.2)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
        >
            {/* Left: Hamburger + Title */}
            <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                    <button
                        onClick={openMobile}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors text-text-secondary flex-shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-text-primary truncate">{title}</h1>
                    {subtitle && (
                        <p className="text-xs text-text-muted truncate">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center: Search (desktop only) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search users, doctors, consultations..."
                        className="w-full bg-bg-elevated border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                <NotificationDropdown />

                <button className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-accent-faded transition-colors">
                    <Settings className="w-5 h-5 text-text-secondary" />
                </button>

                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-bg-primary border-2 border-accent ml-1 md:ml-2 cursor-pointer">
                    A
                </div>
            </div>
        </header>
    );
}
