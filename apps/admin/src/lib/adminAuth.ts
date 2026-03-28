'use server';

import { createBrowserSupabase } from './supabase';

export type AdminRole = 'admin' | 'superadmin';

/**
 * Decode the JWT from a Supabase session to extract user_role claim.
 * Works without a DB call because we inject role via custom_access_token_hook.
 */
export function getRoleFromJWT(accessToken: string): string | null {
    try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.user_role || null;
    } catch {
        return null;
    }
}

/**
 * Check if a role has admin access (admin or superadmin).
 */
export function isAdminRole(role: string | null): boolean {
    return role === 'admin' || role === 'superadmin';
}

/**
 * Check if a role is superadmin.
 */
export function isSuperadminRole(role: string | null): boolean {
    return role === 'superadmin';
}

/**
 * Superadmin-only sidebar sections.
 */
export const SUPERADMIN_ONLY_PATHS = [
    '/dashboard/settings',
    '/dashboard/admins',
    '/dashboard/ai',
    '/dashboard/pricing',
    '/dashboard/tokens',
    '/dashboard/hr',
    '/dashboard/audit',
    '/dashboard/testers',
    '/dashboard/kyc',
    '/dashboard/protocols',
];

/**
 * Get role from users table (fallback when JWT claims not yet configured).
 */
export async function getAdminRoleFromDB(userId: string): Promise<string | null> {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !data) return null;
    return data.role;
}
