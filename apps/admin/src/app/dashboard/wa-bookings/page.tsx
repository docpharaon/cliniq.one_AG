import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    CalendarCheck, Clock, MapPin, Phone, Users, Search,
    Plus, Trash2, Loader2, RefreshCw, ChevronDown,
    Building2, Calendar, AlertTriangle, CheckCircle2,
    XCircle, UserX, Eye,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchWaBookings,
    fetchWaBookingStats,
    doUpdateWaBookingStatus,
    fetchDoctorLocations,
    doCreateDoctorLocation,
    doUpdateDoctorLocation,
    doDeleteDoctorLocation,
    doUpsertLocationHours,
    fetchLocationOverrides,
    doCreateLocationOverride,
    doDeleteLocationOverride,
    fetchDoctors,
} from '@/lib/actions';

// ── Constants ────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const BOOKING_MODE_LABELS: Record<string, { label: string; color: string }> = {
    direct: { label: 'Direct Book', color: '#10b981' },
    call_center: { label: 'Call Center', color: '#f59e0b' },
    disabled: { label: 'Disabled', color: '#6b7280' },
};

const TABS = ['Bookings', 'Schedules', 'Overrides'] as const;
type Tab = typeof TABS[number];

export default function WaBookingsPage() {
    const [tab, setTab] = useState<Tab>('Bookings');
    const [loading, setLoading] = useState(true);

    // ── Bookings Tab State ──
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0, noShows: 0, cancelled: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // ── Schedules Tab State ──
    const [locations, setLocations] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [editingLocation, setEditingLocation] = useState<any>(null);
    const [editHours, setEditHours] = useState<any[]>([]);

    // ── Overrides Tab State ──
    const [overrides, setOverrides] = useState<any[]>([]);
    const [selectedLocationForOverride, setSelectedLocationForOverride] = useState('');
    const [showAddOverride, setShowAddOverride] = useState(false);

    // ── Add Location Form ──
    const [newLoc, setNewLoc] = useState({
        doctor_id: '', name: '', name_ar: '', address: '', address_ar: '',
        city: 'Riyadh', country: 'SA', booking_mode: 'call_center',
        call_center_phone: '', call_center_label: '', call_center_label_ar: '',
        slot_duration_minutes: 30, max_bookings_per_slot: 1,
        advance_booking_days: 14, cancellation_hours: 24,
    });

    // ── Override Form ──
    const [newOverride, setNewOverride] = useState({
        location_id: '', override_date: '', override_type: 'blocked',
        start_time: '', end_time: '', reason: '', reason_ar: '',
    });

    // ── Load Data ──
    const loadBookings = useCallback(async () => {
        setLoading(true);
        try {
            const [b, s] = await Promise.all([
                fetchWaBookings(statusFilter ? { status: statusFilter } : undefined),
                fetchWaBookingStats(),
            ]);
            setBookings(b);
            setStats(s);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [statusFilter]);

    const loadLocations = useCallback(async () => {
        setLoading(true);
        try {
            const [locs, docs] = await Promise.all([
                fetchDoctorLocations(),
                fetchDoctors(1, 200),
            ]);
            setLocations(locs);
            if (Array.isArray(docs)) setDoctors(docs);
            else if (docs?.doctors) setDoctors(docs.doctors);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    const loadOverrides = useCallback(async (locId: string) => {
        if (!locId) return;
        try {
            const data = await fetchLocationOverrides(locId);
            setOverrides(data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        if (tab === 'Bookings') loadBookings();
        else if (tab === 'Schedules') loadLocations();
    }, [tab, loadBookings, loadLocations]);

    // ── Booking Actions ──
    const handleBookingAction = async (id: string, status: string) => {
        if (!confirm(`Mark this booking as "${status}"?`)) return;
        await doUpdateWaBookingStatus(id, status);
        loadBookings();
    };

    // ── Location CRUD ──
    const handleCreateLocation = async () => {
        if (!newLoc.doctor_id || !newLoc.name) return alert('Doctor and name are required');
        await doCreateDoctorLocation(newLoc as Record<string, unknown>);
        setShowAddLocation(false);
        setNewLoc({ doctor_id: '', name: '', name_ar: '', address: '', address_ar: '', city: 'Riyadh', country: 'SA', booking_mode: 'call_center', call_center_phone: '', call_center_label: '', call_center_label_ar: '', slot_duration_minutes: 30, max_bookings_per_slot: 1, advance_booking_days: 14, cancellation_hours: 24 });
        loadLocations();
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm('Delete this location? All associated bookings and hours will be removed.')) return;
        await doDeleteDoctorLocation(id);
        loadLocations();
    };

    const handleSaveHours = async (locationId: string) => {
        await doUpsertLocationHours(locationId, editHours);
        setEditingLocation(null);
        loadLocations();
    };

    const handleToggleBookingMode = async (loc: any, mode: string) => {
        await doUpdateDoctorLocation(loc.id, { booking_mode: mode });
        loadLocations();
    };

    // ── Override CRUD ──
    const handleCreateOverride = async () => {
        if (!newOverride.location_id || !newOverride.override_date) return alert('Location and date are required');
        await doCreateLocationOverride(newOverride as Record<string, unknown>);
        setShowAddOverride(false);
        loadOverrides(newOverride.location_id);
    };

    const handleDeleteOverride = async (id: string, locId: string) => {
        if (!confirm('Remove this override?')) return;
        await doDeleteLocationOverride(id);
        loadOverrides(locId);
    };

    // ── Filtered bookings ──
    const filteredBookings = bookings.filter(b => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
            b.patient_name?.toLowerCase().includes(s) ||
            b.patient_phone?.includes(s) ||
            b.doctors?.display_name?.toLowerCase().includes(s)
        );
    });

    const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const fmtTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const ap = h >= 12 ? 'PM' : 'AM';
        return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ap}`;
    };

    return (
        <div>
            <Header
                title="WA Bookings"
                subtitle="Patient booking management, doctor schedules, and overrides"
                icon={CalendarCheck}
            />

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <StatCard label="Total Bookings" value={stats.total} icon={CalendarCheck} />
                <StatCard label="Today" value={stats.today} icon={Clock} color="#10b981" />
                <StatCard label="This Week" value={stats.thisWeek} icon={Calendar} color="#6366f1" />
                <StatCard label="No-Shows" value={stats.noShows} icon={UserX} color="#ef4444" />
                <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} color="#f59e0b" />
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-6 bg-[var(--card-bg)] rounded-xl p-1 w-fit">
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === t
                                ? 'bg-[var(--accent-color)] text-white shadow-md'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* ═══ TAB: BOOKINGS ═══ */}
            {tab === 'Bookings' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search patient or doctor..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="no_show">No-Show</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button onClick={loadBookings} className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition text-sm">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" /></div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">No bookings found</div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
                                        <th className="text-left px-4 py-3 font-medium">Patient</th>
                                        <th className="text-left px-4 py-3 font-medium">Doctor</th>
                                        <th className="text-left px-4 py-3 font-medium">Location</th>
                                        <th className="text-left px-4 py-3 font-medium">Date / Time</th>
                                        <th className="text-left px-4 py-3 font-medium">Source</th>
                                        <th className="text-left px-4 py-3 font-medium">Status</th>
                                        <th className="text-left px-4 py-3 font-medium">Reminders</th>
                                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map(b => (
                                        <tr key={b.id} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{b.patient_name}</div>
                                                <div className="text-xs text-[var(--text-muted)]">{b.patient_phone || '—'}</div>
                                            </td>
                                            <td className="px-4 py-3">{b.doctors?.display_name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: b.doctor_locations?.color || '#6b7280' }} />
                                                    <span>{b.doctor_locations?.name || '—'}</span>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">{b.doctor_locations?.city || ''}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>{fmtDate(b.booking_date)}</div>
                                                <div className="text-xs text-[var(--text-muted)]">{fmtTime(b.booking_time)}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={b.booking_source?.replace('wa_', '') || 'intake'} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={b.status} />
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <span title="Confirmation">{b.confirmation_sent ? '✅' : '⏳'}</span>{' '}
                                                <span title="24h Reminder">{b.reminder_24h_sent ? '✅' : '⏳'}</span>{' '}
                                                <span title="2h Reminder">{b.reminder_2h_sent ? '✅' : '⏳'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {b.status === 'confirmed' && (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => handleBookingAction(b.id, 'completed')}
                                                            className="px-2 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                                                            title="Mark completed"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingAction(b.id, 'no_show')}
                                                            className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                                            title="Mark no-show"
                                                        >
                                                            <UserX className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingAction(b.id, 'cancelled')}
                                                            className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                                                            title="Cancel"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: SCHEDULES ═══ */}
            {tab === 'Schedules' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Doctor Locations & Schedules</h3>
                        <button
                            onClick={() => setShowAddLocation(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white text-sm hover:opacity-90 transition"
                        >
                            <Plus className="w-4 h-4" /> Add Location
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" /></div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">No locations configured. Add a doctor's hospital or clinic.</div>
                    ) : (
                        <div className="grid gap-4">
                            {locations.map((loc: any) => (
                                <div key={loc.id} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-3 h-3 rounded-full mt-1.5" style={{ background: loc.color || '#4F46E5' }} />
                                            <div>
                                                <h4 className="font-semibold text-base">{loc.name}</h4>
                                                {loc.name_ar && <div className="text-sm text-[var(--text-muted)]" dir="rtl">{loc.name_ar}</div>}
                                                <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {loc.address || loc.city || '—'} • {loc.country}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                                    <span className="font-medium">Doctor:</span> {loc.doctors?.display_name || '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={loc.booking_mode}
                                                onChange={e => handleToggleBookingMode(loc, e.target.value)}
                                                className="text-xs px-2 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)]"
                                            >
                                                <option value="direct">🟢 Direct Booking</option>
                                                <option value="call_center">🟡 Call Center</option>
                                                <option value="disabled">⚫ Disabled</option>
                                            </select>
                                            <button
                                                onClick={() => handleDeleteLocation(loc.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Call center info */}
                                    {loc.booking_mode === 'call_center' && loc.call_center_phone && (
                                        <div className="flex items-center gap-2 text-sm bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                                            <Phone className="w-4 h-4 text-amber-400" />
                                            <span>{loc.call_center_phone}</span>
                                            {loc.call_center_label && <span className="text-[var(--text-muted)]">({loc.call_center_label})</span>}
                                        </div>
                                    )}

                                    {/* Schedule config */}
                                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
                                        <span>⏱ {loc.slot_duration_minutes}min slots</span>
                                        <span>📅 {loc.advance_booking_days}d ahead</span>
                                        <span>❌ Cancel {loc.cancellation_hours}h before</span>
                                    </div>

                                    {/* Weekly hours */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {loc.doctor_location_hours?.length > 0 ? (
                                            loc.doctor_location_hours
                                                .filter((h: any) => h.is_active)
                                                .sort((a: any, b: any) => a.day_of_week - b.day_of_week)
                                                .map((h: any) => (
                                                    <span key={h.id} className="px-2 py-1 rounded-md text-xs bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                                                        {DAY_NAMES[h.day_of_week]} {h.start_time?.slice(0,5)}–{h.end_time?.slice(0,5)}
                                                    </span>
                                                ))
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)] italic">No hours set</span>
                                        )}
                                    </div>

                                    {/* Edit hours button */}
                                    <button
                                        onClick={() => {
                                            setEditingLocation(loc);
                                            setEditHours(
                                                loc.doctor_location_hours?.map((h: any) => ({
                                                    day_of_week: h.day_of_week,
                                                    start_time: h.start_time,
                                                    end_time: h.end_time,
                                                    is_active: h.is_active,
                                                })) || []
                                            );
                                        }}
                                        className="text-xs text-[var(--accent-color)] hover:underline"
                                    >
                                        ✏️ Edit Weekly Hours
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: OVERRIDES ═══ */}
            {tab === 'Overrides' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Date Overrides (Holidays, Off-days)</h3>
                        <button
                            onClick={() => setShowAddOverride(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white text-sm hover:opacity-90 transition"
                        >
                            <Plus className="w-4 h-4" /> Add Override
                        </button>
                    </div>

                    {/* Location selector */}
                    <select
                        value={selectedLocationForOverride}
                        onChange={e => {
                            setSelectedLocationForOverride(e.target.value);
                            if (e.target.value) loadOverrides(e.target.value);
                        }}
                        className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm w-full max-w-md"
                    >
                        <option value="">Select a location...</option>
                        {locations.map((loc: any) => (
                            <option key={loc.id} value={loc.id}>{loc.doctors?.display_name} — {loc.name}</option>
                        ))}
                    </select>

                    {selectedLocationForOverride && overrides.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-muted)]">No upcoming overrides for this location.</div>
                    )}

                    {overrides.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
                                        <th className="text-left px-4 py-3 font-medium">Date</th>
                                        <th className="text-left px-4 py-3 font-medium">Type</th>
                                        <th className="text-left px-4 py-3 font-medium">Hours</th>
                                        <th className="text-left px-4 py-3 font-medium">Reason</th>
                                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overrides.map((ov: any) => (
                                        <tr key={ov.id} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition">
                                            <td className="px-4 py-3">{fmtDate(ov.override_date)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={ov.override_type === 'blocked' ? 'cancelled' : 'active'} />
                                            </td>
                                            <td className="px-4 py-3">
                                                {ov.override_type === 'custom_hours'
                                                    ? `${ov.start_time?.slice(0,5)} – ${ov.end_time?.slice(0,5)}`
                                                    : '— Blocked —'
                                                }
                                            </td>
                                            <td className="px-4 py-3">{ov.reason || ov.reason_ar || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteOverride(ov.id, selectedLocationForOverride)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ MODAL: Add Location ═══ */}
            {showAddLocation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddLocation(false)}>
                    <div className="bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[var(--border-color)] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5" /> Add Doctor Location</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Doctor *</label>
                                <select value={newLoc.doctor_id} onChange={e => setNewLoc({ ...newLoc, doctor_id: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm">
                                    <option value="">Select doctor...</option>
                                    {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.display_name} — {d.specialty}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Name (EN) *</label>
                                    <input value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="King Fahad Medical City" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Name (AR)</label>
                                    <input value={newLoc.name_ar} onChange={e => setNewLoc({ ...newLoc, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" dir="rtl" placeholder="مدينة الملك فهد الطبية" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Address (EN)</label>
                                    <input value={newLoc.address} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="Exit 15, Riyadh" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">City</label>
                                    <input value={newLoc.city} onChange={e => setNewLoc({ ...newLoc, city: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="Riyadh" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Country</label>
                                    <select value={newLoc.country} onChange={e => setNewLoc({ ...newLoc, country: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm">
                                        <option value="SA">🇸🇦 Saudi Arabia</option>
                                        <option value="AE">🇦🇪 UAE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Booking Mode</label>
                                    <select value={newLoc.booking_mode} onChange={e => setNewLoc({ ...newLoc, booking_mode: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm">
                                        <option value="direct">🟢 Direct Booking</option>
                                        <option value="call_center">🟡 Call Center</option>
                                        <option value="disabled">⚫ Disabled</option>
                                    </select>
                                </div>
                            </div>
                            {newLoc.booking_mode === 'call_center' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Call Center Phone</label>
                                        <input value={newLoc.call_center_phone} onChange={e => setNewLoc({ ...newLoc, call_center_phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="+966 11 288 9999" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Label</label>
                                        <input value={newLoc.call_center_label} onChange={e => setNewLoc({ ...newLoc, call_center_label: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="Dr's Secretary" />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Slot (min)</label>
                                    <input type="number" value={newLoc.slot_duration_minutes} onChange={e => setNewLoc({ ...newLoc, slot_duration_minutes: +e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Advance (days)</label>
                                    <input type="number" value={newLoc.advance_booking_days} onChange={e => setNewLoc({ ...newLoc, advance_booking_days: +e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Cancel (hrs)</label>
                                    <input type="number" value={newLoc.cancellation_hours} onChange={e => setNewLoc({ ...newLoc, cancellation_hours: +e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5">
                            <button onClick={() => setShowAddLocation(false)} className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm">Cancel</button>
                            <button onClick={handleCreateLocation} className="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white text-sm">Create Location</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Edit Hours ═══ */}
            {editingLocation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingLocation(null)}>
                    <div className="bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">📅 Weekly Hours — {editingLocation.name}</h3>
                        <div className="space-y-2">
                            {DAY_NAMES.map((day, i) => {
                                const existing = editHours.find((h: any) => h.day_of_week === i);
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 w-16">
                                            <input
                                                type="checkbox"
                                                checked={!!existing?.is_active}
                                                onChange={e => {
                                                    if (e.target.checked && !existing) {
                                                        setEditHours([...editHours, { day_of_week: i, start_time: '09:00', end_time: '13:00', is_active: true }]);
                                                    } else if (existing) {
                                                        setEditHours(editHours.map((h: any) => h.day_of_week === i ? { ...h, is_active: e.target.checked } : h));
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium">{day}</span>
                                        </label>
                                        {existing?.is_active && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={existing.start_time}
                                                    onChange={e => setEditHours(editHours.map((h: any) => h.day_of_week === i ? { ...h, start_time: e.target.value } : h))}
                                                    className="px-2 py-1 rounded border border-[var(--border-color)] text-sm"
                                                />
                                                <span className="text-[var(--text-muted)]">→</span>
                                                <input
                                                    type="time"
                                                    value={existing.end_time}
                                                    onChange={e => setEditHours(editHours.map((h: any) => h.day_of_week === i ? { ...h, end_time: e.target.value } : h))}
                                                    className="px-2 py-1 rounded border border-[var(--border-color)] text-sm"
                                                />
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-3 mt-5">
                            <button onClick={() => setEditingLocation(null)} className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm">Cancel</button>
                            <button onClick={() => handleSaveHours(editingLocation.id)} className="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white text-sm">Save Hours</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Add Override ═══ */}
            {showAddOverride && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddOverride(false)}>
                    <div className="bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Add Override</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Location *</label>
                                <select value={newOverride.location_id} onChange={e => setNewOverride({ ...newOverride, location_id: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm">
                                    <option value="">Select location...</option>
                                    {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.doctors?.display_name} — {loc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Date *</label>
                                <input type="date" value={newOverride.override_date} onChange={e => setNewOverride({ ...newOverride, override_date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Type</label>
                                <select value={newOverride.override_type} onChange={e => setNewOverride({ ...newOverride, override_type: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm">
                                    <option value="blocked">🚫 Blocked (Day Off)</option>
                                    <option value="custom_hours">🕐 Custom Hours</option>
                                </select>
                            </div>
                            {newOverride.override_type === 'custom_hours' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Start</label>
                                        <input type="time" value={newOverride.start_time} onChange={e => setNewOverride({ ...newOverride, start_time: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">End</label>
                                        <input type="time" value={newOverride.end_time} onChange={e => setNewOverride({ ...newOverride, end_time: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium mb-1">Reason</label>
                                <input value={newOverride.reason} onChange={e => setNewOverride({ ...newOverride, reason: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm" placeholder="National Day, Conference..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5">
                            <button onClick={() => setShowAddOverride(false)} className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm">Cancel</button>
                            <button onClick={handleCreateOverride} className="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white text-sm">Create Override</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
