import { useState, useEffect } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import { addSchedule, editSchedule } from '@/lib/actions';

const DAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

type Doctor = {
    id: string;
    display_name: string;
    specialty: string;
};

type ScheduleForm = {
    doctor_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    daily_limit: string;
    is_active: boolean;
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

type Props = {
    mode: 'add' | 'edit';
    initialData?: ScheduleRow | null;
    doctors: Doctor[];
    onClose: () => void;
    onSaved: () => void;
};

const initialForm: ScheduleForm = {
    doctor_id: '',
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    daily_limit: '20',
    is_active: true,
};

export default function ScheduleSlotModal({ mode, initialData, doctors, onClose, onSaved }: Props) {
    const [form, setForm] = useState<ScheduleForm>(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setForm({
                doctor_id: initialData.doctor_id,
                day_of_week: initialData.day_of_week,
                start_time: initialData.start_time?.slice(0, 5) ?? '09:00',
                end_time: initialData.end_time?.slice(0, 5) ?? '17:00',
                daily_limit: String(initialData.daily_limit ?? 20),
                is_active: initialData.is_active,
            });
        } else if (doctors.length > 0 && !form.doctor_id) {
            setForm(prev => ({ ...prev, doctor_id: doctors[0].id }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, initialData, doctors]);

    function updateField<K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    }

    async function handleSave() {
        if (!form.doctor_id) { setError('Please select a doctor'); return; }
        if (!form.start_time || !form.end_time) { setError('Start and end times are required'); return; }
        if (form.start_time >= form.end_time) { setError('Start time must be before end time'); return; }

        const limit = parseInt(form.daily_limit, 10);
        if (!limit || limit < 1 || limit > 50) { setError('Daily limit must be between 1 and 50'); return; }

        setSaving(true);
        setError('');

        try {
            if (mode === 'add') {
                const res = await addSchedule({
                    doctor_id: form.doctor_id,
                    day_of_week: form.day_of_week,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    is_active: form.is_active,
                    daily_limit: limit,
                });
                if (res.error) throw new Error(res.error);
                setSuccess('Schedule slot created!');
            } else if (initialData) {
                const res = await editSchedule(initialData.id, {
                    day_of_week: form.day_of_week,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    is_active: form.is_active,
                    daily_limit: limit,
                });
                if (res.error) throw new Error(res.error);
                setSuccess('Schedule slot updated!');
            }
            setTimeout(() => { onSaved(); onClose(); }, 600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save schedule');
        }
        setSaving(false);
    }

    const inputCls = 'w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all';
    const labelCls = 'text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                style={{ pointerEvents: 'auto' }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in"
                style={{
                    pointerEvents: 'auto',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FA 100%)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent-faded flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">
                                {mode === 'add' ? 'Add Schedule Slot' : 'Edit Schedule Slot'}
                            </h3>
                            <p className="text-xs text-text-muted">
                                {mode === 'add' ? 'Create a new availability slot for a doctor' : 'Update this schedule slot'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-error hover:bg-error-faded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Doctor */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</span>
                            Doctor
                        </h4>
                        <div>
                            <label className={labelCls}>
                                Select Doctor <span className="text-error">*</span>
                            </label>
                            <select
                                value={form.doctor_id}
                                onChange={e => updateField('doctor_id', e.target.value)}
                                disabled={mode === 'edit'}
                                className={`${inputCls} appearance-none cursor-pointer ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <option value="">— Select a doctor —</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.display_name} ({d.specialty?.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-border/50" />

                    {/* Schedule details */}
                    <div>
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">2</span>
                            Schedule Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>
                                    Day of Week <span className="text-error">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {DAYS.map(d => {
                                        const selected = form.day_of_week === d.value;
                                        return (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() => updateField('day_of_week', d.value)}
                                                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected
                                                        ? 'bg-accent-faded border-accent/40 text-accent'
                                                        : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary hover:border-border/80'
                                                    }`}
                                            >
                                                {d.label.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Start Time <span className="text-error">*</span>
                                </label>
                                <input
                                    type="time"
                                    value={form.start_time}
                                    onChange={e => updateField('start_time', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    End Time <span className="text-error">*</span>
                                </label>
                                <input
                                    type="time"
                                    value={form.end_time}
                                    onChange={e => updateField('end_time', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Daily Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={form.daily_limit}
                                    onChange={e => updateField('daily_limit', e.target.value)}
                                    placeholder="20"
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex items-end pb-1">
                                <div>
                                    <label className={`${labelCls} mb-2`}>Active</label>
                                    <button
                                        type="button"
                                        onClick={() => updateField('is_active', !form.is_active)}
                                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all ${form.is_active
                                                ? 'bg-success-faded border-success/30 text-success'
                                                : 'bg-bg-elevated border-border text-text-muted'
                                            }`}
                                    >
                                        {form.is_active ? '● Active' : '○ Inactive'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-bg-secondary/30 flex items-center justify-between">
                    <div>
                        {error && (
                            <span className="text-xs text-error font-medium max-w-[300px] truncate block">{error}</span>
                        )}
                        {success && (
                            <span className="text-xs text-success font-medium">{success}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Calendar className="w-4 h-4" />
                            )}
                            {saving ? 'Saving...' : mode === 'add' ? 'Create Slot' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Animations */}
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
    );
}
