import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────── */
export interface FacultyMember {
    id: number;
    name: string;
    email: string;
    department: string | null;
    phone: string | null;
    active_tasks: number;
}

interface FacultyTableProps {
    facultyList: FacultyMember[];
    /** If undefined, no "Assign Task" buttons are shown */
    onAssign?: (faculty: FacultyMember) => void;
}

/* ═══════════════════════════════════════════════════════
   High-Contrast Faculty Table
   White rows + Midnight-Purple (#1E1B4B) data text
═══════════════════════════════════════════════════════ */
export function FacultyTable({ facultyList, onAssign }: FacultyTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
                {/* ── Header ── */}
                <thead>
                    <tr className="text-indigo-300 text-[11px] uppercase tracking-[0.18em] font-black">
                        <th className="px-6 py-3">Faculty</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Active Tasks</th>
                        {onAssign && <th className="px-6 py-3 text-right">Action</th>}
                    </tr>
                </thead>

                {/* ── Body ── */}
                <tbody>
                    {facultyList.map((f) => (
                        <tr
                            key={f.id}
                            className="bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-200 group"
                        >
                            {/* Faculty name + email */}
                            <td className="px-6 py-4 rounded-l-2xl">
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md">
                                        {(f.name || f.email).substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-foreground font-bold text-sm leading-tight">
                                            {f.name || "—"}
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-0.5">{f.email}</p>
                                    </div>
                                </div>
                            </td>

                            {/* Department */}
                            <td className="px-4 py-4 text-foreground font-medium text-sm">
                                {f.department || "Not Assigned"}
                            </td>

                            {/* Active tasks badge */}
                            <td className="px-4 py-4">
                                <span
                                    className={cn(
                                        "text-[11px] font-bold px-3 py-1 rounded-full",
                                        Number(f.active_tasks) > 0
                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    )}
                                >
                                    {f.active_tasks} pending
                                </span>
                            </td>

                            {/* Action button */}
                            {onAssign && (
                                <td className="px-6 py-4 text-right rounded-r-2xl">
                                    <button
                                        onClick={() => onAssign(f)}
                                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow hover:scale-105 transition-all duration-200"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Assign Task
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
