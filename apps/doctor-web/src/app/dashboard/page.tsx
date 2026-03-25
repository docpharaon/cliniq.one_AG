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
    Copy,
    Check,
    ShieldAlert,
    AlertTriangle,
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
import { fetchDoctorDashboardStats, fetchQueueConsultations, fetchWeeklyActivity, fetchDoctorSchedule, updateDoctorAccepting } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';
import { useFeatureGate } from '@/hooks/useFeatureGate';



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
    const [codeCopied, setCodeCopied] = useState(false);
    const [isAccepting, setIsAccepting] = useState(true);
    const [togglingAccepting, setTogglingAccepting] = useState(false);
    const [doctorId, setDoctorId] = useState('');
    const [todayShift, setTodayShift] = useState<{ start: string; end: string; limit: number } | null>(null);

    // Locum-specific state
    const [locumInfo, setLocumInfo] = useState<{
        isLocum: boolean;
        identifierCode: string;
        credentialExpiresAt: string | null;
        sandboxMode: boolean;
        onboardingStatus: string;
    } | null>(null);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id, display_name, full_name, specialty, doctor_type, identifier_code, credential_expires_at, sandbox_mode, onboarding_status, is_accepting')
                    .eq('user_id', user.id)
                    .single();

                if (!doctor) return;

                setDoctorName(doctor.display_name || doctor.full_name || 'Doctor');
                setDoctorId(doctor.id);
                setIsAccepting(doctor.is_accepting !== false);

                // Set locum info if applicable
                if (doctor.doctor_type === 'locum') {
                    setLocumInfo({
                        isLocum: true,
                        identifierCode: doctor.identifier_code,
                        credentialExpiresAt: doctor.credential_expires_at,
                        sandboxMode: doctor.sandbox_mode,
                        onboardingStatus: doctor.onboarding_status,
                    });
                }

                const [dashStats, queueData, weeklyData, scheduleData] = await Promise.all([
                    fetchDoctorDashboardStats(doctor.id),
                    fetchQueueConsultations(doctor.id, doctor.specialty, 1, 5),
                    fetchWeeklyActivity(doctor.id),
                    fetchDoctorSchedule(doctor.id),
                ]);

                setStats(dashStats);
                setQueuePreview(queueData.data.slice(0, 3));
                setWeeklyActivity(weeklyData);

                // Find today's shift
                const todayDay = new Date().getDay();
                const todaySlot = scheduleData.find((s: any) => s.day_of_week === todayDay && s.is_active);
                if (todaySlot) {
                    setTodayShift({
                        start: todaySlot.start_time?.slice(0, 5) || '',
                        end: todaySlot.end_time?.slice(0, 5) || '',
                        limit: todaySlot.daily_limit || 20,
                    });
                }
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
            <Header title="Dashboard" subtitle="Your consultation overview" doctorId={doctorId} doctorName={doctorName} />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-text-muted text-sm">Welcome back,</p>
                        <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
                            {doctorName}
                            <span className="text-lg">🩺</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Accepting Toggle */}
                        <button
                            onClick={async () => {
                                if (!doctorId || togglingAccepting) return;
                                setTogglingAccepting(true);
                                const newVal = !isAccepting;
                                setIsAccepting(newVal);
                                await updateDoctorAccepting(doctorId, newVal);
                                setTogglingAccepting(false);
                            }}
                            disabled={togglingAccepting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                                isAccepting
                                    ? 'bg-success/10 border-success/30 text-success hover:bg-success/20'
                                    : 'bg-warning/10 border-warning/30 text-warning hover:bg-warning/20'
                            }`}
                        >
                            <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${
                                isAccepting ? 'bg-success' : 'bg-text-muted'
                            }`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${
                                    isAccepting ? 'left-[18px]' : 'left-0.5'
                                }`} />
                            </div>
                            {isAccepting ? 'Accepting' : 'Paused'}
                        </button>
                        <div className="text-right">
                            <p className="text-sm text-text-secondary">📅 {dateStr}</p>
                            <p className="text-sm text-text-muted">{timeStr} {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'Local'}</p>
                        </div>
                    </div>
                </div>

                {/* Today's Shift Preview */}
                {todayShift && (
                    <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between animate-fade-in">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="w-5 h-5 text-accent" />
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Today&apos;s Shift</p>
                                <p className="text-xs text-text-muted">{todayShift.start} – {todayShift.end} · {todayShift.limit} cases max</p>
                            </div>
                        </div>
                        <Link href="/dashboard/schedule" className="text-xs text-accent hover:underline">
                            View schedule →
                        </Link>
                    </div>
                )}

                {/* Locum Status Banner */}
                {locumInfo?.isLocum && (() => {
                    const exp = locumInfo.credentialExpiresAt ? new Date(locumInfo.credentialExpiresAt) : null;
                    const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpired = daysLeft !== null && daysLeft < 0;
                    const isUrgent = daysLeft !== null && daysLeft <= 2 && !isExpired;
                    const isWarning = daysLeft !== null && daysLeft <= 7 && !isUrgent && !isExpired;

                    return (
                        <div className={`rounded-2xl p-4 flex items-center gap-4 ${
                            isExpired ? 'bg-error/10 border border-error/30' :
                            isUrgent ? 'bg-error/10 border border-error/20' :
                            isWarning ? 'bg-yellow-500/10 border border-yellow-500/20' :
                            'bg-accent/5 border border-accent/20'
                        }`}>
                            {isExpired || isUrgent ? (
                                <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${isExpired ? 'text-error' : 'text-error'}`} />
                            ) : isWarning ? (
                                <ShieldAlert className="w-6 h-6 flex-shrink-0 text-yellow-400" />
                            ) : (
                                <ShieldAlert className="w-6 h-6 flex-shrink-0 text-accent" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400">LOCUM</span>
                                    {locumInfo.sandboxMode && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400">🧪 SANDBOX</span>
                                    )}
                                    {locumInfo.onboardingStatus !== 'approved' && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                                            ⏳ {locumInfo.onboardingStatus.replace('_', ' ').toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm mt-1 ${
                                    isExpired ? 'text-error font-semibold' :
                                    isUrgent ? 'text-error' :
                                    isWarning ? 'text-yellow-400' :
                                    'text-text-secondary'
                                }`}>
                                    {isExpired ? '⚠️ Credentials expired — contact admin for renewal' :
                                     daysLeft !== null ? `Credentials expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` :
                                     'Locum account active'
                                    }
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Sandbox Onboarding Banner */}
                {locumInfo?.sandboxMode && (
                    <div className="rounded-2xl p-5 bg-gradient-to-r from-accent/10 to-purple/10 border border-accent/20 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🧪</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-text-primary">You&apos;re in Sandbox Mode</h3>
                                <p className="text-xs text-text-secondary mt-0.5">Explore the platform with demo data. Complete your onboarding to start seeing real patients.</p>
                            </div>
                            <Link
                                href="/dashboard/profile"
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-purple text-white text-sm font-semibold hover:-translate-y-0.5 transition-all flex-shrink-0"
                            >
                                Complete Setup →
                            </Link>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                            <Link href="/dashboard/queue" className="glass rounded-2xl p-4 md:p-5 flex flex-col items-center gap-2 md:gap-3 hover:-translate-y-1 transition-all duration-200">
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

                            {/* Locum: Doctor Code Card */}
                            {locumInfo?.isLocum && locumInfo.identifierCode && (
                                <div
                                    onClick={() => {
                                        navigator.clipboard.writeText(locumInfo.identifierCode);
                                        setCodeCopied(true);
                                        setTimeout(() => setCodeCopied(false), 2000);
                                    }}
                                    className="glass rounded-2xl p-4 md:p-5 flex flex-col items-center gap-2 md:gap-3 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                                        {codeCopied ? <Check className="w-6 h-6 text-success" /> : <Copy className="w-6 h-6 text-yellow-400" />}
                                    </div>
                                    <p className="font-mono text-lg font-bold text-yellow-400">{locumInfo.identifierCode}</p>
                                    <p className="text-xs text-text-muted text-center">{codeCopied ? 'Copied!' : 'Tap to copy code'}</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
