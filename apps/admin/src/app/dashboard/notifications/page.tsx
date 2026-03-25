'use client';

import Header from '@/components/Header';
import { Bell, Send, Users, Stethoscope, Search, X, CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import {
    doBroadcastToAllPatients,
    doBroadcastToAllDoctors,
    doSendNotificationToUsers,
    doSearchUsersForNotification,
} from '@/lib/actions';

type Recipient = { id: string; nickname: string; email: string; role: string; avatar_url: string | null };

type Target = 'all_patients' | 'all_doctors' | 'specific';

const TARGET_OPTIONS: { value: Target; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
    { value: 'all_patients', label: 'All Patients', desc: 'Send to all active patients', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { value: 'all_doctors', label: 'All Doctors', desc: 'Send to all active doctors', icon: Stethoscope, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { value: 'specific', label: 'Specific Users', desc: 'Search and pick recipients', icon: User, color: 'text-amber-400', bg: 'bg-amber-500/15' },
];

export default function NotificationsPage() {
    const [target, setTarget] = useState<Target>('all_patients');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Specific user search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Recipient[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Recipient[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sent history for this session
    const [sentHistory, setSentHistory] = useState<{ target: string; title: string; sent: number; time: string }[]>([]);

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, message: msg });
        setTimeout(() => setToast(null), 5000);
    }, []);

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (q.length < 2) { setSearchResults([]); setShowDropdown(false); return; }

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            const results = await doSearchUsersForNotification(q);
            setSearchResults(results as Recipient[]);
            setShowDropdown(true);
            setSearching(false);
        }, 300);
    };

    const addUser = (user: Recipient) => {
        if (!selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchQuery('');
        setShowDropdown(false);
    };

    const removeUser = (id: string) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== id));
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            showToast('error', 'Title and message are required');
            return;
        }

        if (target === 'specific' && selectedUsers.length === 0) {
            showToast('error', 'Select at least one recipient');
            return;
        }

        setSending(true);
        let result: { sent: number; error: string | null };

        try {
            if (target === 'all_patients') {
                result = await doBroadcastToAllPatients(title.trim(), message.trim());
            } else if (target === 'all_doctors') {
                result = await doBroadcastToAllDoctors(title.trim(), message.trim());
            } else {
                // Group by role and send
                const patients = selectedUsers.filter(u => u.role === 'patient');
                const doctors = selectedUsers.filter(u => u.role === 'doctor');
                let totalSent = 0;

                if (patients.length > 0) {
                    const r = await doSendNotificationToUsers(patients.map(u => u.id), title.trim(), message.trim(), 'patient');
                    totalSent += r.sent;
                }
                if (doctors.length > 0) {
                    const r = await doSendNotificationToUsers(doctors.map(u => u.id), title.trim(), message.trim(), 'doctor');
                    totalSent += r.sent;
                }
                result = { sent: totalSent, error: null };
            }

            if (result.error) {
                showToast('error', result.error);
            } else {
                showToast('success', `Notification sent to ${result.sent} recipient${result.sent !== 1 ? 's' : ''}`);
                setSentHistory(prev => [{
                    target: target === 'specific' ? `${selectedUsers.length} users` : target.replace('all_', 'All '),
                    title: title.trim(),
                    sent: result.sent,
                    time: new Date().toLocaleTimeString(),
                }, ...prev]);
                setTitle('');
                setMessage('');
                if (target === 'specific') setSelectedUsers([]);
            }
        } catch {
            showToast('error', 'Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <Header title="Send Notification" subtitle="Broadcast messages to patients and doctors" />
            <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-6">

                {/* Target Selection */}
                <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Recipients</h3>
                            <p className="text-xs text-text-muted">Choose who receives this notification</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {TARGET_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const active = target === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => setTarget(opt.value)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                                        active
                                            ? 'border-accent bg-accent/[0.08] ring-2 ring-accent/30'
                                            : 'border-border bg-bg-elevated hover:border-border/80'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${opt.bg}`}>
                                        <Icon className={`w-5 h-5 ${opt.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${active ? 'text-accent' : 'text-text-primary'}`}>{opt.label}</p>
                                        <p className="text-[11px] text-text-muted">{opt.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Specific user search */}
                    {target === 'specific' && (
                        <div className="mt-5">
                            <div className="relative" ref={dropdownRef}>
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    placeholder="Search by name or email..."
                                    className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                                />
                                {searching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                                )}

                                {/* Search dropdown */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-border bg-bg-primary shadow-2xl z-30 max-h-[200px] overflow-y-auto">
                                        {searchResults.map(user => {
                                            const alreadySelected = selectedUsers.some(u => u.id === user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    onClick={() => !alreadySelected && addUser(user)}
                                                    disabled={alreadySelected}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/[0.05] transition-colors ${
                                                        alreadySelected ? 'opacity-40' : ''
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-accent-faded flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                                                        {user.nickname?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-text-primary truncate">{user.nickname}</p>
                                                        <p className="text-[11px] text-text-muted truncate">{user.email} · {user.role}</p>
                                                    </div>
                                                    {alreadySelected && <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Selected users chips */}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedUsers.map(user => (
                                        <span
                                            key={user.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-faded text-accent text-xs font-semibold"
                                        >
                                            {user.nickname}
                                            <button onClick={() => removeUser(user.id)} className="hover:text-white transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <span className="text-xs text-text-muted self-center ml-1">
                                        {selectedUsers.length} selected
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Compose */}
                <div className="glass rounded-2xl p-4 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-red-400" />
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                            <Send className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Compose Message</h3>
                            <p className="text-xs text-text-muted">This will appear as an in-app notification</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Title</label>
                            <input
                                id="notification-title"
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Scheduled Maintenance"
                                maxLength={100}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Message</label>
                            <textarea
                                id="notification-message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Write your notification message..."
                                rows={4}
                                maxLength={500}
                                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-none"
                            />
                            <p className="text-[10px] text-text-muted mt-1 text-right">{message.length}/500</p>
                        </div>

                        {/* Preview */}
                        {(title.trim() || message.trim()) && (
                            <div className="bg-bg-elevated rounded-xl border border-border p-4">
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Preview</p>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                        <Bell className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">{title || 'Untitled'}</p>
                                        <p className="text-xs text-text-muted mt-0.5">{message || 'No message'}</p>
                                        <p className="text-[10px] text-text-muted/60 mt-1">just now</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            id="send-notification-btn"
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !message.trim() || (target === 'specific' && selectedUsers.length === 0)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {sending ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </div>

                {/* Sent History (session only) */}
                {sentHistory.length > 0 && (
                    <div className="glass rounded-2xl p-4 md:p-6">
                        <h3 className="text-sm font-bold text-text-primary mb-3">Sent This Session</h3>
                        <div className="space-y-2">
                            {sentHistory.map((entry, i) => (
                                <div key={i} className="flex items-center gap-3 bg-bg-elevated rounded-xl px-4 py-2.5 border border-border">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-primary truncate">{entry.title}</p>
                                        <p className="text-[11px] text-text-muted">→ {entry.target} · {entry.sent} sent · {entry.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl animate-fade-in z-50 ${
                        toast.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 backdrop-blur-xl'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30 backdrop-blur-xl'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}
        </>
    );
}
