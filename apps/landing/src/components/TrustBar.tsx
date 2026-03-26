'use client';

import { useI18n } from '@/lib/i18n';
import { UserCheck, ShieldCheck, Globe, FileText, Stethoscope } from 'lucide-react';

export default function TrustBar() {
    const { t } = useI18n();

    const badges = [
        { icon: UserCheck, label: 'trust.doctors' },
        { icon: ShieldCheck, label: 'trust.privacy' },
        { icon: Globe, label: 'trust.bilingual' },
        { icon: FileText, label: 'trust.prescription' },
        { icon: Stethoscope, label: 'trust.multispecialty' },
    ];

    return (
        <section className="py-8 bg-bg-secondary border-y border-border">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
                    {badges.map((badge) => {
                        const Icon = badge.icon;
                        return (
                            <div key={badge.label} className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-accent-faded flex items-center justify-center">
                                    <Icon size={18} className="text-accent" />
                                </div>
                                <span className="text-sm font-medium text-text-primary">{t(badge.label)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
