import { Users, FileAudio, CheckCircle, Clock, TrendingUp, ArrowRight, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { RoleGate } from "@/components/RoleGate";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
    const { tasks } = useTasks();
    const { user } = useAuth();
    const navigate = useNavigate();

    const totalTasks = tasks.length;
    const pendingApprovals = tasks.filter(t => t.category === "Approval" && t.status === "Pending").length;

    // Get 3 most recent tasks for the activity feed
    // In a real app we might sort by a 'createdAt' timestamp, here we'll just take the top 3
    const recentTasks = tasks.slice(0, 3);

    const stats = [
        {
            name: "Total Tasks",
            value: totalTasks.toString(),
            change: "+12%", // In a real app, this would be calculated based on history
            trend: "up",
            icon: CheckCircle,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            name: "Pending Approvals",
            value: pendingApprovals.toString(),
            change: "-5%",
            trend: "down",
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-100",
        },
        {
            name: "Minutes Uploaded",
            value: "45",
            change: "+28%",
            trend: "up",
            icon: FileAudio,
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            name: "Active Faculty",
            value: "32",
            change: "+4%",
            trend: "up",
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
                    {user && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
                            <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                user.role === "admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                            )}>
                                <Shield className="h-3 w-3" />
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Last updated: Just now</span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {stat.name}
                                </p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{stat.value}</span>
                                    <span
                                        className={cn(
                                            "flex items-center text-xs font-medium",
                                            stat.trend === "up" ? "text-emerald-600" : "text-rose-600"
                                        )}
                                    >
                                        {stat.change}
                                        <TrendingUp className={cn("ml-1 h-3 w-3", stat.trend === "down" && "rotate-180")} />
                                    </span>
                                </div>
                            </div>
                            <div className={cn("rounded-lg p-3", stat.bg)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Tasks Card */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border p-6 flex items-center justify-between">
                        <h3 className="font-semibold">Recent Tasks</h3>
                        <button
                            onClick={() => navigate('/faculty-tasks')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            View All <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="space-y-6">
                            {recentTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-start group cursor-pointer"
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                >
                                    <div className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium mt-0.5 transition-colors",
                                        task.priority === 'High' ? "bg-red-100 text-red-700" :
                                            task.priority === 'Medium' ? "bg-amber-100 text-amber-700" :
                                                "bg-blue-100 text-blue-700"
                                    )}>
                                        {task.assignee.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div className="ml-4 space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none group-hover:text-blue-600 transition-colors">
                                                {task.title}
                                            </p>
                                            <span className="text-xs text-muted-foreground">{task.status}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {task.description}
                                        </p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border p-6">
                        <h3 className="font-semibold">Quick Actions</h3>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {/* Admin-only actions */}
                        <RoleGate allowedRoles={['admin']}>
                            <button
                                onClick={() => navigate('/upload-audio')}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors hover:border-primary/50"
                            >
                                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                    <FileAudio className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium">Upload Audio</span>
                            </button>
                        </RoleGate>

                        <RoleGate allowedRoles={['admin']}>
                            <button
                                onClick={() => navigate('/task-approval')}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors hover:border-primary/50"
                            >
                                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium">Approve Tasks</span>
                            </button>
                        </RoleGate>

                        {/* Faculty-only action */}
                        <RoleGate allowedRoles={['faculty']}>
                            <button
                                onClick={() => navigate('/faculty-tasks')}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors hover:border-primary/50"
                            >
                                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium">My Tasks</span>
                            </button>
                        </RoleGate>

                        {/* Shared actions */}
                        <button
                            onClick={() => navigate('/calendar')}
                            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors hover:border-primary/50"
                        >
                            <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                                <Clock className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium">Schedule Meeting</span>
                        </button>

                        <button
                            onClick={() => navigate('/profile')}
                            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors hover:border-primary/50"
                        >
                            <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium">Profile</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
