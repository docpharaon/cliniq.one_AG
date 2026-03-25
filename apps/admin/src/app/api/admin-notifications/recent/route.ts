import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin-notifications/recent?since=ISO_TIMESTAMP
 * Returns admin notifications created after the given timestamp.
 * Used by CapacitorNotificationListener for native push.
 */
export async function GET(req: NextRequest) {
    const since = req.nextUrl.searchParams.get('since') || new Date(Date.now() - 60000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, type, title, message, created_at')
        .eq('read', false)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
