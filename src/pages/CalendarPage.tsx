import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface CalEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
    is_task_event?: boolean;
}

const COLOR_MAP: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
};

function colorClass(color?: string) {
    return COLOR_MAP[color ?? "indigo"] ?? COLOR_MAP.indigo;
}

const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function CalendarPage() {
    const { role } = useAuth();
    const canEdit = role === "admin" || role === "hod";

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth()); // 0-indexed
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: "", start_date: "", description: "", color: "indigo" });
    const [saving, setSaving] = useState(false);

    // Fetch events for the visible month
    useEffect(() => {
        const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

        fetch(`http://localhost:3000/api/events?start=${start}&end=${end}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then((r) => r.json())
            .then((d) => setEvents(d.events || []))
            .catch((err) => console.error("Failed to load events:", err));
    }, [year, month]);

    const prevMonth = () => {
        if (month === 0) { setYear((y) => y - 1); setMonth(11); }
        else setMonth((m) => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setYear((y) => y + 1); setMonth(0); }
        else setMonth((m) => m + 1);
    };

    // Build calendar grid
    const firstDow = new Date(year, month, 1).getDay(); // day of week of 1st
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map events by date string "YYYY-MM-DD"
    const eventsByDate: Record<string, CalEvent[]> = {};
    for (const ev of events) {
        const key = ev.start_date.slice(0, 10);
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push(ev);
    }

    const handleAddEvent = async () => {
        if (!form.title.trim() || !form.start_date) return;
        setSaving(true);
        try {
            const res = await fetch("http://localhost:3000/api/events", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description || null,
                    start_date: form.start_date,
                    color: form.color,
                    all_day: true,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create event");

            setEvents((prev) => [...prev, data.event]);
            setShowModal(false);
            setForm({ title: "", start_date: "", description: "", color: "indigo" });
        } catch (err: any) {
            alert(err.message || "Failed to create event");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (eventId: string) => {
        if (!confirm("Delete this event?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/events/${eventId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) throw new Error("Failed to delete");
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
        } catch (err: any) {
            alert(err.message || "Failed to delete event");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">
                        My <span className="text-gradient-indigo">Calendar</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">Task deadlines and scheduled events.</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:scale-105 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Event
                    </button>
                )}
            </div>

            <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                {/* Month header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/40">
                    <h2 className="font-bold text-foreground text-base">
                        {MONTH_NAMES[month]} {year}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevMonth}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-indigo-600 transition-all"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                            Today
                        </button>
                        <button
                            onClick={nextMonth}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-indigo-600 transition-all"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 border-b border-white/30 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {DAY_NAMES.map((d) => (
                        <div key={d} className="py-3">{d}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 text-sm">
                    {/* Leading empty cells */}
                    {[...Array(firstDow)].map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-white/20 bg-white/10 p-2" />
                    ))}

                    {/* Date cells */}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayEvents = eventsByDate[dateKey] || [];
                        const isToday =
                            day === today.getDate() &&
                            month === today.getMonth() &&
                            year === today.getFullYear();

                        return (
                            <div
                                key={day}
                                className="group relative min-h-[90px] border-b border-r border-white/20 p-2 hover:bg-white/40 transition-colors"
                            >
                                <span className={cn(
                                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                    isToday
                                        ? "bg-indigo-500 text-white"
                                        : "text-slate-600 group-hover:text-indigo-700"
                                )}>
                                    {day}
                                </span>
                                <div className="mt-1 space-y-0.5">
                                    {dayEvents.slice(0, 2).map((ev) => (
                                        <div
                                            key={ev.id}
                                            className={cn(
                                                "flex items-center justify-between rounded-lg px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
                                                colorClass(ev.color)
                                            )}
                                        >
                                            <span className="truncate">{ev.title}</span>
                                            {canEdit && !ev.is_task_event && (
                                                <button
                                                    onClick={() => handleDelete(ev.id)}
                                                    className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity shrink-0"
                                                >
                                                    <X size={9} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                        <p className="text-[9px] text-slate-400 pl-1">+{dayEvents.length - 2} more</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Trailing empty cells to fill last row */}
                    {(() => {
                        const totalCells = firstDow + daysInMonth;
                        const remainder = totalCells % 7;
                        const trailing = remainder === 0 ? 0 : 7 - remainder;
                        return [...Array(trailing)].map((_, i) => (
                            <div key={`trail-${i}`} className="min-h-[90px] border-r border-white/20 bg-white/10 p-2" />
                        ));
                    })()}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-100 inline-block" />
                    High priority tasks
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-100 inline-block" />
                    Medium priority tasks
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-100 inline-block" />
                    Low priority tasks
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-100 inline-block" />
                    Manual events
                </div>
            </div>

            {/* Add Event Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="glass-card glass-shadow rounded-[2rem] p-8 w-full max-w-md mx-4 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <Calendar className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold">New Event</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Title *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/60 dark:bg-white/10 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="Event title"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Date *</label>
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/60 dark:bg-white/10 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/60 dark:bg-white/10 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="Optional description"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Color</label>
                                <select
                                    value={form.color}
                                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/60 dark:bg-white/10 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                >
                                    <option value="indigo">Indigo</option>
                                    <option value="blue">Blue</option>
                                    <option value="emerald">Emerald</option>
                                    <option value="purple">Purple</option>
                                    <option value="amber">Amber</option>
                                    <option value="red">Red</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-foreground bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEvent}
                                disabled={saving || !form.title.trim() || !form.start_date}
                                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? "Saving..." : "Add Event"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
