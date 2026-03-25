'use client';

import { useSidebar } from './SidebarContext';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const { collapsed, isMobile } = useSidebar();

    const marginClass = isMobile
        ? 'ml-0'
        : collapsed
            ? 'ml-16'
            : 'ml-[280px]';

    return (
        <main className={`flex-1 ${marginClass} transition-all duration-300 min-w-0`}>
            {children}
        </main>
    );
}
