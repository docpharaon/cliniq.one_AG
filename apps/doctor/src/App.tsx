import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { colors, OfflineBanner } from '@cliniqone/ui';

// Pages
import { SplashPage } from './pages/SplashPage';
import { LandingPage } from './pages/auth/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { RegistrationPage } from './pages/auth/RegistrationPage';
import { ApplicationTrackerPage } from './pages/auth/ApplicationTrackerPage';
import { HomePage } from './pages/tabs/HomePage';
import { QueuePage } from './pages/tabs/QueuePage';
import { AnalyticsPage } from './pages/tabs/AnalyticsPage';
import { ProfilePage } from './pages/tabs/ProfilePage';
import { SettingsPage } from './pages/tabs/SettingsPage';
import { ConsultationDetailPage } from './pages/consultation/ConsultationDetailPage';
import { RespondPage } from './pages/consultation/RespondPage';
import { InterventionOrderPage } from './pages/consultation/InterventionOrderPage';

// Components
import { TabBar } from './components/TabBar';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Splash gate ──────────────────────────────────────────────
let splashShown = false;
export function markSplashShown() { splashShown = true; }

// ── Tab layout wrapper ───────────────────────────────────────
function TabLayout() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <Outlet />
            </div>
            <TabBar />
        </div>
    );
}

// ── Auth guard ───────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { session, doctor, isNewRegistration, application } = useAuthStore();

    if (!session) return <Navigate to="/auth/landing" replace />;
    if (isNewRegistration || !doctor) {
        // New OAuth user: check if they have an application
        if (application) {
            return <Navigate to="/auth/application-status" replace />;
        }
        return <Navigate to="/auth/register" replace />;
    }
    if (doctor.status === 'pending') return <Navigate to="/auth/application-status" replace />;
    if (doctor.status === 'suspended' || doctor.status === 'inactive') return <Navigate to="/auth/login" replace />;
    if (doctor.must_change_password) return <Navigate to="/auth/change-password" replace />;

    return <>{children}</>;
}

// ── Root redirect (replaces expo-router index.tsx) ───────────
function RootRedirect() {
    const { session, doctor, isNewRegistration, application } = useAuthStore();

    const isOAuthReturn = window.location.hash.includes('access_token');

    if (!splashShown && !isOAuthReturn) {
        return <Navigate to="/splash" replace />;
    }

    if (!session) return <Navigate to="/auth/landing" replace />;
    if (isNewRegistration || !doctor) {
        if (application) return <Navigate to="/auth/application-status" replace />;
        return <Navigate to="/auth/register" replace />;
    }
    if (doctor.status === 'pending') return <Navigate to="/auth/application-status" replace />;
    if (doctor.must_change_password) return <Navigate to="/auth/change-password" replace />;

    return <Navigate to="/tabs" replace />;
}

// ── Main App ─────────────────────────────────────────────────
export function App() {
    const { isReady, initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, []);

    if (!isReady) {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.bgPrimary,
            }}>
                <div className="spinner spinner-lg" style={{ color: colors.accentTeal }} />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <OfflineBanner />
            <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/splash" element={<SplashPage />} />

                {/* Auth routes */}
                <Route path="/auth/landing" element={<LandingPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/change-password" element={<ChangePasswordPage />} />
                <Route path="/auth/pending-approval" element={<PendingApprovalPage />} />
                <Route path="/auth/register" element={<RegistrationPage />} />
                <Route path="/auth/application-status" element={<ApplicationTrackerPage />} />

                {/* Tab routes (protected) */}
                <Route path="/tabs" element={<RequireAuth><TabLayout /></RequireAuth>}>
                    <Route index element={<HomePage />} />
                    <Route path="queue" element={<QueuePage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Consultation routes (protected) */}
                <Route path="/consultation/:id" element={<RequireAuth><ConsultationDetailPage /></RequireAuth>} />
                <Route path="/consultation/:id/respond" element={<RequireAuth><RespondPage /></RequireAuth>} />
                <Route path="/consultation/:id/intervention-order" element={<RequireAuth><InterventionOrderPage /></RequireAuth>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ErrorBoundary>
    );
}
