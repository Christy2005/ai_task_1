import {
    Users, FileAudio, CheckCircle, Clock, TrendingUp,
    ArrowRight, Calendar, Bell, Sparkles, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import TaskProgressChart from "@/components/dashboard/TaskProgressChart";

export function Dashboard() {
    const { tasks } = useTasks();
    const { user } = useAuth();
    const navigate = useNavigate();

    const totalTasks = tasks.length;
    const pendingApprovals = tasks.filter(
        (t) => t.category === "Approval" && t.status === "Pending"
    ).length;
    const recentTasks = tasks.slice(0, 3);

    const stats = [
        {
            name: "Total Tasks",
            value: totalTasks.toString(),
            change: "+12%",
            trend: "up",
            icon: CheckCircle,
            gradientFrom: "from-blue-400",
            gradientTo: "to-indigo-500",
            glowColor: "rgba(99,102,241,0.35)",
        },
        {
            name: "Pending Approvals",
            value: pendingApprovals.toString(),
            change: "-5%",
            trend: "down",
            icon: Clock,
            gradientFrom: "from-purple-400",
            gradientTo: "to-pink-500",
            glowColor: "rgba(244,114,182,0.35)",
        },
        {
            name: "Minutes Uploaded",
            value: "45",
            change: "+28%",
            trend: "up",
            icon: FileAudio,
            gradientFrom: "from-orange-400",
            gradientTo: "to-red-500",
            glowColor: "rgba(251,146,60,0.35)",
        },
        {
            name: "Active Faculty",
            value: "32",
            change: "+4%",
            trend: "up",
            icon: Users,
            gradientFrom: "from-emerald-400",
            gradientTo: "to-teal-500",
            glowColor: "rgba(52,211,153,0.35)",
        },
    ];

    const quickActions = [
        {
            label: "Upload Audio",
            href: "/upload-audio",
            icon: Upload,
            gradientFrom: "from-blue-400",
            gradientTo: "to-indigo-500",
        },
        {
            label: "Approve Tasks",
            href: "/task-approval",
            icon: CheckCircle,
            gradientFrom: "from-emerald-400",
            gradientTo: "to-teal-500",
        },
        {
            label: "Schedule",
            href: "/calendar",
            icon: Calendar,
            gradientFrom: "from-purple-400",
            gradientTo: "to-indigo-500",
        },
        {
            label: "Faculty",
            href: "/faculty-tasks",
            icon: Users,
            gradientFrom: "from-orange-400",
            gradientTo: "to-pink-500",
        },
    ];

    return (
        <div className="space-y-8">
            {/* ── Desktop Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-tight">
                        Dashboard{" "}
                        <span className="text-gradient-indigo">Overview</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back,{" "}
                        <span className="font-bold text-accent-indigo">{user?.name || user?.email || "admin@gmail.com"}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/notifications")}
                        className="glass-card glass-shadow rounded-2xl p-3 text-muted-foreground hover:text-accent-indigo transition-all hover:scale-105 relative"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
                    </button>
                    <div className="glass-card glass-shadow rounded-2xl px-5 py-2.5 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent-purple" />
                        <span className="text-sm font-bold text-accent-indigo">Admin</span>
                    </div>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="glass-card glass-shadow rounded-[2rem] p-7 relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 cursor-default"
                    >
                        {/* Glow blob */}
                        <div
                            className={cn(
                                "absolute -top-4 -right-4 w-28 h-28 rounded-full",
                                `bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo}`,
                                "opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500"
                            )}
                        />
                        {/* Icon */}
                        <div
                            className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-5",
                                `bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo}`,
                                "shadow-lg"
                            )}
                            style={{ boxShadow: `0 8px 20px ${stat.glowColor}` }}
                        >
                            <stat.icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                            {stat.name}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-5xl font-black text-foreground">{stat.value}</p>
                            <span
                                className={cn(
                                    "flex items-center text-xs font-semibold",
                                    stat.trend === "up" ? "text-emerald-500" : "text-rose-500"
                                )}
                            >
                                <TrendingUp
                                    className={cn("h-3 w-3 mr-0.5", stat.trend === "down" && "rotate-180")}
                                />
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Task Progress Chart ── */}
            <TaskProgressChart />

            {/* ── Bottom Grid ── */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Tasks */}
                <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                    <div className="px-7 py-5 flex items-center justify-between border-b border-glass-border">
                        <h3 className="font-bold card-heading text-base">Recent Tasks</h3>
                        <button
                            onClick={() => navigate("/faculty-tasks")}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                            View All <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="p-7 space-y-5">
                        {recentTasks.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="h-8 w-8 text-indigo-300" />
                                </div>
                                <p className="text-sm text-slate-400 font-medium">No tasks yet</p>
                            </div>
                        ) : (
                            recentTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-start gap-4 group cursor-pointer hover:bg-white/40 rounded-2xl p-3 -m-3 transition-all"
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5",
                                            task.priority === "High"
                                                ? "bg-gradient-to-br from-red-400 to-rose-500 text-white"
                                                : task.priority === "Medium"
                                                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                                                    : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                                        )}
                                    >
                                        {task.assignee
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")
                                            .substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                                                {task.title}
                                            </p>
                                            <span
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                                    task.status === "Completed"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : task.status === "Pending"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-blue-100 text-blue-700"
                                                )}
                                            >
                                                {task.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            <span className="text-xs text-slate-400">Due: {task.dueDate}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                    <div className="px-7 py-5 border-b border-glass-border">
                        <h3 className="font-bold card-heading text-base">Quick Actions</h3>
                    </div>
                    <div className="p-7 grid grid-cols-2 gap-4">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => navigate(action.href)}
                                className="flex flex-col items-center gap-3 p-5 rounded-[1.5rem] bg-white/10 border border-glass-border hover:bg-white/20 hover:scale-[1.04] transition-all duration-200 group"
                            >
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                                        `bg-gradient-to-br ${action.gradientFrom} ${action.gradientTo}`,
                                        "shadow-md group-hover:shadow-lg transition-shadow"
                                    )}
                                >
                                    <action.icon className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-sm font-semibold card-subtext group-hover:text-accent-indigo transition-colors">
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
