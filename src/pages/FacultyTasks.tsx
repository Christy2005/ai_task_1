import { useEffect, useState } from "react";
import { ClipboardList, CalendarClock, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BackendTask {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_to: string | null;
    due_date: string | null;
    user_id: number | null;
    created_by: number | null;
    created_at: string;
    created_by_name?: string;
    created_by_email?: string;
}

export function FacultyTasks() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<BackendTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // ── Fetch tasks from backend ────────────────────────────────────────────────
    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) { setError("Not logged in."); setLoading(false); return; }

        try {
            const res = await fetch("http://localhost:3000/api/tasks", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load tasks");
            setTasks(data.tasks ?? []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    // ── Update task status ──────────────────────────────────────────────────────
    const markComplete = async (taskId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUpdatingId(taskId);
        try {
            const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "completed" }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Update failed");
            }
            // Optimistic update
            setTasks((prev) =>
                prev.map((t) => t.id === taskId ? { ...t, status: "completed" } : t)
            );
        } catch (err: any) {
            alert(`Could not update task: ${err.message}`);
        } finally {
            setUpdatingId(null);
        }
    };

    const priorityColor = (p: string) =>
        p === "High" ? "text-red-600" : p === "Medium" ? "text-amber-600" : "text-blue-600";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={fetchTasks} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <RefreshCw className="h-4 w-4" /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
                    <p className="text-muted-foreground mt-1">Manage your assigned tasks and deadlines.</p>
                </div>
                <button
                    onClick={fetchTasks}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground gap-2">
                    <ClipboardList className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No tasks assigned to you yet.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    task.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    <ClipboardList className="h-6 w-6" />
                                </div>
                                <span className={cn(
                                    "text-xs font-medium px-2 py-1 rounded capitalize",
                                    task.status === "completed"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {task.status}
                                </span>
                            </div>

                            <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                            {task.description && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                                    {task.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4 mt-auto">
                                {task.due_date && (
                                    <div className="flex items-center gap-1">
                                        <CalendarClock className="h-4 w-4" />
                                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <div className={cn("flex items-center gap-1", priorityColor(task.priority))}>
                                    <AlertCircle className="h-4 w-4" />
                                    <span>{task.priority}</span>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                {task.status !== "completed" && (
                                    <button
                                        onClick={() => markComplete(task.id)}
                                        disabled={updatingId === task.id}
                                        className="flex-1 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {updatingId === task.id ? "Saving..." : "Mark Complete"}
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                    className="flex-1 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
                                >
                                    Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
