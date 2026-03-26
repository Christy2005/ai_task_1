import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface PendingTask {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    assigned_to: string | null;
    assigned_to_name: string | null;
    approval_status: string;
    meeting_title: string | null;
    created_by_name: string | null;
}

export function TaskApproval() {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:3000/api/tasks/pending-approval", {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then((r) => r.json())
            .then((data) => setTasks(data.tasks || []))
            .catch((err) => console.error("Failed to load pending tasks:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleApprove = async (taskId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/tasks/${taskId}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error("Failed to approve");
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } catch (err) {
            console.error("Approve error:", err);
            alert("Failed to approve task");
        }
    };

    const handleReject = async (taskId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/tasks/${taskId}/reject`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error("Failed to reject");
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } catch (err) {
            console.error("Reject error:", err);
            alert("Failed to reject task");
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                    Task <span className="text-gradient-indigo">Approval</span>
                </h1>
                <p className="text-muted-foreground mt-1">Review and approve tasks assigned to faculty members.</p>
            </div>

            {loading ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                    <p className="text-muted-foreground font-semibold">Loading pending tasks...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tasks.length === 0 ? (
                        <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-indigo-300" />
                            </div>
                            <p className="text-muted-foreground font-semibold">No pending approvals -- all clear!</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                className="glass-card glass-shadow rounded-[2rem] p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-foreground text-base">{task.title}</h3>
                                        <span className={cn(
                                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                            task.priority === "High" ? "bg-red-100 text-red-700"
                                                : task.priority === "Medium" ? "bg-amber-100 text-amber-700"
                                                    : "bg-blue-100 text-blue-700"
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Assigned to: <span className="font-semibold text-slate-700">{task.assigned_to_name || task.assigned_to || "Unassigned"}</span>
                                        {task.due_date && <> &middot; Due: {task.due_date}</>}
                                    </p>
                                    {task.meeting_title && (
                                        <p className="text-xs text-indigo-500 font-medium">Meeting: {task.meeting_title}</p>
                                    )}
                                    {task.description && (
                                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                                    <button
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-foreground bg-white/60 hover:bg-white/90 rounded-2xl transition-all border border-white/50"
                                    >
                                        <Info className="h-4 w-4" /> Details
                                    </button>
                                    <button
                                        onClick={() => handleReject(task.id)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 rounded-2xl transition-all border border-rose-100"
                                    >
                                        <XCircle className="h-4 w-4" /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(task.id)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-2xl transition-all shadow-lg shadow-emerald-200/60"
                                    >
                                        <CheckCircle className="h-4 w-4" /> Approve
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
