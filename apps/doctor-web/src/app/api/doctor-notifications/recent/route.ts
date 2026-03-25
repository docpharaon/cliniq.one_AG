import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/doctor-notifications/recent?since=ISO&doctorId=UUID
 * Returns doctor notifications created after the given timestamp.
 */
export async function GET(req: NextRequest) {
    const since = req.nextUrl.searchParams.get('since') || new Date(Date.now() - 60000).toISOString();
    const doctorId = req.nextUrl.searchParams.get('doctorId');

    if (!doctorId) return NextResponse.json([], { status: 400 });

    const { data, error } = await supabase
        .from('doctor_notifications')
        .select('id, type, title, message, created_at')
        .eq('doctor_id', doctorId)
        .eq('read', false)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) return NextResponse.json([], { status: 500 });
    return NextResponse.json(data ?? []);
}
