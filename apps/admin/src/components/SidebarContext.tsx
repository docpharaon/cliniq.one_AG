import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    toggleCollapsed: () => void;
    mobileOpen: boolean;
    openMobile: () => void;
    closeMobile: () => void;
    isMobile: boolean;
    isTablet: boolean;
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

    const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
    const openMobile = useCallback(() => setMobileOpen(true), []);
    const closeMobile = useCallback(() => setMobileOpen(false), []);

    return (
        <SidebarContext.Provider value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile, isMobile, isTablet }}>
            {children}
        </SidebarContext.Provider>
    );
}
