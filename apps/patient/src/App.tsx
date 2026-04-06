import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { supabase } from '@cliniqone/api';
import { OfflineBanner, ThemeProvider } from '@cliniqone/ui';
import { initLocale, t } from '@cliniqone/i18n';
import { App as CapApp } from '@capacitor/app';
import { haptic } from './hooks/useHaptics';

// Pages
import { SplashPage } from './pages/SplashPage';
import { LandingPage } from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AuthPage from './pages/auth/AuthPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import PersonalDetailsPage from './pages/auth/PersonalDetailsPage';
import LegalPage from './pages/auth/LegalPage';
import WelcomePage from './pages/auth/WelcomePage';
import HomePage from './pages/tabs/HomePage';
import ConsultationsPage from './pages/tabs/ConsultationsPage';
import NotificationsPage from './pages/tabs/NotificationsPage';
import WalletPage from './pages/tabs/WalletPage';
import ProfilePage from './pages/tabs/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { InterventionsPage } from './pages/InterventionsPage';
import { TabBar } from './components/TabBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { BrandSpinner } from './components/BrandSpinner';

// Intake pages
import IntakeIndexPage from './pages/intake/IntakeIndexPage';
import AllergiesPage from './pages/intake/AllergiesPage';
import MedicationsPage from './pages/intake/MedicationsPage';
import QuestionsPage from './pages/intake/QuestionsPage';
import AiChatPage from './pages/intake/AiChatPage';
import PsychScreeningPage from './pages/intake/PsychScreeningPage';
import TelepsychiatryConsentPage from './pages/intake/TelepsychiatryConsentPage';
import DoctorSelectPage from './pages/intake/DoctorSelectPage';
import ReviewPage from './pages/intake/ReviewPage';
import SubmitPage from './pages/intake/SubmitPage';
import AnalyzingPage from './pages/intake/AnalyzingPage';
import ReportChatPage from './pages/intake/ReportChatPage';
import InquiryChatPage from './pages/intake/InquiryChatPage';
import ChatGuidePage from './pages/intake/ChatGuidePage';

// Consultation pages
import ConsultationDetailPage from './pages/consultation/ConsultationDetailPage';
import FeedbackPage from './pages/consultation/FeedbackPage';
import InterventionBookingPage from './pages/consultation/InterventionBookingPage';
import WaitingRoomPage from './pages/consultation/WaitingRoomPage';

// Settings pages
import AppearancePage from './pages/settings/AppearancePage';
import DeleteAccountPage from './pages/settings/DeleteAccountPage';
import EditProfilePage from './pages/settings/EditProfilePage';
import HelpPage from './pages/settings/HelpPage';
import InsurancePage from './pages/settings/InsurancePage';
import LanguagePage from './pages/settings/LanguagePage';
import NotificationSettingsPage from './pages/settings/NotificationSettingsPage';
import PrivacyTermsPage from './pages/settings/PrivacyTermsPage';
import ReportBugPage from './pages/settings/ReportBugPage';
import SecurityPage from './pages/settings/SecurityPage';
import VerifyIdentityPage from './pages/settings/VerifyIdentityPage';
import AboutPage from './pages/settings/AboutPage';

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
                const { user } = useAuthStore.getState();
                if (!user) return;
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
    const { session, user } = useAuthStore();
    if (!session) return <Navigate to="/auth/landing" replace />;
    // Role guard: only patients
    if (user && user.role !== 'patient') return <Navigate to="/auth/landing" replace />;
    return <>{children}</>;
}

// ── Onboarding guard (legal + personal details) ──────────────
function RequireOnboarding({ children }: { children: React.ReactNode }) {
    const { session, user } = useAuthStore();
    if (!session) return <Navigate to="/auth/landing" replace />;
    if (user && user.role !== 'patient') return <Navigate to="/auth/landing" replace />;
    if (user && !user.legal_accepted_at) return <Navigate to="/auth/legal" replace />;
    const profileComplete = !!(user?.gender && user?.country && user?.year_of_birth);
    if (user && !profileComplete) return <Navigate to="/auth/personal-details" replace />;
    return <>{children}</>;
}

