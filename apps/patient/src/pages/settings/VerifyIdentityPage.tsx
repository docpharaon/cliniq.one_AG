import { useState } from 'react';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/ToastProvider';
import { BackButton } from '../../components/BackButton';
import { FadeIn } from '../../components/FadeIn';
import { requestKycToken, safeFetch } from '@cliniqone/api';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Refresh, Lock, FileText, Zap, User } from '@cliniqone/ui';
import type { KycStatus } from '@cliniqone/types';
import type { CliniqIconProps } from '@cliniqone/ui';

type StatusConfig = {
    Icon: React.FC<CliniqIconProps>;
    title: string;
    desc: string;
    color: string;
    bg: string;
    borderColor: string;
};

function getStatusConfig(status: KycStatus): StatusConfig {
    switch (status) {
        case 'approved':
        case 'exempt':
            return {
                Icon: CheckCircle,
                title: t('kyc.statusApproved'),
                desc: t('kyc.statusApprovedDesc'),
                color: '#10B981',
                bg: 'rgba(16,185,129,0.08)',
                borderColor: 'rgba(16,185,129,0.25)',
            };
        case 'pending':
            return {
                Icon: Clock,
                title: t('kyc.statusPending'),
                desc: t('kyc.statusPendingDesc'),
                color: '#F59E0B',
                bg: 'rgba(245,158,11,0.08)',
                borderColor: 'rgba(245,158,11,0.25)',
            };
        case 'rejected':
            return {
                Icon: XCircle,
                title: t('kyc.statusRejected'),
                desc: t('kyc.statusRejectedDesc'),
                color: '#EF4444',
                bg: 'rgba(239,68,68,0.08)',
                borderColor: 'rgba(239,68,68,0.25)',
            };
        case 'resubmission_requested':
            return {
                Icon: AlertTriangle,
                title: t('kyc.statusResubmission'),
                desc: t('kyc.statusResubmissionDesc'),
                color: '#F59E0B',
                bg: 'rgba(245,158,11,0.08)',
                borderColor: 'rgba(245,158,11,0.25)',
            };
        default:
            return {
                Icon: Shield,
                title: t('kyc.statusNotStarted'),
                desc: t('kyc.statusNotStartedDesc'),
                color: '#1A8A9E',
                bg: 'rgba(26,138,158,0.06)',
                borderColor: 'rgba(26,138,158,0.15)',
            };
    }
}

