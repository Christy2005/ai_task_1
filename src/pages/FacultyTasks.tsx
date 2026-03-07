import { useState, useEffect } from "react";
import { ClipboardList, CalendarClock, AlertCircle, Users, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { FacultyTable } from "@/components/admin/FacultyTable";
import type { FacultyMember } from "@/components/admin/FacultyTable";
import { AssignTaskModal } from "@/components/admin/AssignTaskModal";
import type { AssignForm } from "@/components/admin/AssignTaskModal";

/* ─── Priority config ────────────────────────────────────── */
const priorityConfig = {
    High: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/40" },
    Medium: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40" },
    Low: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/40" },
};

/* ─── Helper ─────────────────────────────────────────────── */
function getToken() { return localStorage.getItem("token") ?? ""; }

interface BackendTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: "Low" | "Medium" | "High" | string;
    due_date: string | null;
}

/* ═══════════════════════════════════════════════════════════
   ADMIN VIEW — Faculty Roster + Assign Task Modal
═══════════════════════════════════════════════════════════ */
function AdminView() {
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<AssignForm | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    /* fetch faculty list */
    useEffect(() => {
        fetch("http://localhost:3000/api/auth/faculty", {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then((r) => r.json())
            .then((d) => {
                if (d.faculty) setFaculty(d.faculty);
                else setError("Could not load faculty list.");
            })
            .catch(() => setError("Network error — is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    /* open modal */
    const openModal = (f: FacultyMember) =>
        setModal({ facultyId: f.id, facultyName: f.name || f.email, title: "", description: "", priority: "Medium", due_date: "" });

    /* submit assignment */
    const handleAssign = async () => {
        if (!modal || !modal.title.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("http://localhost:3000/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({
                    title: modal.title,
                    description: modal.description || null,
                    user_id: modal.facultyId,
                    priority: modal.priority,
                    due_date: modal.due_date || null,
                    status: "pending",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to assign task");

            /* bump active_tasks count in list */
            setFaculty((prev) =>
                prev.map((f) => f.id === modal.facultyId ? { ...f, active_tasks: Number(f.active_tasks) + 1 } : f)
            );
            setModal(null);
            setToast(`✅ Task assigned to ${modal.facultyName}`);
            setTimeout(() => setToast(null), 3500);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight">
                    Faculty <span className="text-gradient-indigo">Management</span>
                </h1>
                <p className="text-muted-foreground mt-1">Assign tasks to faculty members from your Neon database.</p>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-[100] glass-card-strong rounded-2xl px-5 py-3 text-emerald-300 font-semibold shadow-2xl flex items-center gap-2 animate-pulse">
                    <CheckCircle2 className="h-4 w-4" /> {toast}
                </div>
            )}

            {/* Roster card */}
            <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Faculty Roster</h2>
                            <p className="text-xs text-slate-400">{faculty.length} member{faculty.length !== 1 ? "s" : ""} registered</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="px-8 py-16 text-center text-slate-400 text-sm">Loading faculty from database…</div>
                ) : error ? (
                    <div className="px-8 py-16 text-center text-rose-400 text-sm">{error}</div>
                ) : faculty.length === 0 ? (
                    <div className="px-8 py-16 text-center text-slate-400 text-sm">No faculty users found. Register a faculty account to get started.</div>
                ) : (
                    <div className="p-4">
                        <FacultyTable
                            facultyList={faculty}
                            onAssign={openModal}
                        />
                    </div>
                )}
            </div>

            {/* ── Assign Task Modal ── */}
            {modal && (
                <AssignTaskModal
                    modal={modal}
                    submitting={submitting}
                    onChange={setModal}
                    onClose={() => setModal(null)}
                    onSubmit={handleAssign}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   FACULTY VIEW — My Assigned Tasks (from Neon)
═══════════════════════════════════════════════════════════ */
function FacultyView() {
    const [tasks, setTasks] = useState<BackendTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("http://localhost:3000/api/tasks", {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to load tasks");
                }
                setTasks(data.tasks || []);
            } catch (e: any) {
                setError(e.message || "Network error — is the backend running?");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleComplete = async (taskId: number) => {
        try {
            const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ status: "completed" }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update task");
            }
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
            );
        } catch (e: any) {
            alert(e.message || "Unable to update task status");
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black tracking-tight">
                    Faculty <span className="text-gradient-indigo">Tasks</span>
                </h1>
                <p className="text-slate-500 mt-1">Manage your assigned tasks and deadlines.</p>
            </div>

            {loading ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                    <p className="text-slate-400 font-semibold">Loading your tasks…</p>
                </div>
            ) : error ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                    <p className="text-rose-400 font-semibold">{error}</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-slate-400 font-semibold">No tasks assigned yet</p>
                    <p className="text-xs text-slate-500 mt-1">Tasks assigned by admin will appear here</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task) => {
                        const key = (task.priority as string) as keyof typeof priorityConfig;
                        const pri = priorityConfig[key] ?? priorityConfig.Medium;
                        return (
                            <div
                                key={task.id}
                                className="glass-card glass-shadow rounded-[2rem] p-6 flex flex-col h-full group hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-5">
                                    <div
                                        className={cn(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center shadow-md",
                                            task.status === "completed"
                                                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                : "bg-gradient-to-br from-indigo-400 to-purple-500"
                                        )}
                                    >
                                        <ClipboardList className="h-5 w-5 text-white" />
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border",
                                            pri.bg,
                                            pri.text,
                                            pri.border
                                        )}
                                    >
                                        {task.priority}
                                    </span>
                                </div>

                                <h3 className="font-bold text-base mb-2">{task.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 flex-grow mb-5">
                                    {task.description}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-white/10 pt-4 mb-5">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>{task.due_date || "No due date"}</span>
                                    </div>
                                    <div
                                        className={cn(
                                            "flex items-center gap-1.5 font-semibold",
                                            task.status === "completed"
                                                ? "text-emerald-400"
                                                : task.status === "approved"
                                                    ? "text-blue-400"
                                                    : "text-amber-400"
                                        )}
                                    >
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>{task.status}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {task.status !== "completed" && (
                                        <button
                                            onClick={() => handleComplete(task.id)}
                                            className="flex-1 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:shadow-lg transition-all"
                                        >
                                            ✓ Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   ROOT EXPORT — Switches view based on role
═══════════════════════════════════════════════════════════ */
export function FacultyTasks() {
    const { role } = useAuth();
    return role === "admin" ? <AdminView /> : <FacultyView />;
}
