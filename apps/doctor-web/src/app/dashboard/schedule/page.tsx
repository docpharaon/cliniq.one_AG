'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    CalendarDays, Clock, CheckCircle, Loader2, Power,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchDoctorSchedule } from '@/lib/actions';
import { createBrowserSupabase } from '@/lib/supabase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SchedulePage() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (doctor) {
                    const data = await fetchDoctorSchedule(doctor.id);
                    setSchedules(data);
                }
            } catch (err) {
                console.error('Load schedule error:', err);
            }
            setLoading(false);
        }
        load();
    }, []);

    const activeSlots = schedules.filter(s => s.is_active).length;

    // Compute next shift
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let nextShiftLabel = '—';
    if (schedules.length > 0) {
        // Build sorted list of upcoming active slots
        const activeSchedules = schedules.filter(s => s.is_active);
        let closest: { daysAway: number; slot: any } | null = null;

        for (const slot of activeSchedules) {
            let daysAway = slot.day_of_week - currentDay;
            if (daysAway < 0) daysAway += 7;
            // If same day but time already passed, push to next week
            if (daysAway === 0 && slot.start_time?.slice(0, 5) <= currentTime) {
                daysAway = 7;
            }
            if (!closest || daysAway < closest.daysAway) {
                closest = { daysAway, slot };
            }
        }

        if (closest) {
            const dayName = DAYS[closest.slot.day_of_week];
            const time = closest.slot.start_time?.slice(0, 5);
            if (closest.daysAway === 0) {
                nextShiftLabel = `Today ${time}`;
            } else if (closest.daysAway === 1) {
                nextShiftLabel = `Tomorrow ${time}`;
            } else {
                nextShiftLabel = `${dayName.slice(0, 3)} ${time}`;
            }
        }
    }

    return (
        <>
            <Header title="My Schedule" subtitle="View your shift schedule and availability" />

            <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-4 md:space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <StatCard icon={CalendarDays} value={schedules.length} label="Total Slots" />
                    <StatCard icon={CheckCircle} value={activeSlots} label="Active Slots" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Clock} value={nextShiftLabel} label="Next Shift" iconColor="text-info" iconBg="bg-info-faded" />
                </div>

                {/* Schedule Table */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-text-primary">Schedule Overview</h2>
                            <p className="text-xs md:text-sm text-text-muted mt-0.5">
                                {schedules.length} slots • Contact admin to modify
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-text-muted">
                            <CalendarDays className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">No schedule slots assigned</p>
                            <p className="text-xs mt-1">Contact admin to set up your schedule</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {schedules.map((slot: any) => (
                                    <div key={slot.id} className="bg-bg-card border border-border rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-accent font-semibold text-sm">{DAYS[slot.day_of_week]}</span>
                                            <span data-small-touch>
                                                <StatusBadge
                                                    label={slot.is_active ? 'Active' : 'Inactive'}
                                                    variant={slot.is_active ? 'success' : 'neutral'}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-text-primary">
                                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                                            {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                                        </div>
                                        <p className="text-xs text-gold font-semibold mt-1">{slot.daily_limit} cases/day</p>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-l-xl">Day</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Shift</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated">Daily Limit</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated rounded-r-xl">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedules.map((slot: any) => (
                                            <tr key={slot.id} className="group">
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-l-xl">
                                                    <span className="text-accent font-semibold">{DAYS[slot.day_of_week]}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                                                        <span className="text-text-primary">
                                                            {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors">
                                                    <span className="text-gold font-semibold">{slot.daily_limit}/day</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm bg-bg-card group-hover:bg-bg-elevated transition-colors rounded-r-xl">
                                                    <StatusBadge
                                                        label={slot.is_active ? 'Active' : 'Inactive'}
                                                        variant={slot.is_active ? 'success' : 'neutral'}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Weekly View */}
                <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Weekly Overview</h3>
                    <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                        {DAYS.map((day, index) => {
                            const daySlots = schedules.filter(s => s.day_of_week === index);
                            const hasActive = daySlots.some(s => s.is_active);
                            return (
                                <div
                                    key={day}
                                    className={`rounded-xl p-4 text-center border transition-all ${hasActive
                                        ? 'bg-accent-faded border-accent/30'
                                        : daySlots.length > 0
                                            ? 'bg-bg-elevated border-border'
                                            : 'bg-bg-card border-border/50 opacity-50'
                                        }`}
                                >
                                    <p className="text-xs font-semibold text-text-muted mb-2">{day.slice(0, 3)}</p>
                                    {daySlots.length > 0 ? (
                                        <div className="space-y-1">
                                            {daySlots.map(s => (
                                                <p key={s.id} className="text-xs text-text-primary font-mono">
                                                    {s.start_time?.slice(0, 5)}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted">Off</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