export default function VerifyIdentityPage() {
    const { user, refreshUser } = useAuthStore();
    const toast = useToast(s => s.show);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const kycStatus: KycStatus = (user?.kyc_status as KycStatus) || 'not_started';
    const config = getStatusConfig(kycStatus);
    const canStartVerification = kycStatus === 'not_started' || kycStatus === 'rejected' || kycStatus === 'resubmission_requested';
    const isVerified = kycStatus === 'approved' || kycStatus === 'exempt';

    async function handleStartVerification() {
        setLoading(true);
        try {
            const result = await safeFetch(
                () => requestKycToken(),
                { timeout: 10000, retries: 1, label: 'requestKycToken' },
            );

            if ('status' in result && result.status === 'already_verified') {
                toast(t('kyc.alreadyVerified'), 'info');
                await refreshUser?.();
                return;
            }

            if ('token' in result) {
                // In production, launch Sumsub SDK with the token:
                // SNSMobileSDK.init(result.token, () => requestKycToken())
                //   .withHandlers({ ... })
                //   .build()
                //   .launch();
                toast(t('kyc.sdkReady'), 'success');
            }
        } catch (err) {
            console.error('KYC token error:', err);
            const message = err instanceof Error ? err.message : t('kyc.errorGeneric');
            toast(message, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleRefreshStatus() {
        setRefreshing(true);
        try {
            await refreshUser?.();
            toast(t('kyc.statusRefreshed'), 'info');
        } catch {
            toast(t('kyc.errorGeneric'), 'error');
        } finally {
            setRefreshing(false);
        }
    }

    const benefits: { Icon: React.FC<CliniqIconProps>; text: string }[] = [
        { Icon: FileText, text: t('kyc.benefitPrescriptions') },
        { Icon: Shield, text: t('kyc.benefitReports') },
        { Icon: Lock, text: t('kyc.benefitCompliance') },
        { Icon: Zap, text: t('kyc.benefitQuick') },
    ];

    const requirements: { icon: string; text: string }[] = [
        { icon: '📄', text: t('kyc.requireId') },
        { icon: '📸', text: t('kyc.requireSelfie') },
        { icon: '💡', text: t('kyc.requireLighting') },
    ];

    return (
        <div className="slide-in-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 48px' }}>
                <BackButton />

                <FadeIn>
                    <h1 style={{
                        fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
                        margin: '20px 0 6px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <Shield size={22} color="#1A8A9E" /> {t('kyc.title')}
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: '20px' }}>
                        {t('kyc.subtitle')}
                    </p>
                </FadeIn>

                {/* Status Card */}
                <FadeIn delay={100}>
                    <div style={{
                        backgroundColor: config.bg,
                        borderRadius: 16,
                        padding: 20,
                        border: `1.5px solid ${config.borderColor}`,
                        marginBottom: 20,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 28,
                            background: `${config.color}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 14px',
                        }}>
                            <config.Icon size={28} color={config.color} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: config.color, margin: '0 0 6px' }}>
                            {config.title}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: '20px' }}>
                            {config.desc}
                        </p>

                        {/* Verified date */}
                        {user?.kyc_verified_at && isVerified && (
                            <p style={{
                                fontSize: 12, color: '#10B981', margin: '12px 0 0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}>
                                <CheckCircle size={14} color="#10B981" />
                                {t('kyc.verifiedOn')} {new Date(user.kyc_verified_at).toLocaleDateString()}
                            </p>
                        )}

                        {/* Rejection reason */}
                        {user?.kyc_rejection_reason && kycStatus === 'rejected' && (
                            <div style={{
                                backgroundColor: 'rgba(239,68,68,0.08)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                marginTop: 14,
                                textAlign: 'left',
                            }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', margin: '0 0 2px' }}>
                                    {t('kyc.rejectionReason')}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: '18px' }}>
                                    {user.kyc_rejection_reason}
                                </p>
                            </div>
                        )}
                    </div>
                </FadeIn>

                {/* Why Verify Section */}
                {!isVerified && (
                    <FadeIn delay={150}>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 14,
                            padding: 18,
                            border: '1px solid var(--border)',
                            marginBottom: 16,
                        }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                                {t('kyc.whyVerify')}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {benefits.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            backgroundColor: '#2DD4BF12',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <item.Icon size={16} color="#2DD4BF" />
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: '18px' }}>
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* What You Need */}
                {canStartVerification && (
                    <FadeIn delay={200}>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 14,
                            padding: 18,
                            border: '1px solid var(--border)',
                            marginBottom: 20,
                        }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                                {t('kyc.whatYouNeed')}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {requirements.map((req, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 18, lineHeight: 1 }}>{req.icon}</span>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: '18px' }}>
                                            {req.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Process Steps — visual timeline */}
                {canStartVerification && (
                    <FadeIn delay={250}>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 14,
                            padding: 18,
                            border: '1px solid var(--border)',
                            marginBottom: 24,
                        }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                                {t('kyc.howItWorks')}
                            </p>
                            {[
                                { step: '1', title: t('kyc.processStep1'), desc: t('kyc.processStep1Desc') },
                                { step: '2', title: t('kyc.processStep2'), desc: t('kyc.processStep2Desc') },
                                { step: '3', title: t('kyc.processStep3'), desc: t('kyc.processStep3Desc') },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: 12, marginBottom: i < 2 ? 14 : 0,
                                    position: 'relative',
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 14,
                                            background: 'linear-gradient(135deg, #1A8A9E, #0F766E)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: 12, fontWeight: 800,
                                            flexShrink: 0,
                                        }}>
                                            {item.step}
                                        </div>
                                        {i < 2 && (
                                            <div style={{
                                                width: 2, flex: 1, minHeight: 14,
                                                backgroundColor: 'rgba(26,138,158,0.2)',
                                                marginTop: 4,
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ paddingTop: 2 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                                            {item.title}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, lineHeight: '17px' }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* Action Buttons */}
                <FadeIn delay={300}>
                    {canStartVerification && (
                        <button
                            onClick={handleStartVerification}
                            disabled={loading}
                            className="pressable"
                            style={{
                                width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                                background: 'linear-gradient(135deg, #1A8A9E, #0F766E)',
                                color: '#fff', fontSize: 16, fontWeight: 700,
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'opacity 0.2s',
                            }}>
                            <User size={18} color="#fff" />
                            {loading
                                ? t('kyc.starting')
                                : kycStatus === 'not_started'
                                    ? t('kyc.startVerification')
                                    : t('kyc.retryVerification')
                            }
                        </button>
                    )}

                    {kycStatus === 'pending' && (
                        <button
                            onClick={handleRefreshStatus}
                            disabled={refreshing}
                            className="pressable"
                            style={{
                                width: '100%', padding: '14px', borderRadius: 14,
                                border: '1.5px solid rgba(245,158,11,0.3)',
                                backgroundColor: 'rgba(245,158,11,0.06)',
                                color: '#F59E0B', fontSize: 15, fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                            <Refresh size={16} color="#F59E0B" />
                            {refreshing ? t('kyc.refreshing') : t('kyc.refreshStatus')}
                        </button>
                    )}
                </FadeIn>

                {/* Privacy Notice */}
                <FadeIn delay={350}>
                    <div style={{
                        marginTop: 24,
                        padding: '14px 16px',
                        backgroundColor: 'rgba(26,138,158,0.05)',
                        borderRadius: 12,
                        border: '1px solid rgba(26,138,158,0.1)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Lock size={14} color="#1A8A9E" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: '17px' }}>
                                {t('kyc.privacyNotice')}
                            </p>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </div>
    );
}
