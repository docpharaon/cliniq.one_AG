'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

const SUPABASE_URL = 'https://uabbndansgxpvogteyxc.supabase.co';

export default function TesterSignup() {
    const { t } = useI18n();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const data = new FormData(e.currentTarget);
        const payload = {
            name: data.get('name') as string,
            email: data.get('email') as string,
            role: data.get('role') as string,
            message: data.get('message') as string || '',
        };

        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/register-tester`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Request failed (${res.status})`);
            }

            setSubmitted(true);
        } catch (err) {
            console.error('Tester signup error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="tester-signup" className="py-24 sm:py-32">
            <div className="max-w-3xl mx-auto px-6">
                <div className="reveal glass-strong rounded-3xl p-8 sm:p-12 glow-teal-strong">
                    {!submitted ? (
                        <>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent-faded text-accent mb-4">{t('signup.tag')}</span>
                                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                                    {t('signup.h2_1')} <span className="gradient-text">{t('signup.h2_2')}</span>
                                </h2>
                                <p className="text-text-secondary">{t('signup.sub')}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">{t('signup.name')}</label>
                                        <input id="name" name="name" type="text" required placeholder={t('signup.name_ph')} className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent focus:outline-none text-text-primary placeholder:text-text-muted transition-colors" />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">{t('signup.email')}</label>
                                        <input id="email" name="email" type="email" required placeholder={t('signup.email_ph')} className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent focus:outline-none text-text-primary placeholder:text-text-muted transition-colors" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-2">{t('signup.role')}</label>
                                    <select id="role" name="role" required className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent focus:outline-none text-text-primary transition-colors appearance-none">
                                        <option value="">{t('signup.role_default')}</option>
                                        <option value="Patient">{t('signup.role_patient')}</option>
                                        <option value="Doctor">{t('signup.role_doctor')}</option>
                                        <option value="Both">{t('signup.role_both')}</option>
                                        <option value="Investor">{t('signup.role_investor')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-text-secondary mb-2">{t('signup.message')} <span className="text-text-muted">{t('signup.optional')}</span></label>
                                    <textarea id="message" name="message" rows={3} placeholder={t('signup.message_ph')} className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border focus:border-accent focus:outline-none text-text-primary placeholder:text-text-muted transition-colors resize-none" />
                                </div>

                                {error && (
                                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-accent hover:bg-accent-dark text-bg-primary font-bold rounded-xl text-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {loading ? '⏳ Sending...' : t('signup.submit')}
                                </button>

                                <p className="text-center text-text-muted text-xs">{t('signup.note')}</p>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-6xl mb-6">🎉</div>
                            <h3 className="text-2xl font-bold mb-3">{t('signup.thanks')}</h3>
                            <p className="text-text-secondary mb-6">
                                {t('signup.thanks_msg')}{' '}
                                <a href="mailto:admin@cliniq.one" className="text-accent hover:underline">admin@cliniq.one</a>
                            </p>
                            <button onClick={() => setSubmitted(false)} className="px-6 py-3 border border-accent/30 hover:border-accent text-accent rounded-full text-sm font-medium transition-all">
                                {t('signup.another')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
