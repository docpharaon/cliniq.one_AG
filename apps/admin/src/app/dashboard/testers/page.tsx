'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { supabaseAdmin } from '@/lib/supabase';
import { FlaskConical, Check, X, Loader2, RefreshCw, Mail } from 'lucide-react';

interface Tester {
    id: string;
    name: string;
    email: string;
    role: string;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected';
    download_token: string;
    reviewed_at: string | null;
    created_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function TestersPage() {
    const [testers, setTesters] = useState<Tester[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchTesters = useCallback(async () => {
        setLoading(true);
        const supabase = supabaseAdmin;
        const { data, error } = await supabase
            .from('tester_signups')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setTesters(data as Tester[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchTesters(); }, [fetchTesters]);

    const handleAction = async (tester: Tester, action: 'approved' | 'rejected') => {
        setActionLoading(tester.id);
        try {
            const supabase = supabaseAdmin;
            const { error } = await supabase
                .from('tester_signups')
                .update({
                    status: action,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: 'admin',
                })
                .eq('id', tester.id);

            if (error) throw error;

            // If approving, trigger the approval email via edge function
            if (action === 'approved') {
                try {
                    await fetch(`${SUPABASE_URL}/functions/v1/approve-tester`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'apikey': SUPABASE_ANON_KEY,
                        },
                        body: JSON.stringify({
                            tester_id: tester.id,
                            name: tester.name,
                            email: tester.email,
                            download_token: tester.download_token,
                        }),
                    });
                } catch (emailErr) {
                    console.warn('Approval email failed:', emailErr);
                }
            }

            await fetchTesters();
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
            approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
        const emoji: Record<string, string> = { pending: '🟡', approved: '🟢', rejected: '🔴' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || ''}`}>
                {emoji[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const pendingCount = testers.filter(t => t.status === 'pending').length;

    return (
        <DashboardShell>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">Testers</h1>
                            <p className="text-sm text-text-secondary">
                                {testers.length} total · {pendingCount} pending review
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchTesters}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-all border border-accent/20"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Pending', count: testers.filter(t => t.status === 'pending').length, color: 'yellow' },
                        { label: 'Approved', count: testers.filter(t => t.status === 'approved').length, color: 'emerald' },
                        { label: 'Rejected', count: testers.filter(t => t.status === 'rejected').length, color: 'red' },
                    ].map(s => (
                        <div key={s.label} className="glass rounded-xl p-4 text-center">
                            <p className={`text-3xl font-bold text-${s.color}-400`}>{s.count}</p>
                            <p className="text-xs text-text-muted mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                ) : testers.length === 0 ? (
                    <div className="text-center py-20 text-text-muted">
                        <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No tester signups yet</p>
                    </div>
                ) : (
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-accent/10">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {testers.map(t => (
                                        <tr key={t.id} className="border-b border-accent/5 hover:bg-accent/[0.03] transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-text-primary">{t.name}</p>
                                                {t.message && (
                                                    <p className="text-xs text-text-muted mt-0.5 max-w-[200px] truncate" title={t.message}>
                                                        &quot;{t.message}&quot;
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <a href={`mailto:${t.email}`} className="text-sm text-accent hover:underline flex items-center gap-1">
                                                    <Mail className="w-3.5 h-3.5" /> {t.email}
                                                </a>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-text-secondary">{t.role}</td>
                                            <td className="px-5 py-4 text-sm text-text-muted">
                                                {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-4">{statusBadge(t.status)}</td>
                                            <td className="px-5 py-4 text-right">
                                                {t.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAction(t, 'approved')}
                                                            disabled={actionLoading === t.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-all border border-emerald-500/20 disabled:opacity-50"
                                                        >
                                                            {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(t, 'rejected')}
                                                            disabled={actionLoading === t.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-all border border-red-500/20 disabled:opacity-50"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-muted">
                                                        {t.reviewed_at
                                                            ? new Date(t.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                                            : '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
