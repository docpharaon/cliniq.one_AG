import DoctorSidebar from '@/components/DoctorSidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { FeatureGateProvider } from '@/components/FeatureGateProvider';
import DashboardShell from '@/components/DashboardShell';
import Footer from '@/components/Footer';
import CapacitorNotificationListener from '@/components/CapacitorNotificationListener';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <FeatureGateProvider>
                <div className="flex min-h-screen">
                    <DoctorSidebar />
                    <DashboardShell>
                        <CapacitorNotificationListener />
                        {children}
                        <Footer />
                    </DashboardShell>
                </div>
            </FeatureGateProvider>
        </SidebarProvider>
    );
}
