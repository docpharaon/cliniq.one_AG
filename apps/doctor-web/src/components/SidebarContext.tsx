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
    isTablet: boolean;
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
    const [isTablet, setIsTablet] = useState(false);
    const [doctorType, setDoctorType] = useState<'permanent' | 'locum'>('permanent');

    useEffect(() => {
        const mqlMobile = window.matchMedia('(max-width: 767px)');
        const mqlTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

        const update = () => {
            const mobile = mqlMobile.matches;
            const tablet = mqlTablet.matches;
            setIsMobile(mobile);
            setIsTablet(tablet);
            if (!mobile) setMobileOpen(false);
            // Auto-collapse on tablet
            if (tablet) setCollapsed(true);
        };

        update();
        mqlMobile.addEventListener('change', update);
        mqlTablet.addEventListener('change', update);
        return () => {
            mqlMobile.removeEventListener('change', update);
            mqlTablet.removeEventListener('change', update);
        };
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
        <SidebarContext.Provider value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile, isMobile, isTablet, doctorType }}>
            {children}
        </SidebarContext.Provider>
    );
}
