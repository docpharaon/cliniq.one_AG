import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBrowserSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

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

// ── Auth loading screen (blocks dashboard render) ───────────
function AdminAuthGate() {
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                <p className="text-text-primary font-semibold text-sm">Verifying admin access…</p>
                <p className="text-text-muted text-xs mt-1">Please wait</p>
            </div>
        </div>
    );
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AdminRole>(null);
    const [isLoading, setIsLoading] = useState(true);
    const resolvedRef = useRef(false);

    const INITIAL_SUPERADMIN = import.meta.env.VITE_INITIAL_SUPERADMIN || 'momen@momencrafts.com';

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {

        const supabase = createBrowserSupabase();

        function resolveRoleFromSession(session: { user: { email?: string | null }; access_token: string }, dbRole?: string | null): AdminRole {
            const email = session.user.email;
            if (email === INITIAL_SUPERADMIN) return 'superadmin';
            const jwtRole = extractRoleFromToken(session.access_token);
            if (jwtRole === 'admin' || jwtRole === 'superadmin') return jwtRole as AdminRole;
            if (dbRole === 'admin' || dbRole === 'superadmin') return dbRole as AdminRole;

            return null;
        }

        async function processSession(session: any) {
            if (resolvedRef.current) return;


            setUser(session.user);

            // Fast path: known superadmin email — skip DB entirely
            const email = session.user?.email;
            if (email === INITIAL_SUPERADMIN) {

                resolvedRef.current = true;
                setRole('superadmin');
                setIsLoading(false);
                return;
            }

            // Try to get role from DB with a timeout to prevent hanging
            let dbRole: string | null = null;
            try {
                const dbPromise = supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                // Race the DB query against a 3-second timeout
                const result = await Promise.race([
                    dbPromise,
                    new Promise<{ data: null; error: { message: string } }>((resolve) =>
                        setTimeout(() => resolve({ data: null, error: { message: 'DB query timeout (3s)' } }), 3000)
                    ),
                ]) as { data: { role: string } | null; error: any };

                if (result.error) console.warn('[AdminAuth] DB role query issue:', result.error.message);
                dbRole = result.data?.role || null;
            } catch (err) {
                console.warn('[AdminAuth] DB query failed:', err);
            }

            // Resolve role from session + DB result
            const resolved = resolveRoleFromSession(session, dbRole);
            resolvedRef.current = true;
            setRole(resolved);
            setIsLoading(false);

            if (!resolved) {
                console.warn('[AdminAuth] No admin role — ejecting user');
                await supabase.auth.signOut();
                navigate('/login', { replace: true });
            } else {

            }
        }

        // 1. Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                if (session?.user) {
                    await processSession(session);
                } else if (event === 'SIGNED_OUT') {

                    resolvedRef.current = true;
                    setUser(null);
                    setRole(null);
                    setIsLoading(false);
                    navigate('/login', { replace: true });
                }
            }
        );

        // 2. Proactive getSession — handles the race where INITIAL_SESSION
        //    fires synchronously before the listener is wired up
        supabase.auth.getSession().then(async ({ data: { session } }) => {

            if (session?.user) {
                await processSession(session);
            } else if (!resolvedRef.current) {
                // No session at all — redirect immediately

                resolvedRef.current = true;
                setIsLoading(false);
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        }).catch((err) => {
            console.error('[AdminAuth] getSession error:', err);
        });

        // 3. Fallback: if nothing resolves in 4 seconds, redirect to login
        const fallbackTimer = setTimeout(() => {
            if (!resolvedRef.current) {
                console.warn('[AdminAuth] Fallback timer fired — nothing resolved in 4s → redirecting to login');
                resolvedRef.current = true;
                setIsLoading(false);
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        }, 4000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
    }, []);

    const signOut = () => {
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

    // ── Auth Gate: block rendering until auth is confirmed ──────
    if (isLoading || !role) {
        return <AdminAuthGate />;
    }

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
