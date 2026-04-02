import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { supabase } from '@cliniqone/api';
import { OfflineBanner, ThemeProvider } from '@cliniqone/ui';
import { initLocale } from '@cliniqone/i18n';
import { App as CapApp } from '@capacitor/app';
import { haptic } from './hooks/useHaptics';

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
import { ToastProvider } from './components/ToastProvider';
import { BrandSpinner } from './components/BrandSpinner';

// ── Splash gate ──────────────────────────────────────────────
let splashShown = false;
export function markSplashShown() { splashShown = true; }

// ── Session timeout (15 min inactivity lock) ─────────────────
function useSessionTimeout(timeoutMs: number) {
    const navigate = useNavigate();
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const { doctor } = useAuthStore.getState();
                if (!doctor) return;
                try { await supabase.auth.signOut(); } catch {}
                useAuthStore.getState().clear();
                navigate('/auth/landing', { replace: true });
            }, timeoutMs);
        };
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();
        return () => {
            clearTimeout(timer);
            events.forEach(e => window.removeEventListener(e, reset));
        };
    }, [timeoutMs, navigate]);
}

// ── Tab layout wrapper ───────────────────────────────────────
function TabLayout() {
    const location = useLocation();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div key={location.pathname} className="tab-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}><Outlet /></div>
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

// ── App inner (with session timeout) ─────────────────────────
function AppInner() {
    const navigate = useNavigate();
    const location = useLocation();
    useSessionTimeout(15 * 60 * 1000);

    // Android hardware back button handler
    useEffect(() => {
        const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
            haptic.light();
            if (canGoBack) {
                navigate(-1);
            } else {
                CapApp.exitApp();
            }
        });
        return () => { handler.then(h => h.remove()); };
    }, [navigate]);

    return (
        <ToastProvider>
            <OfflineBanner
                offlineText="No internet connection"
                onlineText="Back online"
            />
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
        </ToastProvider>
    );
}

// ── Main App ─────────────────────────────────────────────────
export function App() {
    const { isReady, initialize } = useAuthStore();

    useEffect(() => {
        initLocale().catch(() => {});
        initialize();
    }, []);

    if (!isReady) {
        return <BrandSpinner />;
    }

    return <ErrorBoundary><ThemeProvider><AppInner /></ThemeProvider></ErrorBoundary>;
}
