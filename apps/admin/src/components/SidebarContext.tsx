'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    toggleCollapsed: () => void;
    mobileOpen: boolean;
    openMobile: () => void;
    closeMobile: () => void;
    isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
    return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)');
        const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(e.matches);
            if (!e.matches) setMobileOpen(false);
        };
        onChange(mql);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
    const openMobile = useCallback(() => setMobileOpen(true), []);
    const closeMobile = useCallback(() => setMobileOpen(false), []);

    return (
        <SidebarContext value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile, isMobile }}>
            {children}
        </SidebarContext>
    );
}
