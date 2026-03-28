import { NextResponse, type NextRequest } from 'next/server';

/**
 * Decode Supabase JWT to extract user_role claim.
 * No external deps needed — just base64 decode.
 */
function getRoleFromCookie(request: NextRequest): string | null {
    // Supabase stores session in sb-<ref>-auth-token cookie
    const sessionCookie = request.cookies.getAll().find(
        (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!sessionCookie?.value) return null;

    try {
        // The cookie value is a JSON array: [access_token, ...]
        // or base64-encoded JSON containing access_token
        let rawValue = sessionCookie.value;

        // Handle URL-encoded values
        if (rawValue.startsWith('%5B') || rawValue.startsWith('base64-')) {
            rawValue = decodeURIComponent(rawValue);
        }

        // Try parsing as JSON array first: ["access_token", "refresh_token"]
        let accessToken: string | null = null;
        try {
            const parsed = JSON.parse(rawValue);
            if (Array.isArray(parsed)) {
                accessToken = parsed[0];
            } else if (parsed?.access_token) {
                accessToken = parsed.access_token;
            } else if (typeof parsed === 'string') {
                accessToken = parsed;
            }
        } catch {
            // If not JSON, might be just the token
            accessToken = rawValue;
        }

        if (!accessToken) return null;

        // Decode JWT payload (middle part)
        const parts = accessToken.split('.');
        if (parts.length !== 3) return null;

        // base64url decode
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(
            typeof atob !== 'undefined'
                ? atob(payload)
                : Buffer.from(payload, 'base64').toString('utf8')
        );

        return decoded.user_role || null;
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    // Check for Supabase auth cookie
    const hasSession = request.cookies.getAll().some(
        (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    const pathname = request.nextUrl.pathname;

    // If no session and trying to access dashboard → login
    if (!hasSession && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If authenticated, check role for dashboard access
    if (hasSession && pathname.startsWith('/dashboard')) {
        const role = getRoleFromCookie(request);

        // If JWT has role claim, enforce RBAC
        if (role) {
            const isAdmin = role === 'admin' || role === 'superadmin';
            if (!isAdmin) {
                return NextResponse.redirect(new URL('/unauthorized', request.url));
            }

            // Superadmin-only pages
            const superadminPaths = [
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

            const isSuperadminPath = superadminPaths.some(p => pathname.startsWith(p));
            if (isSuperadminPath && role !== 'superadmin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
        // If no role in JWT (hook not yet active), allow through (backward compat)
    }

    // If authenticated and on login page → dashboard
    if (hasSession && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};
