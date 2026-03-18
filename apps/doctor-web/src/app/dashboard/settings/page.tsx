'use client';

import Header from '@/components/Header';
import {
    Bell, CreditCard, Shield, HelpCircle,
    LogOut, ChevronRight, Loader2,
    Mail, MessageSquare, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function SettingsPage() {
    const [notifications, setNotifications] = useState({
        newConsultation: true,
        urgentCases: true,
        paymentUpdates: true,
        systemAlerts: false,
    });

    const handleLogout = async () => {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <>
            <Header title="Settings" subtitle="Manage your preferences and account" />

            <div className="p-8 max-w-[800px] mx-auto space-y-6">
                {/* Notifications */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent-faded flex items-center justify-center">
                            <Bell className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Notifications</h3>
                            <p className="text-xs text-text-muted">Choose what you get notified about</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <NotifToggle
                            icon={MessageSquare}
                            label="New Consultations"
                            desc="When a new case enters the queue"
                            checked={notifications.newConsultation}
                            onChange={v => setNotifications(p => ({ ...p, newConsultation: v }))}
                        />
                        <NotifToggle
                            icon={AlertTriangle}
                            label="Urgent Cases"
                            desc="High-priority & urgent consultations"
                            checked={notifications.urgentCases}
                            onChange={v => setNotifications(p => ({ ...p, urgentCases: v }))}
                        />
                        <NotifToggle
                            icon={CreditCard}
                            label="Payment Updates"
                            desc="Earnings and payout notifications"
                            checked={notifications.paymentUpdates}
                            onChange={v => setNotifications(p => ({ ...p, paymentUpdates: v }))}
                        />
                        <NotifToggle
                            icon={Shield}
                            label="System Alerts"
                            desc="Platform maintenance and updates"
                            checked={notifications.systemAlerts}
                            onChange={v => setNotifications(p => ({ ...p, systemAlerts: v }))}
                        />
                    </div>
                </div>

                {/* Support */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-info-faded flex items-center justify-center">
                            <HelpCircle className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Support</h3>
                            <p className="text-xs text-text-muted">Get help and resources</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <SettingsLink label="Help Center" icon={HelpCircle} />
                        <SettingsLink label="Contact Support" icon={Mail} />
                        <SettingsLink label="Terms of Service" icon={Shield} />
                        <SettingsLink label="Privacy Policy" icon={Shield} />
                    </div>
                </div>

                {/* App Info */}
                <div className="glass rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">App Version</span>
                        <span className="text-text-secondary font-mono">1.0.0-web</span>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-error/30 bg-error-faded text-error font-semibold hover:bg-error/20 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </>
    );
}

function NotifToggle({
    icon: Icon,
    label,
    desc,
    checked,
    onChange,
}: {
    icon: any;
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated border border-border">
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-text-muted" />
                <div>
                    <p className="text-sm font-medium text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}
            >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );
}

function SettingsLink({ label, icon: Icon }: { label: string; icon: any }) {
    return (
        <button className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border hover:border-accent/30 transition-all">
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-primary">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>
    );
}
