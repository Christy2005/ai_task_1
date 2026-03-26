import { useState, useEffect } from "react";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    meeting_title?: string;
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; glow: string }> = {
    success: {
        icon: CheckCircle,
        bg: "bg-gradient-to-br from-emerald-400 to-teal-500",
        glow: "shadow-emerald-200/60",
    },
    warning: {
        icon: AlertTriangle,
        bg: "bg-gradient-to-br from-amber-400 to-orange-500",
        glow: "shadow-amber-200/60",
    },
    info: {
        icon: Info,
        bg: "bg-gradient-to-br from-blue-400 to-indigo-500",
        glow: "shadow-indigo-200/60",
    },
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const roleSubtitle: Record<string, string> = {
    admin: "System alerts, unregistered faculty, and all activity.",
    hod: "Pending approvals and task notifications.",
    faculty: "Your assigned tasks and updates.",
};

export function Notifications() {
    const { role } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:3000/api/notifications", {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then((r) => r.json())
            .then((data) => setNotifications(data.notifications || []))
            .catch((err) => console.error("Failed to load notifications:", err))
            .finally(() => setLoading(false));
    }, []);

    const markAllRead = async () => {
        try {
            await fetch("http://localhost:3000/api/notifications/mark-all-read", {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    const markRead = async (id: string) => {
        try {
            await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">
                        <span className="text-gradient-indigo">Notifications</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">{roleSubtitle[role ?? "faculty"]}</p>
                </div>
                <button
                    onClick={markAllRead}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-4 py-2 rounded-2xl hover:bg-white/60"
                >
                    Mark all as read
                </button>
            </div>

            {loading ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                    <p className="text-muted-foreground font-semibold">Loading notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                    <p className="text-muted-foreground font-semibold">No notifications yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => {
                        const config = typeConfig[notification.type] || typeConfig.info;
                        const Icon = config.icon;
                        return (
                            <div
                                key={notification.id}
                                onClick={() => !notification.is_read && markRead(notification.id)}
                                className={cn(
                                    "glass-card glass-shadow rounded-[1.75rem] p-6 flex items-start gap-5 transition-all hover:scale-[1.01] cursor-pointer",
                                    !notification.is_read && "ring-2 ring-indigo-200/60"
                                )}
                            >
                                <div className={cn(
                                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                    config.bg,
                                    config.glow
                                )}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <p className={cn(
                                            "font-bold text-sm",
                                            !notification.is_read ? "text-foreground" : "text-slate-600"
                                        )}>
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-slate-400 shrink-0">{timeAgo(notification.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    {notification.meeting_title && (
                                        <p className="text-xs text-indigo-500 mt-1 font-medium">Meeting: {notification.meeting_title}</p>
                                    )}
                                </div>

                                {!notification.is_read && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 animate-pulse" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
