'use client';

import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Megaphone, MousePointerClick, Eye, DollarSign, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAdvertisements } from '@/lib/actions';

type AdRow = {
    id: string;
    title: string;
    placement: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    impressions: number;
    clicks: number;
    budget_sar: number;
};

const columns = [
    {
        key: 'title',
        label: 'Campaign',
        render: (row: AdRow) => (
            <p className="font-semibold text-text-primary max-w-[250px] truncate">{row.title}</p>
        ),
    },
    {
        key: 'placement',
        label: 'Placement',
        render: (row: AdRow) => (
            <span className="text-accent text-sm capitalize">{row.placement}</span>
        ),
    },
    {
        key: 'is_active',
        label: 'Status',
        render: (row: AdRow) => (
            <StatusBadge label={row.is_active ? 'Active' : 'Paused'} variant={row.is_active ? 'success' : 'neutral'} />
        ),
    },
    {
        key: 'impressions',
        label: 'Impressions',
        render: (row: AdRow) => (
            <span className="text-text-secondary">{row.impressions.toLocaleString()}</span>
        ),
    },
    {
        key: 'clicks',
        label: 'Clicks',
        render: (row: AdRow) => (
            <span className="text-text-secondary">{row.clicks.toLocaleString()}</span>
        ),
    },
    {
        key: 'ctr',
        label: 'CTR',
        render: (row: AdRow) => {
            const ctr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) : '0.0';
            return <span className="text-gold font-semibold">{ctr}%</span>;
        },
    },
    {
        key: 'budget_sar',
        label: 'Budget (SAR)',
        render: (row: AdRow) => (
            <span className="text-text-secondary">{Number(row.budget_sar).toLocaleString()}</span>
        ),
    },
    {
        key: 'start_date',
        label: 'Period',
        render: (row: AdRow) => (
            <span className="text-xs text-text-muted">
                {new Date(row.start_date).toLocaleDateString()} – {row.end_date ? new Date(row.end_date).toLocaleDateString() : 'Ongoing'}
            </span>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: () => (
            <button className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">
                Edit
            </button>
        ),
    },
];

export default function AdsPage() {
    const [ads, setAds] = useState<AdRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdvertisements(1, 50).then(({ data, count }) => {
            setAds(data as AdRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    const activeCount = ads.filter(a => a.is_active).length;
    const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
    const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
    const totalBudget = ads.reduce((s, a) => s + Number(a.budget_sar), 0);

    return (
        <>
            <Header title="Advertisement Management" subtitle="Campaigns, analytics & placements" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Megaphone} value={`${activeCount}/${totalCount}`} label="Active Campaigns" />
                    <StatCard icon={Eye} value={totalImpressions.toLocaleString()} label="Total Impressions" iconColor="text-info" iconBg="bg-info-faded" />
                    <StatCard icon={MousePointerClick} value={totalClicks.toLocaleString()} label="Total Clicks" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={DollarSign} value={`${totalBudget.toLocaleString()} SAR`} label="Total Budget" iconColor="text-gold" iconBg="bg-gold-faded" />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="All Campaigns"
                        subtitle={`${totalCount} advertisement campaigns`}
                        columns={columns}
                        data={ads}
                        totalCount={totalCount}
                        searchPlaceholder="Search by title or placement..."
                        rowKey={(row) => row.id}
                        actions={
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                                <Plus className="w-4 h-4" /> New Campaign
                            </button>
                        }
                    />
                )}
            </div>
        </>
    );
}
