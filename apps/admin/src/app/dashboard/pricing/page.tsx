'use client';

import Header from '@/components/Header';
import { DollarSign, Coins, ArrowRightLeft, ShoppingCart, Tag } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { EXCHANGE } from '@cliniqone/config';

// Token packages (could later be loaded from a DB table)
const packages = [
    { tokens: 3, priceSAR: 15, label: 'Starter', popular: false },
    { tokens: 5, priceSAR: 25, label: 'Standard', popular: true },
    { tokens: 10, priceSAR: 45, label: 'Value Pack', popular: false },
    { tokens: 25, priceSAR: 100, label: 'Premium', popular: false },
    { tokens: 50, priceSAR: 180, label: 'Enterprise', popular: false },
];

const consultationCosts = [
    { type: 'Dermatology', tokens: 5, description: 'Skin, hair & nails consultation' },
    { type: 'Family Medicine', tokens: 5, description: 'General health consultation' },
];

export default function PricingPage() {
    return (
        <>
            <Header title="Pricing Management" subtitle="Token packages, consultation costs & exchange rates" />
            <div className="p-8 max-w-[1400px] mx-auto space-y-8">
                {/* Exchange Rates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={ArrowRightLeft} value={`${EXCHANGE.TOKEN_TO_SAR} SAR`} label="1 Token =" iconColor="text-gold" iconBg="bg-gold-faded" />
                    <StatCard icon={DollarSign} value={`$${EXCHANGE.TOKEN_TO_USD}`} label="1 Token = (USD)" iconColor="text-success" iconBg="bg-success-faded" />
                    <StatCard icon={Coins} value={`${EXCHANGE.TOKEN_TO_KWD} KWD`} label="1 Token = (KWD)" iconColor="text-info" iconBg="bg-info-faded" />
                    <StatCard icon={ShoppingCart} value={String(packages.length)} label="Active Packages" iconColor="text-purple" iconBg="bg-purple-faded" />
                </div>

                {/* Token Packages */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-gold-faded rounded-xl flex items-center justify-center">
                            <Tag className="w-5 h-5 text-gold" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">Token Packages</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {packages.map((pkg) => (
                            <div
                                key={pkg.label}
                                className={`relative bg-bg-elevated rounded-2xl p-5 border text-center transition-all hover:-translate-y-1 hover:shadow-lg ${pkg.popular ? 'border-accent shadow-accent/10' : 'border-border'}`}
                            >
                                {pkg.popular && (
                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-bg-primary text-[10px] font-bold uppercase tracking-wider">
                                        Most Popular
                                    </span>
                                )}
                                <p className="text-3xl font-black text-accent">{pkg.tokens}</p>
                                <p className="text-xs text-text-muted mt-1">Tokens</p>
                                <p className="text-xl font-bold text-gold mt-3">{pkg.priceSAR} <span className="text-sm font-normal">SAR</span></p>
                                <p className="text-xs text-text-muted mt-1">{pkg.label}</p>
                                <p className="text-xs text-text-muted mt-2">≈ ${(pkg.priceSAR / 3.75).toFixed(2)} USD</p>
                                <button className="mt-4 w-full py-2 rounded-xl text-xs font-semibold border border-accent text-accent hover:bg-accent hover:text-bg-primary transition-all">
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Consultation Costs */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-info-faded rounded-xl flex items-center justify-center">
                            <img className="w-5 h-5" src="" alt="" />
                            <DollarSign className="w-5 h-5 text-info" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">Consultation Costs</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {consultationCosts.map((cost) => (
                            <div key={cost.type} className="bg-bg-elevated rounded-xl p-5 border border-border flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{cost.type}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{cost.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-gold">{cost.tokens}</p>
                                    <p className="text-xs text-text-muted">Tokens</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
