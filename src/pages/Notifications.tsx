import { Info, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const notifications = [
    {
        id: 1,
        title: "Meeting Minutes Processed",
        message: "The audio for 'Faculty Board Meeting' has been successfully processed.",
        time: "2 hours ago",
        type: "success",
        read: false,
    },
    {
        id: 2,
        title: "New Task Assigned",
        message: "You have been assigned to 'Review Mid-term Syllabus'.",
        time: "5 hours ago",
        type: "info",
        read: true,
    },
    {
        id: 3,
        title: "Deadline Approaching",
        message: "Research Grant Proposal is due in 24 hours.",
        time: "1 day ago",
        type: "warning",
        read: true,
    },
];

const typeConfig = {
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

export function Notifications() {
    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        <span className="text-gradient-indigo">Notifications</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Stay updated on tasks and meetings.</p>
                </div>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-4 py-2 rounded-2xl hover:bg-white/60">
                    Mark all as read
                </button>
            </div>

            <div className="space-y-4">
                {notifications.map((notification) => {
                    const config = typeConfig[notification.type as keyof typeof typeConfig];
                    const Icon = config.icon;
                    return (
                        <div
                            key={notification.id}
                            className={cn(
                                "glass-card glass-shadow rounded-[1.75rem] p-6 flex items-start gap-5 transition-all hover:scale-[1.01]",
                                !notification.read && "ring-2 ring-indigo-200/60"
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
                                        !notification.read ? "text-slate-800" : "text-slate-600"
                                    )}>
                                        {notification.title}
                                    </p>
                                    <span className="text-xs text-slate-400 shrink-0">{notification.time}</span>
                                </div>
                                <p className="text-sm text-slate-500">{notification.message}</p>
                            </div>

                            {!notification.read && (
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 animate-pulse" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
