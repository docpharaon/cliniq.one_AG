

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    Users,
    Stethoscope,
    FileText,
    Coins,
    Activity,
    TrendingUp,
    Clock,
    ShieldAlert,
    Database,
    Bot,
    ArrowRight,
    UserCog,
    DollarSign,
    AlertTriangle,
    CalendarDays,
    Newspaper,
    Megaphone,
    BarChart3,
    Archive,
    Printer,
    ShieldOff,
    Shield,
    Inbox,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import { fetchDashboardStats, fetchConsultationFlow, fetchSpecialtyBreakdown, fetchRecentActivity, fetchPendingArchiveCount, fetchDisabledSpecialtyCount, fetchOpenSpecialtyIncidentCount } from '@/lib/actions';

// System health (static indicators — no live monitoring API yet)
const systemHealth = [
    { label: 'Database', status: 'Supabase', icon: Database, ok: true },
    { label: 'AI Service', status: 'OpenAI', icon: Bot, ok: true },
];

const managementCards = [
    {
        href: '/dashboard/hr',
        icon: UserCog,
        title: 'HR Management',
        subtitle: 'Add/Remove doctors & manage credentials',
        gradient: 'from-orange-500 to-red-500',
    },
    {
        href: '/dashboard/ai',
        icon: Bot,
        title: 'AI Prompt Management',
        subtitle: 'System prompts & doctor suggestions',
        gradient: 'from-purple-500 to-blue-500',
    },
    {
        href: '/dashboard/pricing',
        icon: DollarSign,
        title: 'Pricing Management',
        subtitle: 'Token packages & consultation fees',
        gradient: 'from-green-500 to-emerald-500',
    },
    {
        href: '/dashboard/protocols',
        icon: ShieldAlert,
        title: 'Intervention Management',
        subtitle: 'Medical procedures & in-clinic services',
        gradient: 'from-teal-500 to-green-500',
    },
    {
        href: '/dashboard/errors',
        icon: AlertTriangle,
        title: 'Error Reports',
        subtitle: 'Patient-reported chat issues',
        gradient: 'from-red-600 to-orange-500',
    },
    {
        href: '/dashboard/scheduling',
        icon: CalendarDays,
        title: 'Doctor Scheduling',
        subtitle: 'Manage shifts & availability',
        gradient: 'from-indigo-500 to-purple-500',
    },
    {
        href: '/dashboard/news',
        icon: Newspaper,
        title: 'News Management',
        subtitle: 'Health updates & announcements',
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        href: '/dashboard/ads',
        icon: Megaphone,
        title: 'Advertisement Management',
        subtitle: 'Promotions & featured content',
        gradient: 'from-red-500 to-orange-600',
    },
    {
        href: '/dashboard/specialties',
        icon: ShieldOff,
        title: 'Specialty Management',
        subtitle: 'Disable, fallback & incident control',
        gradient: 'from-yellow-500 to-orange-500',
    },
];

type DashboardStats = {
    totalUsers: number;
    totalDoctors: number;
    activeConsultations: number;
    totalTokensInCirculation: number;
    unresolvedProtocols: number;
};

