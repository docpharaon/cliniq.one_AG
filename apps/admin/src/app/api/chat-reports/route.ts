import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET — list all chat reports (admin view)
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        let query = supabase
            .from('chat_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: reports, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Batch-fetch patient info for all unique patient_ids
        const patientIds = [...new Set((reports || []).map(r => r.patient_id))];
        let patientMap: Record<string, { nickname?: string; email?: string }> = {};

        if (patientIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nickname, email')
                .in('id', patientIds);
            if (users) {
                patientMap = Object.fromEntries(users.map(u => [u.id, { nickname: u.nickname, email: u.email }]));
            }
        }

        // Merge patient info into reports
        const enriched = (reports || []).map(r => ({
            ...r,
            users: patientMap[r.patient_id] || null,
        }));

        return NextResponse.json({ reports: enriched });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

// PATCH — update a report (admin note, status change)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, admin_note } = body;

        if (!id) {
            return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (admin_note !== undefined) updates.admin_note = admin_note;
        if (status === 'reviewed' || status === 'resolved') {
            updates.reviewed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('chat_reports')
            .update(updates)
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
