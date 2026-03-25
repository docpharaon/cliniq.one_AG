'use client';

import { useSidebar } from './SidebarContext';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const { collapsed, isMobile, isTablet } = useSidebar();

    // Mobile: no margin (sidebar is an overlay)
    // Tablet: collapsed sidebar (ml-16)
    // Desktop collapsed: ml-16
    // Desktop expanded: ml-[260px]
    const marginClass = isMobile
        ? 'ml-0'
        : (collapsed || isTablet)
            ? 'ml-16'
            : 'ml-[260px]';

    return (
        <main className={`flex-1 ${marginClass} transition-all duration-300 min-w-0`}>
            {children}
        </main>
    );
}
