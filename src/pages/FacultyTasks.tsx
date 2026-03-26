import { useState, useEffect } from "react";
import { ClipboardList, CalendarClock, AlertCircle, Users, CheckCircle2, FileText, Calendar, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: "Low" | "Medium" | "High" | string;
    due_date: string | null;
    meeting_title: string | null;
}

interface Meeting {
    id: string;
    title: string;
    created_at: string;
    task_count: number;
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
                            <p className="text-xs text-muted-foreground">{faculty.length} member{faculty.length !== 1 ? "s" : ""} registered</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="px-8 py-16 text-center text-muted-foreground text-sm">Loading faculty from database…</div>
                ) : error ? (
                    <div className="px-8 py-16 text-center text-rose-400 text-sm">{error}</div>
                ) : faculty.length === 0 ? (
                    <div className="px-8 py-16 text-center text-muted-foreground text-sm">No faculty users found. Register a faculty account to get started.</div>
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
   FACULTY VIEW — My Assigned Tasks + Meeting Minutes + Calendar
═══════════════════════════════════════════════════════════ */
function FacultyView() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<BackendTask[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        Promise.all([
            fetch("http://localhost:3000/api/tasks", { headers }).then((r) => r.json()),
            fetch("http://localhost:3000/api/meetings", { headers }).then((r) => r.json()).catch(() => ({ meetings: [] })),
        ])
            .then(([taskData, meetingData]) => {
                if (taskData.error) throw new Error(taskData.error);
                setTasks(taskData.tasks || []);
                setMeetings((meetingData.meetings || []).slice(0, 5));
            })
            .catch((e: any) => setError(e.message || "Network error — is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    const handleComplete = async (taskId: string) => {
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
            if (!res.ok) throw new Error(data.error || "Failed to update task");
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t)));
        } catch (e: any) {
            alert(e.message || "Unable to update task status");
        }
    };

    if (loading) {
        return (
            <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                <p className="text-muted-foreground font-semibold">Loading…</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="glass-card glass-shadow rounded-[2rem] p-16 text-center">
                <p className="text-rose-400 font-semibold">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-4xl font-black tracking-tight">
                    Faculty <span className="text-gradient-indigo">Dashboard</span>
                </h1>
                <p className="text-muted-foreground mt-1">Your tasks, meeting minutes, and schedule.</p>
            </div>

            {/* ── Assigned Tasks ── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-indigo-400" />
                        Assigned Tasks
                        <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
                    </h2>
                </div>

                {tasks.length === 0 ? (
                    <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                        <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                            <ClipboardList className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-muted-foreground font-semibold">No tasks assigned yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Tasks approved by HOD will appear here</p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {tasks.map((task) => {
                            const key = task.priority as keyof typeof priorityConfig;
                            const pri = priorityConfig[key] ?? priorityConfig.Medium;
                            return (
                                <div
                                    key={task.id}
                                    className="glass-card glass-shadow rounded-[2rem] p-6 flex flex-col h-full group hover:scale-[1.02] transition-all duration-300"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-md",
                                            task.status === "completed"
                                                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                : "bg-gradient-to-br from-indigo-400 to-purple-500"
                                        )}>
                                            <ClipboardList className="h-5 w-5 text-white" />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border",
                                            pri.bg, pri.text, pri.border
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-base mb-1">{task.title}</h3>
                                    {task.meeting_title && (
                                        <p className="text-xs text-indigo-400 mb-1 font-medium">
                                            From: {task.meeting_title}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground line-clamp-2 flex-grow mb-4">
                                        {task.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-white/10 pt-3 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            <span>{task.due_date ? task.due_date.slice(0, 10) : "No due date"}</span>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 font-semibold",
                                            task.status === "completed" ? "text-emerald-400"
                                                : task.status === "approved" ? "text-blue-400"
                                                    : "text-amber-400"
                                        )}>
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            <span>{task.status}</span>
                                        </div>
                                    </div>

                                    {task.status !== "completed" && (
                                        <button
                                            onClick={() => handleComplete(task.id)}
                                            className="w-full py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:shadow-lg transition-all"
                                        >
                                            ✓ Mark Complete
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Meeting Minutes ── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-400" />
                        Meeting Minutes
                    </h2>
                    <button
                        onClick={() => navigate("/meeting-minutes")}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                        View All <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                {meetings.length === 0 ? (
                    <div className="glass-card glass-shadow rounded-[2rem] p-8 text-center">
                        <p className="text-muted-foreground font-semibold text-sm">No meetings recorded yet</p>
                    </div>
                ) : (
                    <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                        {meetings.map((m, i) => (
                            <div
                                key={m.id}
                                onClick={() => navigate(`/meeting-minutes`)}
                                className={cn(
                                    "flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/10 transition-colors",
                                    i < meetings.length - 1 && "border-b border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
                                        <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{m.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(m.created_at).toLocaleDateString()} · {m.task_count} task{m.task_count !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Calendar shortcut ── */}
            <section>
                <div
                    onClick={() => navigate("/calendar")}
                    className="glass-card glass-shadow rounded-[2rem] p-6 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-base">My Calendar</p>
                            <p className="text-sm text-muted-foreground">View task deadlines and scheduled events</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                </div>
            </section>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   ROOT EXPORT — Switches view based on role
═══════════════════════════════════════════════════════════ */
export function FacultyTasks() {
    const { role } = useAuth();
    return (role === "admin" || role === "hod") ? <AdminView /> : <FacultyView />;
}
