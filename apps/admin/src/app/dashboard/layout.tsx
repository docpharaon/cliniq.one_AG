import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import DashboardShell from '@/components/DashboardShell';
import Footer from '@/components/Footer';
import CapacitorNotificationListener from '@/components/CapacitorNotificationListener';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
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
    );
}
