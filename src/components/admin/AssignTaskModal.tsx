import { X } from "lucide-react";

/* ─── Types ──────────────────────────────────────────── */
export interface AssignForm {
    facultyId: number;
    facultyName: string;
    title: string;
    description: string;
    priority: "Low" | "Medium" | "High";
    due_date: string;
}

interface AssignTaskModalProps {
    modal: AssignForm;
    submitting: boolean;
    onChange: (updated: AssignForm) => void;
    onClose: () => void;
    onSubmit: () => void;
}

/* ═══════════════════════════════════════════════════════
   Task Assignment Modal
   Clean white card — Midnight-Purple (#1E1B4B) typography
═══════════════════════════════════════════════════════ */
export function AssignTaskModal({
    modal,
    submitting,
    onChange,
    onClose,
    onSubmit,
}: AssignTaskModalProps) {
    const field = (key: keyof AssignForm, value: string) =>
        onChange({ ...modal, [key]: value });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card glass-border border rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">

                {/* ── Coloured top accent bar ── */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-foreground">
                                Assign Extra Task
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                Assigning to:{" "}
                                <span className="font-bold text-accent-indigo">
                                    {modal.facultyName}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                                Task Title *
                            </label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Prepare Lab Manual"
                                value={modal.title}
                                onChange={(e) => field("title", e.target.value)}
                                className="w-full bg-secondary border-none rounded-2xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-indigo transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Optional task details…"
                                value={modal.description}
                                onChange={(e) => field("description", e.target.value)}
                                className="w-full bg-secondary border-none rounded-2xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-indigo transition-all resize-none"
                            />
                        </div>

                        {/* Priority + Due Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                                    Priority
                                </label>
                                <select
                                    value={modal.priority}
                                    onChange={(e) =>
                                        field("priority", e.target.value as "Low" | "Medium" | "High")
                                    }
                                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-[#1E1B4B] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-[#1E1B4B] mb-1.5">
                                    Deadline
                                </label>
                                <input
                                    type="date"
                                    value={modal.due_date}
                                    onChange={(e) => field("due_date", e.target.value)}
                                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-[#1E1B4B] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={submitting || !modal.title.trim()}
                            className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {submitting ? "Assigning…" : "Assign Task"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
