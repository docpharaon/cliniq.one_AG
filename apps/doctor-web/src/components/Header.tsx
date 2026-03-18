'use client';

import { Bell, Search, Settings } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    doctorName?: string;
}

export default function Header({ title, subtitle, doctorName }: HeaderProps) {
    return (
        <header
            className="sticky top-0 z-40 flex items-center justify-between h-16 px-8 border-b"
            style={{
                background: 'rgba(15, 35, 40, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'rgba(98, 214, 197, 0.2)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
        >
            {/* Left: Title */}
            <div>
                <h1 className="text-lg font-bold text-text-primary">{title}</h1>
                {subtitle && (
                    <p className="text-xs text-text-muted">{subtitle}</p>
                )}
            </div>

            {/* Center: Search */}
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
            <div className="flex items-center gap-2">
                <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors">
                    <Bell className="w-5 h-5 text-text-secondary" />
                    <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] bg-error rounded-full text-[11px] font-bold text-white flex items-center justify-center">
                        2
                    </span>
                </button>

                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors">
                    <Settings className="w-5 h-5 text-text-secondary" />
                </button>

                {/* Doctor Avatar */}
                <div className="flex items-center gap-2 ml-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-sm font-bold text-white border-2 border-accent/50">
                        D
                    </div>
                    {doctorName && (
                        <span className="text-sm text-text-secondary hidden lg:block">{doctorName}</span>
                    )}
                </div>
            </div>
        </header>
    );
}
