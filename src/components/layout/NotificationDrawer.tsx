import { useState, useEffect, useRef } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const typeIcon: Record<string, typeof Info> = {
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
};

const typeBg: Record<string, string> = {
    success: "bg-gradient-to-br from-emerald-400 to-teal-500",
    warning: "bg-gradient-to-br from-amber-400 to-orange-500",
    info: "bg-gradient-to-br from-blue-400 to-indigo-500",
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationDrawer() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    const unread = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/api/notifications", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            setNotifications((data.notifications || []).slice(0, 8));
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const markRead = async (id: string) => {
        try {
            await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
        } catch {
            // silent
        }
    };

    return (
        <div className="relative" ref={drawerRef}>
            {/* Bell trigger */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative glass-card glass-shadow rounded-xl p-2.5 text-slate-500 hover:text-indigo-600 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-12 z-50 w-80 glass-card glass-shadow rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/20">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-indigo-400" />
                            <span className="font-bold text-sm text-foreground">Notifications</span>
                            {unread > 0 && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                                    {unread} new
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="px-5 py-8 text-center text-muted-foreground text-xs">Loading…</div>
                        ) : notifications.length === 0 ? (
                            <div className="px-5 py-8 text-center text-muted-foreground text-xs">No notifications yet.</div>
                        ) : (
                            notifications.map((n, i) => {
                                const Icon = typeIcon[n.type] || Info;
                                const bg = typeBg[n.type] || typeBg.info;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.is_read && markRead(n.id)}
                                        className={cn(
                                            "flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors",
                                            i < notifications.length - 1 && "border-b border-white/5",
                                            !n.is_read && "bg-indigo-500/5"
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md", bg)}>
                                            <Icon className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-xs font-bold leading-snug",
                                                    !n.is_read ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(n.created_at)}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                        </div>
                                        {!n.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1 animate-pulse" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
