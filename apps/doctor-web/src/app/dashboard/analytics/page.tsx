'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import {
    Coins, TrendingUp, Star, BarChart3,
    Target, Clock, Award, DollarSign, Loader2,
} from 'lucide-react';
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';
import { fetchWeeklyActivity, fetchCaseDistribution, fetchAvgResponseTime } from '@/lib/actions';

const COLORS = ['#2DD4BF', '#3B82F6', '#9B72CF', '#F59E0B', '#EF4444', '#10B981'];

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalCases: 0,
        avgRating: 0,
        avgResponseTime: '—',
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

                // Fetch real analytics data in parallel
                const [weekly, distribution, avgResp] = await Promise.all([
                    fetchWeeklyActivity(doctor.id),
                    fetchCaseDistribution(doctor.id),
                    fetchAvgResponseTime(doctor.id),
                ]);

                setStats({
                    totalEarnings: doctor.tokens_earned || 0,
                    totalCases: totalCases || 0,
                    avgRating: doctor.rating_avg || 0,
                    avgResponseTime: avgResp,
                });

                setWeeklyData(weekly);
                setSpecialtyData(distribution);
            } catch (err) {
                console.error('Analytics load error:', err);
            }
            setLoading(false);
        }

        loadAnalytics();
    }, []);

    return (
        <>
            <Header title="Analytics" subtitle="Your performance metrics and earnings" />

            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                label="Avg Rating"
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

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Weekly Cases + Earnings */}
                            <div className="glass rounded-2xl p-6 animate-fade-in">
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
                            <div className="glass rounded-2xl p-6 animate-fade-in">
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

                        {/* Earnings Summary */}
                        <div className="glass rounded-2xl p-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-6">
                                <DollarSign className="w-5 h-5 text-gold" />
                                <h3 className="text-lg font-bold text-text-primary">Earnings Breakdown</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-bg-elevated rounded-xl p-5 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Tokens</p>
                                    <p className="text-2xl font-bold text-gold">💎 {stats.totalEarnings.toLocaleString()}</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-5 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Est. SAR</p>
                                    <p className="text-2xl font-bold text-accent">SAR {(stats.totalEarnings * 5).toLocaleString()}</p>
                                </div>
                                <div className="bg-bg-elevated rounded-xl p-5 border border-border">
                                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Est. USD</p>
                                    <p className="text-2xl font-bold text-success">${(stats.totalEarnings * 1.33).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
