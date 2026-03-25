'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

interface SidebarContextType {
    /** Desktop collapsed state */
    collapsed: boolean;
    toggleCollapsed: () => void;
    /** Mobile drawer open state */
    mobileOpen: boolean;
    openMobile: () => void;
    closeMobile: () => void;
    /** Current breakpoint helpers */
    isMobile: boolean;
    /** Doctor type: 'permanent' | 'locum' */
    doctorType: 'permanent' | 'locum';
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
    const [doctorType, setDoctorType] = useState<'permanent' | 'locum'>('permanent');

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)');
        const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(e.matches);
            if (!e.matches) setMobileOpen(false); // close drawer when resizing to desktop
        };
        onChange(mql);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    // Fetch doctor_type once on mount
    useEffect(() => {
        (async () => {
            try {
                const sb = createBrowserSupabase();
                const { data: { user } } = await sb.auth.getUser();
                if (!user) return;
                const { data: doc } = await sb
                    .from('doctors')
                    .select('doctor_type')
                    .eq('user_id', user.id)
                    .single();
                if (doc?.doctor_type === 'locum') setDoctorType('locum');
            } catch { /* ignore */ }
        })();
    }, []);

    const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
    const openMobile = useCallback(() => setMobileOpen(true), []);
    const closeMobile = useCallback(() => setMobileOpen(false), []);

    return (
        <SidebarContext.Provider value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile, isMobile, doctorType }}>
            {children}
        </SidebarContext.Provider>
    );
}
