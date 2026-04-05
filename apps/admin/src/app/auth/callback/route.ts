import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');



    if (!code) {
        console.error('[auth/callback] No code parameter');
        return NextResponse.redirect(new URL('/login?error=missing_code', origin));
    }

    // We must create the response FIRST, then pass cookie setters that write to it
    const response = NextResponse.redirect(new URL('/dashboard', origin));

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, {
                            ...options,
                            // Ensure cookies work in dev
                            secure: false,
                            sameSite: 'lax',
                        });
                    });
                },
            },
        }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error('[auth/callback] Code exchange failed:', error.message);
        return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error.message), origin));
    }



    return response;
}
