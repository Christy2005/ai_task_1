import { useEffect, useState } from "react";
import { Users, ClipboardList, ChevronRight, Plus, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface FacultyMember {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string | null;
    phone: string | null;
    bio: string | null;
    created_at: string;
    assigned_tasks: number;
}

interface AssignForm {
    user_id: number | null;
    title: string;
    description: string;
    priority: "Low" | "Medium" | "High";
    due_date: string;
}

const EMPTY_FORM: AssignForm = {
    user_id: null,
    title: "",
    description: "",
    priority: "Medium",
    due_date: "",
};

export function FacultyManagement() {
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<FacultyMember | null>(null);
    const [showAssign, setShowAssign] = useState(false);
    const [form, setForm] = useState<AssignForm>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const token = localStorage.getItem("token");

    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    // ── Fetch all faculty ────────────────────────────────────────────────────────
    const fetchFaculty = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:3000/api/admin/faculty", {
                headers: authHeaders,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load faculty");
            setFaculty(data.faculty);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFaculty(); }, []);

    // ── Assign task ──────────────────────────────────────────────────────────────
    const handleAssign = async () => {
        if (!form.user_id || !form.title.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("http://localhost:3000/api/admin/assign-task", {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to assign task");
            setToast(`✅ Task "${data.task.title}" assigned to ${data.assignedTo.name}`);
            setShowAssign(false);
            setForm(EMPTY_FORM);
            fetchFaculty(); // refresh task counts
            setTimeout(() => setToast(null), 4000);
        } catch (e: any) {
            setToast(`❌ ${e.message}`);
            setTimeout(() => setToast(null), 4000);
        } finally {
            setSubmitting(false);
        }
    };

    const openAssignFor = (member: FacultyMember) => {
        setForm({ ...EMPTY_FORM, user_id: member.id });
        setSelected(member);
        setShowAssign(true);
    };

    const priorityColor = (p: string) =>
        p === "High" ? "text-red-600 bg-red-50" :
            p === "Medium" ? "text-amber-600 bg-amber-50" :
                "text-blue-600 bg-blue-50";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={fetchFaculty} className="text-sm text-primary hover:underline">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    "fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
                    toast.startsWith("✅") ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                )}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Faculty Management</h1>
                    <p className="text-muted-foreground mt-1">{faculty.length} registered faculty members</p>
                </div>
            </div>

            {/* Faculty grid */}
            {faculty.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground gap-2">
                    <Users className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No faculty members registered yet.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {faculty.map((member) => (
                        <div
                            key={member.id}
                            className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                        >
                            {/* Avatar + name */}
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                                    {member.name?.substring(0, 2).toUpperCase() ?? member.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{member.name || "—"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                    {member.department && (
                                        <p className="text-xs text-muted-foreground">{member.department}</p>
                                    )}
                                </div>
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 font-semibold shrink-0">
                                    <Shield className="h-3 w-3" /> Faculty
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    <span>{member.assigned_tasks} task{member.assigned_tasks !== 1 ? "s" : ""} assigned</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => openAssignFor(member)}
                                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium py-2 hover:bg-primary/90 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Assign Task
                                </button>
                                <button
                                    onClick={() => setSelected(selected?.id === member.id ? null : member)}
                                    className="flex items-center gap-1 rounded-lg border border-border text-xs font-medium px-3 py-2 hover:bg-muted transition-colors"
                                >
                                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", selected?.id === member.id && "rotate-90")} />
                                </button>
                            </div>

                            {/* Expanded details */}
                            {selected?.id === member.id && (
                                <div className="border-t border-border pt-3 space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Phone:</span> {member.phone || "N/A"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Bio:</span> {member.bio || "No bio added."}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Joined:</span> {new Date(member.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Task Modal */}
            {showAssign && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Assign Task to {selected.name || selected.email}</h2>
                            <button onClick={() => setShowAssign(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                placeholder="Task title *"
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <textarea
                                placeholder="Description (optional)"
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AssignForm["priority"] }))}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Priority preview badge */}
                            {form.priority && (
                                <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", priorityColor(form.priority))}>
                                    {form.priority} Priority
                                </span>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAssign(false)}
                                className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={submitting || !form.title.trim()}
                                className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? "Assigning..." : "Assign Task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
