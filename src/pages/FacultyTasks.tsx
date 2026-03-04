import { useState, useEffect } from "react";
import { ClipboardList, CalendarClock, AlertCircle, ArrowRight, Plus, X, Users, CheckCircle2 } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────── */
interface FacultyMember {
    id: number;
    name: string;
    email: string;
    department: string | null;
    phone: string | null;
    active_tasks: number;
}

interface AssignForm {
    facultyId: number;
    facultyName: string;
    title: string;
    description: string;
    priority: "Low" | "Medium" | "High";
    due_date: string;
}

/* ─── Priority config ────────────────────────────────────── */
const priorityConfig = {
    High: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/40" },
    Medium: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40" },
    Low: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/40" },
};

/* ─── Helper ─────────────────────────────────────────────── */
function getToken() { return localStorage.getItem("token") ?? ""; }

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
                <p className="text-slate-500 mt-1">Assign tasks to faculty members from your Neon database.</p>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="text-left px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Faculty</th>
                                    <th className="text-left px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Department</th>
                                    <th className="text-left px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Active Tasks</th>
                                    <th className="text-right px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faculty.map((f, i) => (
                                    <tr
                                        key={f.id}
                                        className={cn(
                                            "transition-colors hover:bg-[#EDE9FE]/10",
                                            i < faculty.length - 1 && "border-b border-white/5"
                                        )}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-black shrink-0">
                                                    {(f.name || f.email).substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{f.name || "—"}</p>
                                                    <p className="text-xs text-slate-400">{f.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-sm text-slate-300">{f.department || "—"}</td>
                                        <td className="px-4 py-5">
                                            <span className={cn(
                                                "text-[11px] font-bold px-3 py-1 rounded-full",
                                                Number(f.active_tasks) > 0
                                                    ? "bg-amber-500/20 text-amber-300"
                                                    : "bg-emerald-500/20 text-emerald-300"
                                            )}>
                                                {f.active_tasks} pending
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => openModal(f)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow hover:shadow-lg hover:scale-105 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Assign Task
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Assign Task Modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card-strong glass-shadow-lg rounded-[2rem] w-full max-w-md p-8 space-y-6">
                        {/* Modal header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black">Assign Task</h3>
                                <p className="text-sm text-slate-400 mt-0.5">→ {modal.facultyName}</p>
                            </div>
                            <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-[#EDE9FE]/20 hover:text-[#EDE9FE] transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Task Title *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. Grade mid-term papers"
                                    value={modal.title}
                                    onChange={(e) => setModal({ ...modal, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Optional task details…"
                                    value={modal.description}
                                    onChange={(e) => setModal({ ...modal, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Priority</label>
                                    <select
                                        value={modal.priority}
                                        onChange={(e) => setModal({ ...modal, priority: e.target.value as "Low" | "Medium" | "High" })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all appearance-none"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        value={modal.due_date}
                                        onChange={(e) => setModal({ ...modal, due_date: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setModal(null)}
                                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:bg-[#EDE9FE]/15 hover:text-[#EDE9FE] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={submitting || !modal.title.trim()}
                                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {submitting ? "Assigning…" : "Assign Task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   FACULTY VIEW — My Assigned Tasks
═══════════════════════════════════════════════════════════ */
function FacultyView() {
    const { tasks, updateTaskStatus } = useTasks();
    const navigate = useNavigate();
    const myTasks = tasks.filter((t) => t.category === "Faculty");

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black tracking-tight">
                    Faculty <span className="text-gradient-indigo">Tasks</span>
                </h1>
                <p className="text-slate-500 mt-1">Manage your assigned tasks and deadlines.</p>
            </div>

            {myTasks.length === 0 ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-slate-400 font-semibold">No tasks assigned yet</p>
                    <p className="text-xs text-slate-500 mt-1">Tasks assigned by admin will appear here</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {myTasks.map((task) => {
                        const pri = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.Medium;
                        return (
                            <div
                                key={task.id}
                                className="glass-card glass-shadow rounded-[2rem] p-6 flex flex-col h-full group hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-5">
                                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-md",
                                        task.status === "Completed"
                                            ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                            : "bg-gradient-to-br from-indigo-400 to-purple-500"
                                    )}>
                                        <ClipboardList className="h-5 w-5 text-white" />
                                    </div>
                                    <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border",
                                        pri.bg, pri.text, pri.border
                                    )}>
                                        {task.priority}
                                    </span>
                                </div>

                                <h3 className="font-bold text-base mb-2">{task.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 flex-grow mb-5">{task.description}</p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-white/10 pt-4 mb-5">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>{task.dueDate || "No due date"}</span>
                                    </div>
                                    <div className={cn("flex items-center gap-1.5 font-semibold",
                                        task.status === "Completed" ? "text-emerald-400"
                                            : task.status === "Approved" ? "text-blue-400"
                                                : "text-amber-400"
                                    )}>
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>{task.status}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {task.status !== "Completed" && (
                                        <button
                                            onClick={() => updateTaskStatus(task.id, "Completed")}
                                            className="flex-1 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:shadow-lg transition-all"
                                        >
                                            ✓ Complete
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className="flex-1 py-2.5 text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 rounded-2xl hover:bg-[#EDE9FE]/15 hover:text-[#EDE9FE] transition-all flex items-center justify-center gap-1"
                                    >
                                        Details <ArrowRight className="h-3 w-3" />
                                    </button>
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
