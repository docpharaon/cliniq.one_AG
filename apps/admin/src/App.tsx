import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import DashboardShell from '@/components/DashboardShell';
import Footer from '@/components/Footer';
import CapacitorNotificationListener from '@/components/CapacitorNotificationListener';
import { AdminAuthProvider } from '@/components/AdminAuthProvider';
import OfflineBannerClient from '@/components/OfflineBannerClient';
import { AdminThemeProvider } from '@/lib/themeStore';

// Pages
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import AdminsPage from '@/app/dashboard/admins/page';
import AdsPage from '@/app/dashboard/ads/page';
import AiPage from '@/app/dashboard/ai/page';
import AnalyticsPage from '@/app/dashboard/analytics/page';
import ApplicationsPage from '@/app/dashboard/applications/page';
import ApplicationDetailPage from '@/app/dashboard/applications/[id]/page';
import AuditPage from '@/app/dashboard/audit/page';
import ConsultationsPage from '@/app/dashboard/consultations/page';
import DoctorsPage from '@/app/dashboard/doctors/page';
import LocumPage from '@/app/dashboard/doctors/locum/page';
import ErrorsPage from '@/app/dashboard/errors/page';
import HealthTipsPage from '@/app/dashboard/health-tips/page';
import HrPage from '@/app/dashboard/hr/page';
import IcdCodesPage from '@/app/dashboard/icd-codes/page';
import InterventionsPage from '@/app/dashboard/interventions/page';
import KycPage from '@/app/dashboard/kyc/page';
import NewsPage from '@/app/dashboard/news/page';
import NotificationsPage from '@/app/dashboard/notifications/page';
import PricingPage from '@/app/dashboard/pricing/page';
import ProtocolsPage from '@/app/dashboard/protocols/page';
import RefundsPage from '@/app/dashboard/refunds/page';
import SchedulingPage from '@/app/dashboard/scheduling/page';
import SettingsPage from '@/app/dashboard/settings/page';
import SpecialtiesPage from '@/app/dashboard/specialties/page';
import TestersPage from '@/app/dashboard/testers/page';
import TokensPage from '@/app/dashboard/tokens/page';
import UsersPage from '@/app/dashboard/users/page';
import NotFoundPage from '@/app/not-found';
import AuthCallbackPage from '@/app/auth/callback/page';

function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuthProvider>
            <SidebarProvider>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <DashboardShell>
                        <CapacitorNotificationListener />
                        {children}
                        <Footer />
                    </DashboardShell>
                </div>
            </SidebarProvider>
        </AdminAuthProvider>
    );
}

export default function App() {
    return (
        <AdminThemeProvider>
            <OfflineBannerClient />
            <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Login */}
                <Route path="/login" element={<LoginPage />} />

                {/* OAuth Callback */}
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
                <Route path="/dashboard/admins" element={<DashboardLayout><AdminsPage /></DashboardLayout>} />
                <Route path="/dashboard/ads" element={<DashboardLayout><AdsPage /></DashboardLayout>} />
                <Route path="/dashboard/ai" element={<DashboardLayout><AiPage /></DashboardLayout>} />
                <Route path="/dashboard/analytics" element={<DashboardLayout><AnalyticsPage /></DashboardLayout>} />
                <Route path="/dashboard/applications" element={<DashboardLayout><ApplicationsPage /></DashboardLayout>} />
                <Route path="/dashboard/applications/:id" element={<DashboardLayout><ApplicationDetailPage /></DashboardLayout>} />
                <Route path="/dashboard/audit" element={<DashboardLayout><AuditPage /></DashboardLayout>} />
                <Route path="/dashboard/consultations" element={<DashboardLayout><ConsultationsPage /></DashboardLayout>} />
                <Route path="/dashboard/doctors" element={<DashboardLayout><DoctorsPage /></DashboardLayout>} />
                <Route path="/dashboard/doctors/locum" element={<DashboardLayout><LocumPage /></DashboardLayout>} />
                <Route path="/dashboard/errors" element={<DashboardLayout><ErrorsPage /></DashboardLayout>} />
                <Route path="/dashboard/health-tips" element={<DashboardLayout><HealthTipsPage /></DashboardLayout>} />
                <Route path="/dashboard/hr" element={<DashboardLayout><HrPage /></DashboardLayout>} />
                <Route path="/dashboard/icd-codes" element={<DashboardLayout><IcdCodesPage /></DashboardLayout>} />
                <Route path="/dashboard/interventions" element={<DashboardLayout><InterventionsPage /></DashboardLayout>} />
                <Route path="/dashboard/kyc" element={<DashboardLayout><KycPage /></DashboardLayout>} />
                <Route path="/dashboard/news" element={<DashboardLayout><NewsPage /></DashboardLayout>} />
                <Route path="/dashboard/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
                <Route path="/dashboard/pricing" element={<DashboardLayout><PricingPage /></DashboardLayout>} />
                <Route path="/dashboard/protocols" element={<DashboardLayout><ProtocolsPage /></DashboardLayout>} />
                <Route path="/dashboard/refunds" element={<DashboardLayout><RefundsPage /></DashboardLayout>} />
                <Route path="/dashboard/scheduling" element={<DashboardLayout><SchedulingPage /></DashboardLayout>} />
                <Route path="/dashboard/settings" element={<DashboardLayout><SettingsPage /></DashboardLayout>} />
                <Route path="/dashboard/specialties" element={<DashboardLayout><SpecialtiesPage /></DashboardLayout>} />
                <Route path="/dashboard/testers" element={<DashboardLayout><TestersPage /></DashboardLayout>} />
                <Route path="/dashboard/tokens" element={<DashboardLayout><TokensPage /></DashboardLayout>} />
                <Route path="/dashboard/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AdminThemeProvider>
    );
}
