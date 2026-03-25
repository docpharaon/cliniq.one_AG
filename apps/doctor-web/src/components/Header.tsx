'use client';

import { Menu, Search, Settings } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    title: string;
    subtitle?: string;
    doctorName?: string;
    doctorId?: string;
}

export default function Header({ title, subtitle, doctorName, doctorId }: HeaderProps) {
    const { openMobile, isMobile } = useSidebar();

    return (
        <header
            className="sticky top-0 z-40 flex items-center justify-between h-14 md:h-16 px-4 md:px-8 border-b"
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
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent-faded transition-colors text-text-secondary flex-shrink-0"
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

            {/* Center: Search (hidden on mobile) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search consultations, patients..."
                        className="w-full bg-bg-elevated border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                <NotificationBell doctorId={doctorId} />

                <button className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-xl hover:bg-accent-faded transition-colors">
                    <Settings className="w-4.5 h-4.5 md:w-5 md:h-5 text-text-secondary" />
                </button>

                {/* Doctor Avatar */}
                <div className="flex items-center gap-2 ml-1 md:ml-2 cursor-pointer">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-xs md:text-sm font-bold text-white border-2 border-accent/50">
                        {doctorName ? doctorName[0].toUpperCase() : 'D'}
                    </div>
                    {doctorName && (
                        <span className="text-sm text-text-secondary hidden lg:block">{doctorName}</span>
                    )}
                </div>
            </div>
        </header>
    );
}
