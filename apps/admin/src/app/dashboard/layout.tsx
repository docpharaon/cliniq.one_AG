import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import DashboardShell from '@/components/DashboardShell';
import Footer from '@/components/Footer';
import CapacitorNotificationListener from '@/components/CapacitorNotificationListener';
import { AdminAuthProvider } from '@/components/AdminAuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
