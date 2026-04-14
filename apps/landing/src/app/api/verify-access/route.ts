import { NextRequest, NextResponse } from 'next/server';

const ACCESS_PASSWORD = 'Momencrafts2026';
const COOKIE_NAME = 'cliniq_mvp_access';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (password === ACCESS_PASSWORD) {
            const response = NextResponse.json({ success: true });
            response.cookies.set(COOKIE_NAME, ACCESS_PASSWORD, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });
            return response;
        }

        return NextResponse.json({ success: false, error: 'Invalid access code' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
    }
}
