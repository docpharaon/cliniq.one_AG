import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

type AdminRole = 'admin' | 'superadmin' | null;

interface AdminAuth {
    user: User | null;
    role: AdminRole;
    isSuperadmin: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuth>({
    user: null,
    role: null,
    isSuperadmin: false,
    isLoading: true,
    signOut: async () => {},
});

export function useAdminAuth() {
    return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AdminRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = createBrowserSupabase();

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);

                // Try JWT claim first
                const jwtRole = extractRoleFromToken(session.access_token);
                if (jwtRole === 'admin' || jwtRole === 'superadmin') {
                    setRole(jwtRole);
                } else {
                    // Fallback: query users table
                    const { data } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    if (data?.role === 'admin' || data?.role === 'superadmin') {
                        setRole(data.role);
                    }
                }
            }
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    const jwtRole = extractRoleFromToken(session.access_token);
                    if (jwtRole === 'admin' || jwtRole === 'superadmin') {
                        setRole(jwtRole);
                    } else {
                        const { data } = await supabase
                            .from('users')
                            .select('role')
                            .eq('id', session.user.id)
                            .single();
                        if (data?.role === 'admin' || data?.role === 'superadmin') {
                            setRole(data.role);
                        }
                    }
                } else {
                    setUser(null);
                    setRole(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        window.location.href = '/login';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Provider = AdminAuthContext.Provider as any;

    return (
        <Provider value={{
            user,
            role,
            isSuperadmin: role === 'superadmin',
            isLoading,
            signOut,
        }}>
            {children}
        </Provider>
    );
}

function extractRoleFromToken(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(payload));
        return decoded.user_role || null;
    } catch {
        return null;
    }
}
