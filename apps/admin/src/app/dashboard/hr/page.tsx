'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import {
    Users,
    Stethoscope,
    UserCheck,
    UserX,
    ClipboardCheck,
    ShieldCheck,
    UserPlus,
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useEffect, useState } from 'react';
import { fetchDoctors } from '@/lib/actions';

type HRRow = {
    id: string;
    display_name: string;
    specialty: string;
    license_number: string;
    status: string;
    is_accepting: boolean;
    created_at: string;
};

const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    probation: 'info',
    suspended: 'error',
    inactive: 'neutral',
};

const columns = [
    {
        key: 'display_name',
        label: 'Name',
        render: (row: HRRow) => (
            <div>
                <p className="font-semibold text-text-primary">{row.display_name}</p>
                <p className="text-xs text-text-muted">{row.license_number}</p>
            </div>
        ),
    },
    {
        key: 'specialty',
        label: 'Role / Specialty',
        render: (row: HRRow) => (
            <span className="text-accent text-sm capitalize">{row.specialty?.replace('_', ' ')}</span>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        render: (row: HRRow) => (
            <StatusBadge
                label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                variant={statusMap[row.status] ?? 'neutral'}
            />
        ),
    },
    {
        key: 'is_accepting',
        label: 'Accepting',
        render: (row: HRRow) => (
            <StatusBadge label={row.is_accepting ? 'Yes' : 'No'} variant={row.is_accepting ? 'success' : 'neutral'} />
        ),
    },
    {
        key: 'created_at',
        label: 'Joined',
        render: (row: HRRow) => (
            <span className="text-sm text-text-secondary">{new Date(row.created_at).toLocaleDateString()}</span>
        ),
    },
    {
        key: 'actions',
        label: '',
        render: (row: HRRow) => (
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs rounded-lg text-accent hover:bg-accent-faded transition-colors">View</button>
                {row.status === 'pending' && (
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-success-faded text-success hover:bg-success/20 transition-colors font-semibold">Verify</button>
                )}
            </div>
        ),
    },
];

export default function HRPage() {
    const [staff, setStaff] = useState<HRRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDoctors(1, 100).then(({ data, count }) => {
            setStaff(data as HRRow[]);
            setTotalCount(count);
            setLoading(false);
        });
    }, []);

    const activeCount = staff.filter(s => s.status === 'active').length;
    const pendingCount = staff.filter(s => s.status === 'pending').length;

    return (
        <>
            <Header title="HR Management" subtitle="Staff credentials, onboarding & verification" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Stethoscope} value={String(totalCount)} label="Total Staff" />
                    <StatCard icon={UserCheck} value={String(activeCount)} label="Active" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={UserX} value={String(pendingCount)} label="Pending Verification" iconColor="text-warning" iconBg="bg-warning-faded" />
                    <StatCard icon={Users} value={String(totalCount - activeCount - pendingCount)} label="Other" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary">HR Quick Actions</h3>
                        <p className="text-sm text-text-muted mt-1">Common onboarding and verification tasks</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all">
                            <UserPlus className="w-4 h-4" /> Start Onboarding
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple text-purple text-sm font-semibold hover:bg-purple-faded transition-all">
                            <ClipboardCheck className="w-4 h-4" /> Verify Credentials
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold text-gold text-sm font-semibold hover:bg-gold-faded transition-all">
                            <ShieldCheck className="w-4 h-4" /> License Check
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Medical Staff"
                        subtitle={`${totalCount} staff members`}
                        columns={columns}
                        data={staff}
                        totalCount={totalCount}
                        searchPlaceholder="Search by name or license..."
                        rowKey={(row) => row.id}
                    />
                )}
            </div>
        </>
    );
}
