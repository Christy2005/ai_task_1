import { CheckCircle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────── */
interface ExtractedTask {
    title: string;
    assigned_to?: string | null;
    assignee?: string | null;
    due_date?: string | null;
    dueDate?: string | null;
    deadline?: string | null;
    priority?: string | null;
    status?: string;
}

interface ExtractedTaskListProps {
    tasks: ExtractedTask[];
}

/* ═══════════════════════════════════════
   Glassmorphism Extracted Task List
   Displayed after AI audio analysis
═══════════════════════════════════════ */
const ExtractedTaskList = ({ tasks }: ExtractedTaskListProps) => {
    if (tasks.length === 0) return null;

    return (
        <div className="mt-8 space-y-4">
            <h3 className="text-2xl font-black mb-6 px-1">
                Extracted Tasks{" "}
                <span className="text-accent-indigo">({tasks.length})</span>
            </h3>

            {tasks.map((task, index) => {
                const assignee = task.assigned_to || task.assignee || "Unassigned";
                const deadline = task.due_date || task.dueDate || task.deadline || "No deadline";
                const priority = (task.priority || "Medium").toLowerCase();

                const priorityStyles = {
                    high: "bg-red-100 text-red-600 border-red-200",
                    medium: "bg-indigo-100 text-indigo-600 border-indigo-200",
                    low: "bg-emerald-100 text-emerald-600 border-emerald-200",
                };
                const priorityClass =
                    priorityStyles[priority as keyof typeof priorityStyles] ??
                    priorityStyles.medium;

                const isSaved = !!task.status; // tasks from backend will have status

                return (
                    <div
                        key={index}
                        className="glass-card p-6 rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/15 transition-all duration-200 group"
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                                {/* Task title — high-contrast midnight purple */}
                                <h4 className="text-lg font-extrabold tracking-tight group-hover:text-accent-indigo transition-colors truncate">
                                    {task.title}
                                </h4>

                                <div className="flex items-center gap-4 text-muted-foreground font-bold text-sm flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <User size={13} className="text-indigo-500 shrink-0" />
                                        {assignee}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={13} className="text-pink-500 shrink-0" />
                                        {deadline}
                                    </span>
                                    {isSaved && (
                                        <span className="flex items-center gap-1 text-emerald-600 text-xs">
                                            <CheckCircle size={12} />
                                            Saved to Neon
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Priority badge */}
                            <span
                                className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0",
                                    priorityClass
                                )}
                            >
                                {task.priority || "Medium"}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ExtractedTaskList;
