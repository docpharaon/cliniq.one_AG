import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const hasSession = request.cookies.getAll().some(
        (c) => c.name.startsWith('sb-') && (c.name.includes('-auth-token') ) && c.value && c.value.length > 10
    );

    if (!hasSession && request.nextUrl.pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (hasSession && request.nextUrl.pathname === '/login') {
        const dashUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/forgot-password', '/reset-password', '/auth/callback'],
};
