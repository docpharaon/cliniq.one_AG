import { NextRequest, NextResponse } from 'next/server';

// Password gate removed — cliniq.one is fully public
export function middleware(_request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png).*)'],
};
