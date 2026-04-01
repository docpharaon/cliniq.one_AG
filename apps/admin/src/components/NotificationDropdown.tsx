import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, CheckCheck, FileText, UserPlus, LogIn, Info, X } from 'lucide-react';
import {
    fetchAdminNotifications,
    fetchUnreadAdminNotificationCount,
    doMarkAdminNotificationRead,
    doMarkAllAdminNotificationsRead,
} from '@/lib/actions';

type AdminNotification = {
    id: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    read: boolean;
    created_at: string;
};

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    consultation_submitted: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/15' },
    user_registered: { icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    user_login: { icon: LogIn, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    system: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function NotificationDropdown() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadCount = useCallback(async () => {
        const count = await fetchUnreadAdminNotificationCount();
        setUnreadCount(count);
    }, []);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        const data = await fetchAdminNotifications(30);
        setNotifications(data as AdminNotification[]);
        setLoading(false);
    }, []);

    // Poll unread count every 30s
    useEffect(() => {
        loadCount();
        const interval = setInterval(loadCount, 30000);
        return () => clearInterval(interval);
    }, [loadCount]);

    // Load full list when dropdown opens
    useEffect(() => {
        if (open) {
            loadNotifications();
        }
    }, [open, loadNotifications]);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [open]);

    const handleMarkRead = async (id: string) => {
        await doMarkAdminNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await doMarkAllAdminNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <button
                id="notification-bell"
                onClick={() => setOpen(!open)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent-faded transition-colors"
            >
                <Bell className={`w-5 h-5 ${open ? 'text-accent' : 'text-text-secondary'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-error rounded-full text-[11px] font-bold text-white flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-2xl border border-border overflow-hidden z-50 shadow-2xl"
                    style={{
                        background: 'rgba(15, 23, 42, 0.97)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-text-primary">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-[11px] font-semibold text-accent bg-accent-faded px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-accent hover:bg-accent-faded transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Read all
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-elevated transition-colors text-text-muted"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[400px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                                <Bell className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const cfg = typeConfig[n.type] || typeConfig.info;
                                const Icon = cfg.icon;
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => !n.read && handleMarkRead(n.id)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 ${
                                            n.read
                                                ? 'opacity-60 hover:opacity-80'
                                                : 'hover:bg-accent/[0.05] bg-accent/[0.02]'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-semibold truncate ${n.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && (
                                                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
