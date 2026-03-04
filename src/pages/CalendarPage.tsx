import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export function CalendarPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        My <span className="text-gradient-indigo">Calendar</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Schedule and manage meetings and events.</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:scale-105 transition-all">
                    <Plus className="h-4 w-4" />
                    Add Event
                </button>
            </div>

            <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                {/* Month header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/40">
                    <h2 className="font-bold text-slate-800 text-base">January 2026</h2>
                    <div className="flex items-center gap-2">
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-indigo-600 transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-indigo-600 transition-all">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 border-b border-white/30 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="py-3">{day}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 text-sm">
                    {/* Leading empty cells */}
                    {[...Array(5)].map((_, i) => (
                        <div key={`empty-start-${i}`} className="min-h-[90px] border-b border-r border-white/20 bg-white/10 p-2" />
                    ))}

                    {/* Date cells */}
                    {[...Array(26)].map((_, i) => (
                        <div
                            key={i}
                            className="group relative min-h-[90px] border-b border-r border-white/20 p-2 hover:bg-white/40 transition-colors"
                        >
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i === 12
                                    ? "bg-indigo-500 text-white"
                                    : "text-slate-600 group-hover:text-indigo-700"
                                }`}>
                                {i + 1}
                            </span>
                            {i === 12 && (
                                <div className="mt-1.5 rounded-xl bg-indigo-100 px-2 py-1 text-xs text-indigo-700">
                                    <span className="font-bold block">2:00 PM</span>
                                    Dept Meeting
                                </div>
                            )}
                            {i === 24 && (
                                <div className="mt-1.5 rounded-xl bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                                    <span className="font-bold block">10:00 AM</span>
                                    Guest Lecture
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Trailing empty cells */}
                    {[...Array(4)].map((_, i) => (
                        <div key={`empty-end-${i}`} className="min-h-[90px] border-r border-white/20 bg-white/10 p-2" />
                    ))}
                </div>
            </div>
        </div>
    );
}
