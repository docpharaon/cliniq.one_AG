'use client';

import Header from '@/components/Header';
import {
    User, Mail, Phone, Building2, Award,
    Shield, Calendar, MapPin, Loader2, Save,
    Edit, X, Check,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [doctor, setDoctor] = useState<any>(null);

    // Editable fields
    const [fullName, setFullName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [dailyLimit, setDailyLimit] = useState(20);
    const [isAccepting, setIsAccepting] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const supabase = createBrowserSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('doctors')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setDoctor(data);
                    setFullName(data.full_name || '');
                    setDisplayName(data.display_name || '');
                    setPhone(data.phone || '');
                    setDailyLimit(data.daily_limit || 20);
                    setIsAccepting(data.is_accepting ?? true);
                }
            } catch (err) {
                console.error('Load profile error:', err);
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    async function handleSave() {
        if (!doctor) return;
        setSaving(true);
        try {
            const supabase = createBrowserSupabase();
            const { error } = await supabase
                .from('doctors')
                .update({
                    full_name: fullName,
                    display_name: displayName,
                    phone,
                    daily_limit: dailyLimit,
                    is_accepting: isAccepting,
                })
                .eq('id', doctor.id);

            if (error) {
                alert(`Save failed: ${error.message}`);
            } else {
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save profile. Please try again.');
        }
        setSaving(false);
    }

    async function toggleAccepting() {
        if (!doctor) return;
        const newVal = !isAccepting;
        setIsAccepting(newVal);
        try {
            const supabase = createBrowserSupabase();
            await supabase
                .from('doctors')
                .update({ is_accepting: newVal })
                .eq('id', doctor.id);
        } catch (err) {
            console.error('Toggle error:', err);
            setIsAccepting(!newVal);
        }
    }

    if (loading) {
        return (
            <>
                <Header title="Profile" subtitle="Your professional profile" />
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Profile" subtitle="Manage your professional information" />

            <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-4 md:space-y-6">
                {/* Profile Card */}
                <div className="glass rounded-2xl p-4 md:p-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-2xl md:text-3xl font-bold text-white">
                                {(displayName || fullName)?.charAt(0) || 'D'}
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-text-primary">{displayName || fullName || 'Doctor'}</h2>
                                {fullName && displayName && fullName !== displayName && (
                                    <p className="text-sm text-text-secondary">{fullName}</p>
                                )}
                                <p className="text-sm text-text-muted capitalize">{doctor?.specialty?.replace('_', ' ') || '—'}</p>
                                <p className="text-xs text-text-muted mt-1">ID: {doctor?.id?.slice(0, 8)}…</p>
                            </div>
                        </div>
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isEditing
                                ? 'bg-accent text-bg-primary hover:shadow-[0_4px_12px_rgba(45,212,191,0.3)]'
                                : 'border border-border text-accent hover:bg-accent-faded'
                                }`}
                        >
                            {isEditing ? (
                                saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />
                            ) : (
                                <Edit className="w-4 h-4" />
                            )}
                            {isEditing ? (saving ? 'Saving…' : 'Save') : 'Edit'}
                        </button>
                    </div>

                    {/* Accepting Toggle */}
                    <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-bg-elevated border border-border mb-6">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-accent" />
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Accepting Consultations</p>
                                <p className="text-xs text-text-muted">Toggle to control incoming cases</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleAccepting}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isAccepting ? 'bg-accent' : 'bg-bg-tertiary'}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${isAccepting ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Profile Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <ProfileField
                            icon={User}
                            label="Full Name"
                            value={fullName}
                            onChange={setFullName}
                            editable={isEditing}
                        />
                        <ProfileField
                            icon={User}
                            label="Display Name"
                            value={displayName}
                            onChange={setDisplayName}
                            editable={isEditing}
                        />
                        <ProfileField
                            icon={Mail}
                            label="Email"
                            value={doctor?.email || '—'}
                            editable={false}
                        />
                        <ProfileField
                            icon={Phone}
                            label="Phone"
                            value={phone}
                            onChange={setPhone}
                            editable={isEditing}
                        />
                        <ProfileField
                            icon={Building2}
                            label="Specialty"
                            value={doctor?.specialty?.replace('_', ' ') || '—'}
                            editable={false}
                        />
                        <ProfileField
                            icon={Award}
                            label="License"
                            value={doctor?.license_number || '—'}
                            editable={false}
                        />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-text-muted" />
                                <label className="text-xs text-text-muted uppercase tracking-wider font-semibold">Daily Limit</label>
                            </div>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={dailyLimit}
                                    onChange={e => setDailyLimit(parseInt(e.target.value) || 0)}
                                    min={1}
                                    max={100}
                                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                                />
                            ) : (
                                <p className="px-4 py-3 bg-bg-elevated rounded-xl text-text-primary text-sm border border-transparent">{dailyLimit} cases/day</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function ProfileField({
    icon: Icon,
    label,
    value,
    onChange,
    editable,
}: {
    icon: any;
    label: string;
    value: string;
    onChange?: (val: string) => void;
    editable: boolean;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-text-muted" />
                <label className="text-xs text-text-muted uppercase tracking-wider font-semibold">{label}</label>
            </div>
            {editable && onChange ? (
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                />
            ) : (
                <p className="px-4 py-3 bg-bg-elevated rounded-xl text-text-primary text-sm capitalize border border-transparent">{value}</p>
            )}
        </div>
    );
}
