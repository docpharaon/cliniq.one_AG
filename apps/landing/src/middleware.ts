import { NextRequest, NextResponse } from 'next/server';

const ACCESS_PASSWORD = 'Momencrafts2026';
const COOKIE_NAME = 'cliniq_mvp_access';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Always allow: API routes, static files, access page, _next
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname === '/access' ||
        pathname.startsWith('/mockups') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
    ) {
        return NextResponse.next();
    }

    // Check for access cookie
    const accessCookie = request.cookies.get(COOKIE_NAME);
    if (accessCookie?.value === ACCESS_PASSWORD) {
        return NextResponse.next();
    }

    // For the main page (/), let it through — PasswordGate handles the visual overlay
    if (pathname === '/') {
        return NextResponse.next();
    }

    // For all other pages without cookie, redirect to home (which has the gate)
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png).*)'],
};
