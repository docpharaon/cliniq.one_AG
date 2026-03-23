'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    ClipboardList,
    Activity,
    CheckCircle2,
    Coins,
    TrendingUp,
    Clock,
    Star,
    ArrowRight,
    BarChart3,
    CalendarDays,
    FileText,
    UserCircle,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useEffect, useState } from 'react';
import { fetchDoctorDashboardStats, fetchQueueConsultations, fetchWeeklyActivity } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';



type DashboardStats = {
    totalConsultations: number;
    todayCompleted: number;
    activeCases: number;
    pendingInQueue: number;
    tokensEarned: number;
    ratingAvg: number;
    ratingCount: number;
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [queuePreview, setQueuePreview] = useState<any[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<{ day: string; cases: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [doctorName, setDoctorName] = useState('Doctor');

    useEffect(() => {
        async function loadDashboard() {
            try {
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id, display_name, full_name, specialty')
                    .eq('user_id', user.id)
                    .single();

                if (!doctor) return;

                setDoctorName(doctor.display_name || doctor.full_name || 'Doctor');

                const [dashStats, queueData, weeklyData] = await Promise.all([
                    fetchDoctorDashboardStats(doctor.id),
                    fetchQueueConsultations(doctor.id, doctor.specialty, 1, 5),
                    fetchWeeklyActivity(doctor.id),
                ]);

                setStats(dashStats);
                setQueuePreview(queueData.data.slice(0, 3));
                setWeeklyActivity(weeklyData);
            } catch (err) {
                console.error('Dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return (
        <>
            <Header title="Dashboard" subtitle="Your consultation overview" />

            <div className="p-8 max-w-[1400px] mx-auto space-y-8">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-text-muted text-sm">Welcome back,</p>
                        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                            {doctorName}
                            <span className="text-lg">🩺</span>
                        </h2>
                    </div>
                    <div className="text-right mt-2 sm:mt-0">
                        <p className="text-sm text-text-secondary">📅 {dateStr}</p>
                        <p className="text-sm text-text-muted">{timeStr} AST</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <StatCard
                                icon={ClipboardList}
                                value={stats?.pendingInQueue ?? 0}
                                label="In Queue"
                                iconColor="text-warning"
                                iconBg="bg-warning-faded"
                            />
                            <StatCard
                                icon={Activity}
                                value={stats?.activeCases ?? 0}
                                label="Active Cases"
                                iconColor="text-info"
                                iconBg="bg-info-faded"
                            />
                            <StatCard
                                icon={CheckCircle2}
                                value={stats?.todayCompleted ?? 0}
                                label="Done Today"
                                iconColor="text-success"
                                iconBg="bg-success-faded"
                            />
                            <StatCard
                                icon={Coins}
                                value={stats?.tokensEarned?.toLocaleString() ?? '0'}
                                label="Tokens Earned"
                                iconColor="text-gold"
                                iconBg="bg-gold-faded"
                            />
                            <StatCard
                                icon={Star}
                                value={stats?.ratingAvg?.toFixed(1) ?? '0.0'}
                                label={`Rating (${stats?.ratingCount ?? 0})`}
                                iconColor="text-purple"
                                iconBg="bg-purple-faded"
                            />
                        </div>

                        {/* Queue Preview + Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Queue Preview */}
                            <div className="glass rounded-2xl p-6 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-accent" />
                                        <h3 className="text-lg font-bold text-text-primary">Queue Preview</h3>
                                    </div>
                                    <Link
                                        href="/dashboard/queue"
                                        className="text-sm text-accent hover:underline flex items-center gap-1"
                                    >
                                        See all <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                {queuePreview.length === 0 ? (
                                    <div className="flex flex-col items-center py-8 text-text-muted">
                                        <span className="text-4xl mb-2">🎉</span>
                                        <p className="text-sm">No cases in queue</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {queuePreview.map((item: any) => (
                                            <Link
                                                key={item.id}
                                                href={`/dashboard/consultation/${item.id}`}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-elevated/80 border border-border hover:border-accent/30 transition-all"
                                            >
                                                {/* Initials Avatar */}
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                                                    style={{ backgroundColor: `hsl(${((item.patient?.nickname || 'P').charCodeAt(0) * 37) % 360}, 60%, 45%)` }}
                                                >
                                                    {(item.patient?.nickname || 'P')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <StatusBadge
                                                            label={item.priority === 'urgent' ? 'URGENT' : 'ROUTINE'}
                                                            variant={item.priority === 'urgent' ? 'error' : 'success'}
                                                        />
                                                        <span className="text-xs text-text-muted">
                                                            {item.patient?.nickname || 'Patient'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-text-primary line-clamp-1">
                                                        {item.chief_complaint || 'Consultation'}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-gold font-semibold">
                                                    💎 {item.token_cost || 3}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Weekly Activity Chart */}
                            <div className="glass rounded-2xl p-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-6">
                                    <TrendingUp className="w-5 h-5 text-accent" />
                                    <h3 className="text-lg font-bold text-text-primary">Weekly Activity</h3>
                                    <span className="text-xs text-text-muted ml-auto">This week</span>
                                </div>
                                {weeklyActivity.length === 0 || weeklyActivity.every(d => d.cases === 0) ? (
                                    <div className="flex flex-col items-center justify-center h-[260px] text-text-muted">
                                        <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
                                        <p className="text-sm">No activity this week</p>
                                    </div>
                                ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={weeklyActivity}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
                                        <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                                        <YAxis stroke="#64748B" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#0F172A',
                                                border: '1px solid #1E293B',
                                                borderRadius: '12px',
                                                color: '#F1F5F9',
                                                fontSize: '13px',
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cases"
                                            stroke="#2DD4BF"
                                            strokeWidth={3}
                                            dot={{ fill: '#2DD4BF', r: 4 }}
                                            activeDot={{ r: 6, fill: '#2DD4BF' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Link href="/dashboard/queue" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 bg-accent-faded rounded-xl flex items-center justify-center">
                                    <ClipboardList className="w-6 h-6 text-accent" />
                                </div>
                                <p className="text-sm font-semibold text-accent">Queue</p>
                                <p className="text-xs text-text-muted">View cases</p>
                            </Link>
                            <Link href="/dashboard/consultations" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 bg-purple-faded rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-purple" />
                                </div>
                                <p className="text-sm font-semibold text-purple">History</p>
                                <p className="text-xs text-text-muted">Past cases</p>
                            </Link>
                            <Link href="/dashboard/analytics" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 bg-gold-faded rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-6 h-6 text-gold" />
                                </div>
                                <p className="text-sm font-semibold text-gold">Analytics</p>
                                <p className="text-xs text-text-muted">Earnings</p>
                            </Link>
                            <Link href="/dashboard/schedule" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 bg-info-faded rounded-xl flex items-center justify-center">
                                    <CalendarDays className="w-6 h-6 text-info" />
                                </div>
                                <p className="text-sm font-semibold text-info">Schedule</p>
                                <p className="text-xs text-text-muted">My shifts</p>
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
