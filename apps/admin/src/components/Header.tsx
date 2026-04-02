import { Search, Settings, Menu, Crown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import { useAdminAuth } from './AdminAuthProvider';
import NotificationDropdown from './NotificationDropdown';
import { haptic } from '@/lib/useHaptics';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { isMobile, openMobile } = useSidebar();
    const { user, isSuperadmin } = useAdminAuth();

    // Extract user info from auth context
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    const initials = fullName
        ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : (user?.email?.[0]?.toUpperCase() || 'A');

    return (
        <header
            className="sticky top-0 z-40 flex items-center justify-between h-14 md:h-16 px-4 md:px-8 border-b gap-3"
            style={{
                background: 'var(--color-bg-primary)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
        >
            {/* Left: Hamburger + Title */}
            <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                    <button
                        onClick={() => { haptic.light(); openMobile(); }}
                        className="pressable w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors text-text-secondary flex-shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                <div className="min-w-0">
                    <h1 className="text-base md:text-lg font-bold text-text-primary truncate">{title}</h1>
                    {subtitle && (
                        <p className="text-xs text-text-muted truncate">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center: Search (desktop only) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search users, doctors, consultations..."
                        className="w-full bg-bg-elevated border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all cursor-not-allowed opacity-60"
                        disabled
                        title="Search coming soon"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                <NotificationDropdown />

                {isSuperadmin && (
                    <Link to="/dashboard/settings" className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-accent-faded transition-colors" title="Settings">
                        <Settings className="w-5 h-5 text-text-secondary" />
                    </Link>
                )}

                {/* Profile Avatar */}
                <Link to={isSuperadmin ? "/dashboard/settings" : "/dashboard"} className="relative ml-1 md:ml-2 cursor-pointer group" title={isSuperadmin ? "Profile & Settings" : "Profile"}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={fullName || 'Profile'}
                            className="w-9 h-9 rounded-full object-cover border-2 transition-all group-hover:scale-105"
                            style={{ borderColor: isSuperadmin ? '#f59e0b' : 'var(--color-accent)' }}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bg-primary border-2 transition-all group-hover:scale-105"
                            style={{
                                background: isSuperadmin
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'var(--color-accent)',
                                borderColor: isSuperadmin ? '#f59e0b' : 'var(--color-accent)',
                            }}
                        >
                            {initials}
                        </div>
                    )}
                    {/* Superadmin crown badge */}
                    {isSuperadmin && (
                        <div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            title="Superadmin"
                        >
                            <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </Link>

                {/* Name + Role (desktop) */}
                <div className="hidden lg:flex flex-col ml-1">
                    <span className="text-sm font-semibold text-text-primary leading-tight truncate max-w-[120px]">
                        {fullName || user?.email?.split('@')[0] || 'Admin'}
                    </span>
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider leading-tight"
                        style={{ color: isSuperadmin ? '#f59e0b' : 'var(--color-text-muted)' }}
                    >
                        {isSuperadmin ? 'Superadmin' : 'Admin'}
                    </span>
                </div>
            </div>
        </header>
    );
}
