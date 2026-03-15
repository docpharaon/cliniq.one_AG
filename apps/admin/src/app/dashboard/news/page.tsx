'use client';

import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Newspaper, Eye, PenLine, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchNewsArticles } from '@/lib/actions';

type NewsRow = {
    id: string;
    title: string;
    category: string;
    is_published: boolean;
    published_at: string | null;
    views: number;
    author: string | null;
    created_at: string;
};

const columns = [
    {
        key: 'title',
        label: 'Title',
        render: (row: NewsRow) => (
            <div>
                <p className="font-semibold text-text-primary max-w-[300px] truncate">{row.title}</p>
                <p className="text-xs text-text-muted">{row.author ?? 'System'}</p>
            </div>
        ),
    },
    {
        key: 'category',
        label: 'Category',
        render: (row: NewsRow) => (
            <span className="text-accent text-sm capitalize">{row.category?.replace('_', ' ')}</span>
        ),
    },
    {
        key: 'is_published',
        label: 'Status',
        render: (row: NewsRow) => (
            <StatusBadge label={row.is_published ? 'Published' : 'Draft'} variant={row.is_published ? 'success' : 'warning'} />
        ),
    },
    {
        key: 'views',
        label: 'Views',
        render: (row: NewsRow) => (
            <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-secondary">{row.views.toLocaleString()}</span>
            </div>
        ),
    },
    {
        key: 'created_at',
        label: 'Created',
        render: (row: NewsRow) => (
            <span className="text-sm text-text-secondary">
                {new Date(row.created_at).toLocaleDateString()}
            </span>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: NewsRow) => (
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">
                    Edit
                </button>
                {!row.is_published && (
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-success-faded text-success hover:bg-success/20 transition-colors font-semibold">
                        Publish
                    </button>
                )}
            </div>
        ),
    },
];

export default function NewsPage() {
    const [articles, setArticles] = useState<NewsRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNewsArticles(1, 50).then(({ data, count }) => {
            setArticles(data as NewsRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    const publishedCount = articles.filter(a => a.is_published).length;
    const totalViews = articles.reduce((s, a) => s + a.views, 0);

    return (
        <>
            <Header title="News Management" subtitle="Health articles & announcements" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Newspaper} value={String(totalCount)} label="Total Articles" />
                    <StatCard icon={Send} value={String(publishedCount)} label="Published" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={PenLine} value={String(totalCount - publishedCount)} label="Drafts" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={Eye} value={totalViews.toLocaleString()} label="Total Views" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="All Articles"
                        subtitle={`${totalCount} articles`}
                        columns={columns}
                        data={articles}
                        totalCount={totalCount}
                        searchPlaceholder="Search by title or category..."
                        rowKey={(row) => row.id}
                        actions={
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                                <PenLine className="w-4 h-4" /> New Article
                            </button>
                        }
                    />
                )}
            </div>
        </>
    );
}
