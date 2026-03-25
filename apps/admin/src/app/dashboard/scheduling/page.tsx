'use client';

import Header from '@/components/Header';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import ScheduleSlotModal from '@/components/ScheduleSlotModal';
import { Calendar, Users, Clock, CheckCircle, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { fetchSchedules, fetchDoctors, removeSchedule, editSchedule } from '@/lib/actions';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_TABS = [
    { value: -1, label: 'All Days' },
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

type Doctor = {
    id: string;
    display_name: string;
    specialty: string;
};

type ScheduleRow = {
    id: string;
    doctor_id: string;
    doctor_name: string;
    doctor_specialty: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    daily_limit: number;
};

export default function SchedulingPage() {
    const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [doctorCount, setDoctorCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dayFilter, setDayFilter] = useState(-1);
    const [doctorFilter, setDoctorFilter] = useState('');

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingRow, setEditingRow] = useState<ScheduleRow | null>(null);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Toggling active
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const dayArg = dayFilter >= 0 ? dayFilter : undefined;
        const docArg = doctorFilter || undefined;

        const [schedRes, docRes] = await Promise.all([
            fetchSchedules(1, 500, undefined, dayArg, docArg),
            fetchDoctors(1, 200),
        ]);

        setSchedules(schedRes.data as ScheduleRow[]);
        setTotalCount(schedRes.count);
        setDoctors((docRes.data as Doctor[]) ?? []);
        setDoctorCount(docRes.count);
        setLoading(false);
    }, [dayFilter, doctorFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const activeSlots = schedules.filter(s => s.is_active).length;

    // Open Add modal
    function openAdd() {
        setEditingRow(null);
        setModalMode('add');
        setModalOpen(true);
    }

    // Open Edit modal
    function openEdit(row: ScheduleRow) {
        setEditingRow(row);
        setModalMode('edit');
        setModalOpen(true);
    }

    // Toggle active/inactive
    async function toggleActive(row: ScheduleRow) {
        setTogglingId(row.id);
        try {
            await editSchedule(row.id, { is_active: !row.is_active });
            setSchedules(prev =>
                prev.map(s => s.id === row.id ? { ...s, is_active: !s.is_active } : s)
            );
        } catch (err) {
            console.error('Toggle failed', err);
        }
        setTogglingId(null);
    }

    // Delete schedule
    async function handleDelete() {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await removeSchedule(deleteId);
            if (res.error) throw new Error(res.error);
            setSchedules(prev => prev.filter(s => s.id !== deleteId));
            setTotalCount(prev => prev - 1);
        } catch (err) {
            console.error('Delete failed', err);
        }
        setDeleting(false);
        setDeleteId(null);
    }

    const columns = [
        {
            key: 'doctor_name',
            label: 'Doctor',
            render: (row: ScheduleRow) => (
                <div>
                    <p className="font-semibold text-text-primary">{row.doctor_name}</p>
                    <p className="text-xs text-text-muted capitalize">{row.doctor_specialty?.replace('_', ' ')}</p>
                </div>
            ),
        },
        {
            key: 'day_of_week',
            label: 'Day',
            render: (row: ScheduleRow) => (
                <span className="text-accent font-medium">{DAYS[row.day_of_week]}</span>
            ),
        },
        {
            key: 'start_time',
            label: 'Shift',
            render: (row: ScheduleRow) => (
                <span className="text-text-secondary">{row.start_time?.slice(0, 5)} – {row.end_time?.slice(0, 5)}</span>
            ),
        },
        {
            key: 'daily_limit',
            label: 'Daily Limit',
            render: (row: ScheduleRow) => (
                <span className="text-gold font-semibold">{row.daily_limit}/day</span>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (row: ScheduleRow) => (
                <StatusBadge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'neutral'} />
            ),
        },
        {
            key: 'actions',
            label: '',
            render: (row: ScheduleRow) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(row); }}
                        disabled={togglingId === row.id}
                        title={row.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg transition-colors ${row.is_active
                                ? 'text-success hover:bg-success-faded'
                                : 'text-text-muted hover:bg-bg-elevated'
                            } disabled:opacity-40`}
                    >
                        <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                        className="p-2 rounded-lg text-accent hover:bg-accent-faded transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
                        className="p-2 rounded-lg text-error hover:bg-error-faded transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];


    return (
        <>
            <Header title="Doctor Scheduling" subtitle="Manage shifts, availability & daily limits" />
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard icon={Calendar} value={String(totalCount)} label="Total Slots" />
                    <StatCard icon={CheckCircle} value={String(activeSlots)} label="Active Slots" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Users} value={String(doctorCount)} label="Total Doctors" iconColor="text-purple" iconBg="bg-purple-faded" />
                    <StatCard icon={Clock} value="24/7" label="Coverage Target" iconColor="text-gold" iconBg="bg-gold-faded" />
                </div>

                {/* Filters */}
                <div className="glass rounded-2xl p-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Day-of-week tabs */}
                        <div className="flex flex-wrap gap-1.5">
                            {DAY_TABS.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setDayFilter(tab.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dayFilter === tab.value
                                            ? 'bg-accent text-bg-primary shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
                                            : 'bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-bg-tertiary border border-border'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Doctor dropdown */}
                        <select
                            value={doctorFilter}
                            onChange={e => setDoctorFilter(e.target.value)}
                            className="bg-bg-elevated border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all appearance-none cursor-pointer min-w-[200px]"
                        >
                            <option value="">All Doctors</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.display_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        title="Schedule Overview"
                        subtitle={`${schedules.length} schedule slots${dayFilter >= 0 ? ` on ${DAYS[dayFilter]}` : ''}${doctorFilter ? ' (filtered)' : ''}`}
                        columns={columns}
                        data={schedules}
                        totalCount={schedules.length}
                        searchPlaceholder="Search by doctor name..."
                        rowKey={(row) => row.id}
                        actions={
                            <button
                                onClick={openAdd}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Slot
                            </button>
                        }
                    />
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <ScheduleSlotModal
                    mode={modalMode}
                    initialData={editingRow}
                    doctors={doctors}
                    onClose={() => setModalOpen(false)}
                    onSaved={loadData}
                />
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        style={{ pointerEvents: 'auto' }}
                        onClick={() => setDeleteId(null)}
                    />
                    <div
                        className="relative rounded-2xl p-6 max-w-[400px] w-full animate-scale-in"
                        style={{
                            pointerEvents: 'auto',
                            background: 'linear-gradient(180deg, #1C1427 0%, #0A0E1A 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-error-faded flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-error" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Delete Schedule Slot</h3>
                                <p className="text-xs text-text-muted">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary mb-6">
                            Are you sure you want to delete this schedule slot? The doctors availability will be removed immediately.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-error text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50"
                            >
                                {deleting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-scale-in {
                            animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
