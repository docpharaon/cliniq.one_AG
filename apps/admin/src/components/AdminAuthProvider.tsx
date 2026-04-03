import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBrowserSupabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AdminRole = 'admin' | 'superadmin' | null;

interface AdminAuth {
    user: User | null;
    role: AdminRole;
    isSuperadmin: boolean;
    isLoading: boolean;
    signOut: () => void;
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

    const INITIAL_SUPERADMIN = import.meta.env.VITE_INITIAL_SUPERADMIN || 'momen@momencrafts.com';

    function resolveRole(session: { user: { email?: string | null }; access_token: string }, dbRole?: string | null): AdminRole {
        const email = session.user.email;
        console.log('[AdminAuth] resolveRole:', { email, dbRole });
        // Bootstrap superadmin — always grant superadmin
        if (email === INITIAL_SUPERADMIN) {
            console.log('[AdminAuth] → superadmin (email match)');
            return 'superadmin';
        }
        // JWT claim
        const jwtRole = extractRoleFromToken(session.access_token);
        if (jwtRole === 'admin' || jwtRole === 'superadmin') return jwtRole as AdminRole;
        // DB fallback
        if (dbRole === 'admin' || dbRole === 'superadmin') return dbRole as AdminRole;
        return null;
    }

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const supabase = createBrowserSupabase();

        // Get initial session — with timeout to prevent infinite hang
        const sessionPromise = Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: { session: Session | null } }>((resolve) =>
                setTimeout(() => resolve({ data: { session: null } }), 3000)
            ),
        ]);

        sessionPromise.then(async ({ data: { session } }) => {
            console.log('[AdminAuth] getSession:', session?.user?.email, session ? 'has session' : 'no session');
            if (session?.user) {
                setUser(session.user);
                try {
                    const { data, error } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single() as { data: { role: string } | null; error: any };
                    console.log('[AdminAuth] DB query:', { data, error: error?.message });
                    const resolved = resolveRole(session, data?.role);
                    console.log('[AdminAuth] resolved role:', resolved);
                    setRole(resolved);
                } catch (err) {
                    console.error('[AdminAuth] DB query error:', err);
                    const resolved = resolveRole(session, null);
                    console.log('[AdminAuth] fallback resolved role:', resolved);
                    setRole(resolved);
                }
            } else {
                // No session — redirect to login
                console.log('[AdminAuth] No session, redirecting to /login');
                navigate('/login', { replace: true });
            }
            setIsLoading(false);
        }).catch((err) => {
            console.error('[AdminAuth] getSession error:', err);
            navigate('/login', { replace: true });
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    const { data } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single() as { data: { role: string } | null };
                    setRole(resolveRole(session, data?.role));
                } else {
                    setUser(null);
                    setRole(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = () => {
        console.log('[AdminAuth] signOut called');
        // 1. Clear all Supabase auth storage synchronously
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });
            sessionStorage.clear();
        } catch { /* ignore */ }
        // 2. Fire-and-forget the Supabase signOut API call
        try {
            const supabase = createBrowserSupabase();
            supabase.auth.signOut().catch(() => {});
        } catch { /* ignore */ }
        // 3. Redirect immediately — don't wait for signOut
        window.location.href = '/login';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Provider = AdminAuthContext.Provider as any;

    return (
        <Provider value={{
            user,
            role,
            isSuperadmin: role === 'superadmin' || user?.email === INITIAL_SUPERADMIN,
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
