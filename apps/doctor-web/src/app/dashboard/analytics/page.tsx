'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import {
    Coins, TrendingUp, Star, BarChart3,
    Target, Clock, Award, DollarSign, Loader2,
    CreditCard, Zap, Trophy,
} from 'lucide-react';
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import { fetchWeeklyActivity, fetchCaseDistribution, fetchAvgResponseTime, fetchDoctorAnalyticsExtra } from '@/lib/actions';

const COLORS = ['#2DD4BF', '#3B82F6', '#9B72CF', '#F59E0B', '#EF4444', '#10B981'];

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalCases: 0,
        avgRating: 0,
        avgResponseTime: '—',
    });
    const [todayStats, setTodayStats] = useState({
        todayCompleted: 0,
        dailyLimit: 20,
        remaining: 20,
        ratingAvg: 0,
        ratingCount: 0,
    });
    const [weeklyData, setWeeklyData] = useState<{ day: string; cases: number; earnings: number }[]>([]);
    const [specialtyData, setSpecialtyData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id, tokens_earned, rating_avg, rating_count')
                    .eq('user_id', user.id)
                    .single();

                if (!doctor) return;

                const { count: totalCases } = await supabase
                    .from('consultations')
                    .select('*', { count: 'exact', head: true })
                    .eq('doctor_id', doctor.id);

                const [weekly, distribution, avgResp, extra] = await Promise.all([
                    fetchWeeklyActivity(doctor.id),
                    fetchCaseDistribution(doctor.id),
                    fetchAvgResponseTime(doctor.id),
                    fetchDoctorAnalyticsExtra(doctor.id),
                ]);

                setStats({
                    totalEarnings: doctor.tokens_earned || 0,
                    totalCases: totalCases || 0,
                    avgRating: doctor.rating_avg || 0,
                    avgResponseTime: avgResp,
                });

                setTodayStats(extra);
                setWeeklyData(weekly);
                setSpecialtyData(distribution);
            } catch (err) {
                console.error('Analytics load error:', err);
            }
            setLoading(false);
        }

        loadAnalytics();
    }, []);

    // Compute bonus target progress
    const monthlyTargetProgress = Math.min(100, Math.round((stats.totalCases / 100) * 100));
    const ratingProgress = Math.min(100, Math.round((todayStats.ratingAvg / 5) * 100));
    const responseTimeNum = stats.avgResponseTime.match(/\d+/)?.[0];
    const fastResponseProgress = responseTimeNum ? Math.min(100, Math.round(((20 - Math.min(20, Number(responseTimeNum))) / 20) * 100)) : 0;

    return (
        <>
            <Header title="Analytics" subtitle="Your performance metrics and earnings" />

            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <StatCard
                                icon={Coins}
                                value={stats.totalEarnings.toLocaleString()}
                                label="Total Tokens"
                                iconColor="text-gold"
                                iconBg="bg-gold-faded"
                            />
                            <StatCard
                                icon={Target}
                                value={stats.totalCases}
                                label="Total Cases"
                            />
                            <StatCard
                                icon={Star}
                                value={stats.avgRating.toFixed(1)}
                                label={`Avg Rating (${todayStats.ratingCount})`}
                                iconColor="text-purple"
                                iconBg="bg-purple-faded"
                            />
                            <StatCard
                                icon={Clock}
                                value={stats.avgResponseTime}
                                label="Avg Response"
                                iconColor="text-info"
                                iconBg="bg-info-faded"
                            />
                        </div>

                        {/* Today's Activity */}
                        <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 md:mb-6">
                                <Zap className="w-5 h-5 text-accent" />
                                <h3 className="text-lg font-bold text-text-primary">Today&apos;s Activity</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-3 md:gap-6">
                                <div className="bg-bg-elevated rounded-xl p-4 md:p-5 border border-border text-center">
                                    <p className="text-2xl md:text-3xl font-bold text-accent">{todayStats.todayCompleted}</p>
                                    <p className="text-xs text-text-muted mt-1">Cases Seen</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-4 md:p-5 border border-border text-center">
                                    <p className="text-2xl md:text-3xl font-bold text-text-primary">{todayStats.dailyLimit}</p>
                                    <p className="text-xs text-text-muted mt-1">Daily Limit</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-4 md:p-5 border border-border text-center">
                                    <p className={`text-2xl md:text-3xl font-bold ${todayStats.remaining === 0 ? 'text-error' : todayStats.remaining <= 3 ? 'text-warning' : 'text-success'}`}>
                                        {todayStats.remaining}
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">Remaining</p>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-accent to-purple rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (todayStats.todayCompleted / todayStats.dailyLimit) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-text-muted text-right mt-1">
                                    {Math.round((todayStats.todayCompleted / todayStats.dailyLimit) * 100)}% of daily capacity
                                </p>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                            {/* Weekly Cases + Earnings */}
                            <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart3 className="w-5 h-5 text-accent" />
                                    <h3 className="text-lg font-bold text-text-primary">Weekly Performance</h3>
                                </div>
                                {weeklyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={weeklyData}>
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
                                            <Bar dataKey="cases" fill="#2DD4BF" radius={[4, 4, 0, 0]} name="Cases" />
                                            <Bar dataKey="earnings" fill="#9B72CF" radius={[4, 4, 0, 0]} name="Tokens" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[280px] text-text-muted">
                                        <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
                                        <p className="text-sm">No activity this week</p>
                                    </div>
                                )}
                            </div>

                            {/* Specialty Distribution */}
                            <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-6">
                                    <Award className="w-5 h-5 text-purple" />
                                    <h3 className="text-lg font-bold text-text-primary">Case Distribution</h3>
                                </div>
                                {specialtyData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={specialtyData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {specialtyData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        background: '#0F172A',
                                                        border: '1px solid #1E293B',
                                                        borderRadius: '12px',
                                                        color: '#F1F5F9',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex flex-wrap gap-3 mt-4 justify-center">
                                            {specialtyData.map((entry, index) => (
                                                <div key={entry.name} className="flex items-center gap-2 text-xs text-text-secondary">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    {entry.name} ({entry.value})
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[280px] text-text-muted">
                                        <Award className="w-10 h-10 mb-2 opacity-40" />
                                        <p className="text-sm">No case data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Earnings Breakdown + Bonus Targets Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                            {/* Earnings Summary */}
                            <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <DollarSign className="w-5 h-5 text-gold" />
                                    <h3 className="text-lg font-bold text-text-primary">Earnings Breakdown</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-bg-elevated rounded-xl p-5 border border-border">
                                        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Tokens</p>
                                        <p className="text-2xl font-bold text-gold">💎 {stats.totalEarnings.toLocaleString()}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Est. SAR</p>
                                            <p className="text-xl font-bold text-accent">SAR {(stats.totalEarnings * 5).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Est. USD</p>
                                            <p className="text-xl font-bold text-success">${(stats.totalEarnings * 1.33).toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bonus Targets */}
                            <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <Trophy className="w-5 h-5 text-gold" />
                                    <h3 className="text-lg font-bold text-text-primary">Bonus Targets</h3>
                                </div>
                                <div className="space-y-4">
                                    <BonusRow
                                        icon={Target}
                                        label="Monthly target (100 cases)"
                                        reward="+300 tokens"
                                        progress={monthlyTargetProgress}
                                        color="text-accent"
                                        bgColor="bg-accent"
                                    />
                                    <BonusRow
                                        icon={Star}
                                        label="High rating (>4.5)"
                                        reward="+5% monthly"
                                        progress={ratingProgress}
                                        color="text-purple"
                                        bgColor="bg-purple"
                                    />
                                    <BonusRow
                                        icon={Zap}
                                        label="Fast response (<20 min)"
                                        reward="+5% monthly"
                                        progress={fastResponseProgress}
                                        color="text-gold"
                                        bgColor="bg-gold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payout Information */}
                        <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 md:mb-6">
                                <CreditCard className="w-5 h-5 text-accent" />
                                <h3 className="text-lg font-bold text-text-primary">Payout Information</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Schedule</p>
                                    <p className="text-sm font-semibold text-text-primary">Monthly (1st)</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Minimum</p>
                                    <p className="text-sm font-semibold text-text-primary">400 tokens</p>
                                    <p className="text-xs text-text-muted">≈ 2,000 SAR</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Processing</p>
                                    <p className="text-sm font-semibold text-text-primary">3-5 business days</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-4 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Early Payout</p>
                                    <p className="text-sm font-semibold text-text-primary">Available</p>
                                    <p className="text-xs text-text-muted">2% processing fee</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function BonusRow({ icon: Icon, label, reward, progress, color, bgColor }: {
    icon: any;
    label: string;
    reward: string;
    progress: number;
    color: string;
    bgColor: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bgColor}/10 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-text-primary font-medium truncate">{label}</p>
                    <span className="text-xs text-gold font-semibold flex-shrink-0 ml-2">{reward}</span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                        className={`h-full ${bgColor} rounded-full transition-all duration-700`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
            <span className="text-xs text-text-muted font-mono w-8 text-right flex-shrink-0">{progress}%</span>
        </div>
    );
}
