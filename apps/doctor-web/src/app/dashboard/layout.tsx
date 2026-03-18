import DoctorSidebar from '@/components/DoctorSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <DoctorSidebar />
            <main className="flex-1 ml-[260px] transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
