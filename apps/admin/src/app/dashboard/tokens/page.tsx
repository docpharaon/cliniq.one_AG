import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Coins, ArrowUpRight, ArrowDownRight, Gift, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchTokenTransactions } from '@/lib/actions';

type TokenRow = {
    id: string;
    user_name: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
};

const typeMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    purchase: { variant: 'success', label: 'Purchase' },
    spend: { variant: 'error', label: 'Spend' },
    earn: { variant: 'success', label: 'Earned' },
    refund: { variant: 'warning', label: 'Refund' },
    bonus: { variant: 'info', label: 'Bonus' },
    admin_grant: { variant: 'info', label: 'Admin Grant' },
};

const columns = [
    {
        key: 'id',
        label: 'ID',
        render: (row: TokenRow) => (
            <span className="font-mono text-xs text-text-muted">{row.id.slice(0, 8)}…</span>
        ),
    },
    { key: 'user_name', label: 'User' },
    {
        key: 'type',
        label: 'Type',
        render: (row: TokenRow) => {
            const t = typeMap[row.type] ?? { variant: 'neutral' as const, label: row.type };
            return <StatusBadge label={t.label} variant={t.variant} />;
        },
    },
    {
        key: 'amount',
        label: 'Amount',
        render: (row: TokenRow) => (
            <span className={`font-bold ${row.amount > 0 ? 'text-success' : 'text-error'}`}>
                {row.amount > 0 ? '+' : ''}{row.amount}
            </span>
        ),
    },
    {
        key: 'balance_after',
        label: 'Balance After',
        render: (row: TokenRow) => (
            <span className="text-gold font-medium">{row.balance_after}</span>
        ),
    },
    { key: 'description', label: 'Description' },
    {
        key: 'created_at',
        label: 'Date',
        render: (row: TokenRow) => (
            <span className="text-sm text-text-secondary">
                {new Date(row.created_at).toLocaleDateString()}
            </span>
        ),
    },
];

export default function TokensPage() {
    const [tokens, setTokens] = useState<TokenRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTokenTransactions(1, 50).then(({ data, count }) => {
            setTokens(data as TokenRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    // Calculate summary stats from loaded data
    const purchased = tokens.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
    const spent = tokens.filter(t => t.type === 'spend').reduce((s, t) => s + Math.abs(t.amount), 0);
    const bonuses = tokens.filter(t => t.type === 'bonus' || t.type === 'admin_grant').reduce((s, t) => s + t.amount, 0);

    return (
        <>
            <Header title="Token Management" subtitle="Track transactions & manage token economy" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Coins} value={String(totalCount)} label="Total Transactions" iconColor="text-gold" iconBg="bg-gold-faded" />
                    <StatCard icon={ArrowUpRight} value={String(purchased)} label="Purchased (loaded)" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={ArrowDownRight} value={String(spent)} label="Spent (loaded)" iconColor="text-error" iconBg="bg-error-faded" />
                    <StatCard icon={Gift} value={String(bonuses)} label="Bonuses Given" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {/* Grant Tokens Action */}
                <div className="glass rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary">Admin Actions</h3>
                        <p className="text-sm text-text-muted mt-1">Grant tokens or process refunds for users</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                            <Gift className="w-4 h-4" />
                            Grant Tokens
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-warning text-warning text-sm font-semibold hover:bg-warning-faded transition-all">
                            <RefreshCw className="w-4 h-4" />
                            Process Refund
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Transaction Log"
                        subtitle={`${totalCount} token transactions`}
                        columns={columns}
                        data={tokens}
                        totalCount={totalCount}
                        searchPlaceholder="Search by user, type, or description..."
                        rowKey={(row) => row.id}
                    />
                )}
            </div>
        </>
    );
}
