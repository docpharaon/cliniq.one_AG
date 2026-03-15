'use client';

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
    Wifi,
    Bot,
    ArrowRight,
    UserCog,
    DollarSign,
    AlertTriangle,
    CalendarDays,
    Newspaper,
    Megaphone,
    BarChart3,
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
    BarChart,
    Bar,
} from 'recharts';
import { useEffect, useState } from 'react';
import { fetchDashboardStats } from '@/lib/actions';

// Mock timeseries data (will be replaced when analytics tables exist)
const consultationFlow = [
    { time: '00:00', consultations: 2 },
    { time: '03:00', consultations: 1 },
    { time: '06:00', consultations: 5 },
    { time: '09:00', consultations: 18 },
    { time: '12:00', consultations: 23 },
    { time: '15:00', consultations: 15 },
    { time: '18:00', consultations: 12 },
    { time: '21:00', consultations: 8 },
];

const specialtyData = [
    { name: 'Dermatology', count: 67, fill: '#2DD4BF' },
    { name: 'Family Medicine', count: 22, fill: '#5EEAD4' },
];

const recentActivity = [
    { id: 1, text: 'New patient Sarah K. registered', time: '2 min ago', type: 'info' as const },
    { id: 2, text: 'Dr. Ahmed completed consultation #C-4523', time: '5 min ago', type: 'success' as const },
    { id: 3, text: 'Protocol violation detected - Case #C-4518', time: '12 min ago', type: 'error' as const },
    { id: 4, text: 'Token purchase: 15 tokens by User #U-892', time: '18 min ago', type: 'info' as const },
    { id: 5, text: 'Dr. Fatima verified and approved', time: '25 min ago', type: 'success' as const },
];

const systemHealth = [
    { label: 'Database', status: 'Operational', icon: Database, ok: true },
    { label: 'API Latency', status: '45ms', icon: Wifi, ok: true },
    { label: 'AI Service', status: 'Operational', icon: Bot, ok: true },
];

const managementCards = [
    {
        href: '/dashboard/hr',
        icon: UserCog,
        emoji: '👩‍💼',
        title: 'HR Management',
        subtitle: 'Add/Remove doctors & manage credentials',
        gradient: 'from-orange-500 to-red-500',
    },
    {
        href: '/dashboard/ai-prompts',
        icon: Bot,
        emoji: '⚙️',
        title: 'AI Prompt Management',
        subtitle: 'System prompts & doctor suggestions',
        gradient: 'from-purple-500 to-blue-500',
    },
    {
        href: '/dashboard/pricing',
        icon: DollarSign,
        emoji: '💰',
        title: 'Pricing Management',
        subtitle: 'Token packages & consultation fees',
        gradient: 'from-green-500 to-emerald-500',
    },
    {
        href: '/dashboard/protocols',
        icon: ShieldAlert,
        emoji: '🛡️',
        title: 'Intervention Management',
        subtitle: 'Medical procedures & in-clinic services',
        gradient: 'from-teal-500 to-green-500',
    },
    {
        href: '/dashboard/errors',
        icon: AlertTriangle,
        emoji: '🧑‍🔧',
        title: 'Error Reports',
        subtitle: 'Patient-reported chat issues',
        gradient: 'from-red-600 to-orange-500',
    },
    {
        href: '/dashboard/scheduling',
        icon: CalendarDays,
        emoji: '📅',
        title: 'Doctor Scheduling',
        subtitle: 'Manage shifts & availability',
        gradient: 'from-indigo-500 to-purple-500',
    },
    {
        href: '/dashboard/news',
        icon: Newspaper,
        emoji: '📰',
        title: 'News Management',
        subtitle: 'Health updates & announcements',
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        href: '/dashboard/ads',
        icon: Megaphone,
        emoji: '🎯',
        title: 'Advertisement Management',
        subtitle: 'Promotions & featured content',
        gradient: 'from-red-500 to-orange-600',
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
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        fetchDashboardStats().then(setStats);
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

            <div className="p-8 max-w-[1400px] mx-auto space-y-8">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-text-muted text-sm">System Administrator</p>
                        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                            Admin User
                            <span className="text-lg">🛡️</span>
                        </h2>
                    </div>
                    <div className="text-right mt-2 sm:mt-0">
                        <p className="text-sm text-text-secondary">📅 {dateStr}</p>
                        <p className="text-sm text-text-muted">{timeStr} AST</p>
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
                                <span className="text-xl">🔴</span>
                                <span className="text-sm font-medium text-text-primary">
                                    {stats.unresolvedProtocols} unresolved protocol violation{stats.unresolvedProtocols !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <Link
                                href="/dashboard/protocols"
                                className="text-sm text-error font-medium hover:underline flex items-center gap-1"
                            >
                                Review <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* KPI Stats - Row 1 (Live from Supabase) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                        value="98.7%"
                        label="Uptime (30d)"
                        iconColor="text-success"
                        iconBg="bg-success-faded"
                    />
                </div>

                {/* System Health */}
                <div className="glass rounded-2xl p-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Link href="/dashboard/doctors" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-accent-faded rounded-xl flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-accent" />
                        </div>
                        <p className="text-sm font-semibold text-accent">Doctors</p>
                        <p className="text-xs text-text-muted">Manage staff</p>
                    </Link>
                    <Link href="/dashboard/users" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-info-faded rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-info" />
                        </div>
                        <p className="text-sm font-semibold text-info">Patients</p>
                        <p className="text-xs text-text-muted">User management</p>
                    </Link>
                    <Link href="/dashboard/consultations" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
                        <div className="w-12 h-12 bg-purple-faded rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple" />
                        </div>
                        <p className="text-sm font-semibold text-purple">Consultations</p>
                        <p className="text-xs text-text-muted">View all cases</p>
                    </Link>
                    <Link href="/dashboard/analytics" className="glass rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200">
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
                                href={card.href}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r ${card.gradient} hover:opacity-90 hover:scale-[1.01] transition-all duration-200 group`}
                            >
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm flex items-center gap-2">
                                        {card.emoji} {card.title}
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
                    <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            <h3 className="text-lg font-bold text-text-primary">Consultation Flow</h3>
                            <span className="text-xs text-text-muted ml-auto">Last 24 hours</span>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={consultationFlow}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
                                <XAxis dataKey="time" stroke="#64748B" fontSize={12} />
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
                                    dataKey="consultations"
                                    stroke="#2DD4BF"
                                    strokeWidth={3}
                                    dot={{ fill: '#2DD4BF', r: 4 }}
                                    activeDot={{ r: 6, fill: '#2DD4BF' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Specialty Breakdown */}
                    <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Stethoscope className="w-5 h-5 text-accent" />
                            <h3 className="text-lg font-bold text-text-primary">Specialty Breakdown</h3>
                            <span className="text-xs text-text-muted ml-auto">This month</span>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={specialtyData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
                                <XAxis type="number" stroke="#64748B" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={120} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#0F172A',
                                        border: '1px solid #1E293B',
                                        borderRadius: '12px',
                                        color: '#F1F5F9',
                                        fontSize: '13px',
                                    }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold text-text-primary">Recent Activity</h3>
                    </div>
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
                </div>
            </div>
        </>
    );
}