// ── Root redirect ────────────────────────────────────────────
function RootRedirect() {
    const { session, user } = useAuthStore();
    const isOAuthReturn = window.location.hash.includes('access_token');

    if (!splashShown && !isOAuthReturn) return <Navigate to="/splash" replace />;
    if (!session) return <Navigate to="/auth/landing" replace />;
    if (user && user.role !== 'patient') return <Navigate to="/auth/landing" replace />;
    if (user && !user.legal_accepted_at) return <Navigate to="/auth/legal" replace />;
    const profileComplete = !!(user?.gender && user?.country && user?.year_of_birth);
    if (user && !profileComplete) return <Navigate to="/auth/personal-details" replace />;
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
                offlineText={t('common.noInternet')}
                onlineText={t('common.backOnline')}
            />
            <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/splash" element={<SplashPage />} />

                {/* Auth routes */}
                <Route path="/auth/landing" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/login" element={<Navigate to="/auth" replace />} />
                <Route path="/auth/signup" element={<Navigate to="/auth" replace />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
                <Route path="/auth/personal-details" element={<RequireAuth><PersonalDetailsPage /></RequireAuth>} />
                <Route path="/auth/legal" element={<RequireAuth><LegalPage /></RequireAuth>} />
                <Route path="/auth/welcome" element={<RequireAuth><WelcomePage /></RequireAuth>} />
                <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />

                {/* Tab routes (protected + onboarded) */}
                <Route path="/tabs" element={<RequireOnboarding><TabLayout /></RequireOnboarding>}>
                    <Route index element={<HomePage />} />
                    <Route path="consultations" element={<ConsultationsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="wallet" element={<WalletPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Intake flow (protected) */}
                <Route path="/intake" element={<RequireOnboarding><IntakeIndexPage /></RequireOnboarding>} />
                <Route path="/intake/complaint" element={<Navigate to="/intake/ai-chat" replace />} />
                <Route path="/intake/allergies" element={<RequireOnboarding><AllergiesPage /></RequireOnboarding>} />
                <Route path="/intake/medications" element={<RequireOnboarding><MedicationsPage /></RequireOnboarding>} />
                <Route path="/intake/questions" element={<RequireOnboarding><QuestionsPage /></RequireOnboarding>} />
                <Route path="/intake/chat-guide" element={<RequireOnboarding><ChatGuidePage /></RequireOnboarding>} />
                <Route path="/intake/ai-chat" element={<RequireOnboarding><AiChatPage /></RequireOnboarding>} />
                <Route path="/intake/psych-screening" element={<RequireOnboarding><PsychScreeningPage /></RequireOnboarding>} />
                <Route path="/intake/telepsychiatry-consent" element={<RequireOnboarding><TelepsychiatryConsentPage /></RequireOnboarding>} />
                <Route path="/intake/doctor-select" element={<RequireOnboarding><DoctorSelectPage /></RequireOnboarding>} />
                <Route path="/intake/review" element={<RequireOnboarding><ReviewPage /></RequireOnboarding>} />
                <Route path="/intake/submit" element={<RequireOnboarding><SubmitPage /></RequireOnboarding>} />
                <Route path="/intake/analyzing" element={<RequireOnboarding><AnalyzingPage /></RequireOnboarding>} />
                <Route path="/intake/report-chat/:id" element={<RequireOnboarding><ReportChatPage /></RequireOnboarding>} />
                <Route path="/intake/inquiry-chat/:id" element={<RequireOnboarding><InquiryChatPage /></RequireOnboarding>} />

                {/* Consultation routes (protected) */}
                <Route path="/consultation/:id" element={<RequireOnboarding><ConsultationDetailPage /></RequireOnboarding>} />
                <Route path="/consultation/:id/feedback" element={<RequireOnboarding><FeedbackPage /></RequireOnboarding>} />
                <Route path="/consultation/:id/intervention-booking" element={<RequireOnboarding><InterventionBookingPage /></RequireOnboarding>} />
                <Route path="/consultation/:id/waiting-room" element={<RequireOnboarding><WaitingRoomPage /></RequireOnboarding>} />
                <Route path="/interventions" element={<RequireOnboarding><InterventionsPage /></RequireOnboarding>} />

                {/* Settings routes (protected) */}
                <Route path="/settings/appearance" element={<RequireOnboarding><AppearancePage /></RequireOnboarding>} />
                <Route path="/settings/delete-account" element={<RequireOnboarding><DeleteAccountPage /></RequireOnboarding>} />
                <Route path="/settings/edit-profile" element={<RequireOnboarding><EditProfilePage /></RequireOnboarding>} />
                <Route path="/settings/help" element={<RequireOnboarding><HelpPage /></RequireOnboarding>} />
                <Route path="/settings/insurance" element={<RequireOnboarding><InsurancePage /></RequireOnboarding>} />
                <Route path="/settings/language" element={<RequireOnboarding><LanguagePage /></RequireOnboarding>} />
                <Route path="/settings/notifications" element={<RequireOnboarding><NotificationSettingsPage /></RequireOnboarding>} />
                <Route path="/settings/privacy-terms" element={<RequireOnboarding><PrivacyTermsPage /></RequireOnboarding>} />
                <Route path="/settings/report-bug" element={<RequireOnboarding><ReportBugPage /></RequireOnboarding>} />
                <Route path="/settings/security" element={<RequireOnboarding><SecurityPage /></RequireOnboarding>} />
                <Route path="/settings/verify-identity" element={<RequireOnboarding><VerifyIdentityPage /></RequireOnboarding>} />
                <Route path="/settings/about" element={<RequireOnboarding><AboutPage /></RequireOnboarding>} />

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