export default function DashboardPage() {
    const { user, isSuperadmin } = useAdminAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [consultationFlow, setConsultationFlow] = useState<{ time: string; consultations: number }[]>([]);
    const [specialtyData, setSpecialtyData] = useState<{ name: string; count: number; fill: string }[]>([]);
    const [recentActivity, setRecentActivity] = useState<{ id: string; text: string; time: string; type: 'info' | 'success' | 'error' }[]>([]);
    const [pendingArchiveCount, setPendingArchiveCount] = useState(0);
    const [disabledSpecialtyCount, setDisabledSpecialtyCount] = useState(0);
    const [openIncidentCount, setOpenIncidentCount] = useState(0);

    // Extract user info
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        Promise.all([
            fetchDashboardStats().then(setStats),
            fetchConsultationFlow().then(setConsultationFlow),
            fetchSpecialtyBreakdown().then(setSpecialtyData),
            fetchRecentActivity().then(setRecentActivity),
            fetchPendingArchiveCount().then(setPendingArchiveCount),
            fetchDisabledSpecialtyCount().then(setDisabledSpecialtyCount),
            fetchOpenSpecialtyIncidentCount().then(setOpenIncidentCount),
        ]);
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
            <Header title="Dashboard" subtitle="System overview & metrics" />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-8">
                {/* Welcome Header */}
                <div
                    className="rounded-2xl p-5 md:p-6 border"
                    style={{
                        background: isSuperadmin
                            ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.03))'
                            : 'var(--color-bg-elevated)',
                        borderColor: isSuperadmin ? 'rgba(245,158,11,0.25)' : 'var(--color-border)',
                    }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Profile Picture */}
                            {avatarUrl ? (
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={avatarUrl}
                                        alt={fullName}
                                        className="w-14 h-14 rounded-2xl object-cover border-2"
                                        style={{ borderColor: isSuperadmin ? '#f59e0b' : 'var(--color-accent)' }}
                                        referrerPolicy="no-referrer"
                                    />
                                    {isSuperadmin && (
                                        <div
                                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                        >
                                            <Shield className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                                    style={{
                                        background: isSuperadmin
                                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                            : 'var(--color-accent)',
                                    }}
                                >
                                    {fullName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="text-text-muted text-sm">{greeting},</p>
                                <h2 className="text-xl md:text-2xl font-bold text-text-primary">
                                    {fullName}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider"
                                        style={{
                                            background: isSuperadmin ? 'rgba(245,158,11,0.15)' : 'var(--color-accent-faded)',
                                            color: isSuperadmin ? '#f59e0b' : 'var(--color-accent)',
                                        }}
                                    >
                                        <Shield className="w-3 h-3" />
                                        {isSuperadmin ? 'Superadmin' : 'Admin'}
                                    </span>
                                    {user?.email && (
                                        <span className="text-xs text-text-muted hidden sm:inline">
                                            {user.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-text-secondary flex items-center justify-end gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" /> {dateStr}
                            </p>
                            <p className="text-sm text-text-muted">{timeStr} AST</p>
                        </div>
                    </div>
                </div>

                {/* Critical Alerts */}
                {stats && stats.unresolvedProtocols > 0 && (
                    <div className="space-y-3 animate-fade-in">
                        <div
                            className="flex items-center justify-between px-5 py-4 rounded-2xl border"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                                borderColor: 'rgba(239,68,68,0.3)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-error flex-shrink-0" />
                                <span className="text-sm font-medium text-text-primary">
                                    {stats.unresolvedProtocols} unresolved protocol violation{stats.unresolvedProtocols !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <Link to="/dashboard/protocols"
                                className="text-sm text-error font-medium hover:underline flex items-center gap-1"
                            >
                                Review <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Data Retention Alert */}
                {pendingArchiveCount > 0 && (
                    <div
                        className="flex items-center justify-between px-5 py-4 rounded-2xl border animate-fade-in"
                        style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                            borderColor: 'rgba(245,158,11,0.3)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                                <Archive className="w-5 h-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                                    ⚠ Data Retention Alert — {pendingArchiveCount} consultation{pendingArchiveCount !== 1 ? 's' : ''} pending
                                </p>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Concluded cases need to be printed, archived, and purged per zero-retention policy
                                </p>
                            </div>
                        </div>
                        <Link to="/dashboard/consultations"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80 transition-all whitespace-nowrap"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Go to Consultations <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                )}

                {/* Disabled Specialties Alert */}
                {disabledSpecialtyCount > 0 && (
                    <div
                        className="flex items-center justify-between px-5 py-4 rounded-2xl border animate-fade-in"
                        style={{
                            background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(251,146,60,0.05))',
                            borderColor: 'rgba(251,146,60,0.3)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.15)' }}>
                                <ShieldOff className="w-5 h-5" style={{ color: '#FB923C' }} />
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: '#FB923C' }}>
                                    {disabledSpecialtyCount} specialt{disabledSpecialtyCount !== 1 ? 'ies' : 'y'} temporarily disabled
                                </p>
                                {openIncidentCount > 0 && (
                                    <p className="text-xs text-error mt-0.5 font-medium">
                                        ⚠ {openIncidentCount} open incident{openIncidentCount !== 1 ? 's' : ''} require attention
                                    </p>
                                )}
                            </div>
                        </div>
                        <Link to="/dashboard/specialties"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80 transition-all whitespace-nowrap"
                            style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C' }}
                        >
                            <ShieldOff className="w-3.5 h-3.5" />
                            Manage <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                )}

                {/* KPI Stats - Row 1 (Live from Supabase) */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                    <StatCard
                        icon={Users}
                        value={stats ? stats.totalUsers.toLocaleString() : '…'}
                        label="Patients"
                    />
                    <StatCard
                        icon={Stethoscope}
                        value={stats ? String(stats.totalDoctors) : '…'}
                        label="Doctors"
                        iconColor="text-purple"
                        iconBg="bg-purple-faded"
                    />
                    <StatCard
                        icon={FileText}
                        value={stats ? String(stats.activeConsultations) : '…'}
                        label="Active Now"
                        iconColor="text-info"
                        iconBg="bg-info-faded"
                    />
                    <StatCard
                        icon={Coins}
                        value={stats ? stats.totalTokensInCirculation.toLocaleString() : '…'}
                        label="Tokens In Circulation"
                        iconColor="text-gold"
                        iconBg="bg-gold-faded"
                    />
                    <StatCard
                        icon={Activity}
                        value={stats ? `${stats.totalDoctors > 0 ? '✓' : '—'}` : '…'}
                        label="System Status"
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                </div>

                {/* System Health */}
                <div className="glass rounded-2xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold text-text-primary">System Health</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {systemHealth.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.label}
                                    className="bg-bg-elevated rounded-xl p-4 flex flex-col items-center gap-2 border border-border"
                                >
                                    <Icon className="w-6 h-6 text-text-secondary" />
                                    <p className="text-sm font-medium text-accent">{item.label}</p>
                                    <p className="text-xs text-text-muted">{item.status}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <Link to="/dashboard/doctors" className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-accent-faded rounded-xl flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-accent" />
                        </div>
                        <p className="text-sm font-semibold text-accent">Doctors</p>
                        <p className="text-xs text-text-muted">Manage staff</p>
                    </Link>
                    <Link to="/dashboard/users" className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-info-faded rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-info" />
                        </div>
                        <p className="text-sm font-semibold text-info">Patients</p>
                        <p className="text-xs text-text-muted">User management</p>
                    </Link>
                    <Link to="/dashboard/consultations" className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-purple-faded rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple" />
                        </div>
                        <p className="text-sm font-semibold text-purple">Consultations</p>
                        <p className="text-xs text-text-muted">View all cases</p>
                    </Link>
                    <Link to="/dashboard/analytics" className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-gold-faded rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-gold" />
                        </div>
                        <p className="text-sm font-semibold text-gold">Analytics</p>
                        <p className="text-xs text-text-muted">Reports & insights</p>
                    </Link>
                </div>

                {/* Management Cards */}
                <div className="space-y-3">
                    {managementCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link
                                key={card.href}
                                to={card.href}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r ${card.gradient} hover:opacity-90 hover:scale-[1.01] transition-all duration-200 group`}
                            >
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm flex items-center gap-2">
                                        {card.title}
                                    </p>
                                    <p className="text-white/75 text-xs mt-0.5">{card.subtitle}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        );
                    })}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Consultation Flow Chart */}
                    <div className="glass rounded-2xl p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            <h3 className="text-lg font-bold text-text-primary">Consultation Flow</h3>
                            <span className="text-xs text-text-muted ml-auto">Last 24 hours</span>
                        </div>
                        <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 260}>
                            <LineChart data={consultationFlow}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '12px',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '13px',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="consultations"
                                    stroke="var(--color-accent)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--color-accent)', r: 4 }}
                                    activeDot={{ r: 6, fill: 'var(--color-accent)' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Specialty Breakdown */}
                    <div className="glass rounded-2xl p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Stethoscope className="w-5 h-5 text-accent" />
                            <h3 className="text-lg font-bold text-text-primary">Specialty Breakdown</h3>
                            <span className="text-xs text-text-muted ml-auto">This month</span>
                        </div>
                        <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 260}>
                            <BarChart data={specialtyData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={12} width={120} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '12px',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '13px',
                                    }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass rounded-2xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold text-text-primary">Recent Activity</h3>
                    </div>
                    {recentActivity.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-text-muted">
                            <Inbox className="w-8 h-8 mb-2" />
                            <p className="text-sm">No activity yet</p>
                        </div>
                    ) : (
                    <div className="space-y-3">
                        {recentActivity.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-elevated border border-border hover:border-accent/30 transition-colors"
                            >
                                <StatusBadge label="" variant={item.type} pulse={item.type === 'error'} />
                                <p className="flex-1 text-sm text-text-primary">{item.text}</p>
                                <span className="text-xs text-text-muted whitespace-nowrap">{item.time}</span>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>
        </>
    );
}
