import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { TrendingUp, Users, Stethoscope, FileText, DollarSign } from 'lucide-react';
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
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useEffect, useState } from 'react';
import { fetchDashboardStats } from '@/lib/actions';

// Monthly data (mock — will be replaced when an analytics table is added)
const monthlyData = [
    { month: 'Sep', users: 120, consultations: 45, revenue: 2200 },
    { month: 'Oct', users: 180, consultations: 78, revenue: 3800 },
    { month: 'Nov', users: 240, consultations: 112, revenue: 5400 },
    { month: 'Dec', users: 310, consultations: 145, revenue: 7100 },
    { month: 'Jan', users: 420, consultations: 189, revenue: 9200 },
    { month: 'Feb', users: 520, consultations: 234, revenue: 11500 },
];

const statusBreakdown = [
    { name: 'Completed', value: 60, color: '#4ADE80' },
    { name: 'In Progress', value: 15, color: '#2DD4BF' },
    { name: 'Submitted', value: 10, color: '#60A5FA' },
    { name: 'Cancelled', value: 8, color: '#EF4444' },
    { name: 'Draft', value: 7, color: '#64748B' },
];

const specialtyBreakdown = [
    { name: 'Dermatology', count: 67, color: '#2DD4BF' },
    { name: 'Family Medicine', count: 33, color: '#5EEAD4' },
];

type DashboardStats = {
    totalUsers: number;
    totalDoctors: number;
    activeConsultations: number;
    totalTokensInCirculation: number;
    unresolvedProtocols: number;
};

export default function AnalyticsPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        fetchDashboardStats().then(setStats);
    }, []);

    return (
        <>
            <Header title="Analytics & Reports" subtitle="Platform metrics, trends & insights" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-8">
                {/* Live KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Users} value={stats ? stats.totalUsers.toLocaleString() : '…'} label="Total Users" />
                    <StatCard icon={Stethoscope} value={stats ? String(stats.totalDoctors) : '…'} label="Total Doctors" iconColor="text-purple" iconBg="bg-purple-faded" />
                    <StatCard icon={FileText} value={stats ? String(stats.activeConsultations) : '…'} label="Active Consultations" iconColor="text-info" iconBg="bg-info-faded" />
                    <StatCard icon={DollarSign} value={stats ? stats.totalTokensInCirculation.toLocaleString() : '…'} label="Tokens In Circulation" iconColor="text-gold" iconBg="bg-gold-faded" />
                </div>

                {/* Growth Chart */}
                <div className="glass rounded-2xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <h3 className="text-lg font-bold text-text-primary">Platform Growth</h3>
                        <span className="text-xs text-text-muted ml-auto">Last 6 months (mock)</span>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
                            <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
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
                            <Line type="monotone" dataKey="users" stroke="#2DD4BF" strokeWidth={2} name="Users" dot={{ fill: '#2DD4BF', r: 3 }} />
                            <Line type="monotone" dataKey="consultations" stroke="#60A5FA" strokeWidth={2} name="Consultations" dot={{ fill: '#60A5FA', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Distribution Pie */}
                    <div className="glass rounded-2xl p-4 md:p-6">
                        <h3 className="text-lg font-bold text-text-primary mb-6">Consultation Status Distribution</h3>
                        <div className="flex items-center">
                            <ResponsiveContainer width="50%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={statusBreakdown}
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {statusBreakdown.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
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
                            <div className="flex-1 space-y-2">
                                {statusBreakdown.map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                        <span className="text-sm text-text-secondary flex-1">{item.name}</span>
                                        <span className="text-sm font-semibold text-text-primary">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Specialty Breakdown */}
                    <div className="glass rounded-2xl p-4 md:p-6">
                        <h3 className="text-lg font-bold text-text-primary mb-6">Specialty Breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={specialtyBreakdown} layout="vertical">
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
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {specialtyBreakdown.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="glass rounded-2xl p-4 md:p-6">
                    <h3 className="text-lg font-bold text-text-primary mb-6">Revenue Trend (SAR)</h3>
                    <span className="text-xs text-text-muted">Mock data — will connect to payment analytics</span>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
                            <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                            <YAxis stroke="#64748B" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: '#0F172A',
                                    border: '1px solid #1E293B',
                                    borderRadius: '12px',
                                    color: '#F1F5F9',
                                    fontSize: '13px',
                                }}
                                formatter={(value: number) => [`${value} SAR`, 'Revenue']}
                            />
                            <Bar dataKey="revenue" fill="#FFD700" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}
