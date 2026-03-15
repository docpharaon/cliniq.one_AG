import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for Supabase auth cookie (session token)
    // Supabase stores auth in cookies prefixed with "sb-"
    const hasSession = request.cookies.getAll().some(
        (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    // If no session and trying to access dashboard, redirect to login
    if (!hasSession && request.nextUrl.pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated and on login page, redirect to dashboard
    if (hasSession && request.nextUrl.pathname === '/login') {
        const dashUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};
