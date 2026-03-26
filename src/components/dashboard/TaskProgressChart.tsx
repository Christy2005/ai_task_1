import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const POLL_INTERVAL_MS = 30_000; // re-fetch every 30 s

/* ─── Types ──────────────────────────── */
interface FacultyStat {
    name: string;
    completed: number;
    pending: number;
}

interface Props {
    /** Increment this from the parent to trigger an immediate re-fetch. */
    refreshTrigger?: number;
}

function getToken() {
    return localStorage.getItem("token") ?? "";
}

/* ─── Custom Tooltip ─────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 rounded-2xl px-4 py-3 shadow-xl border border-white/50">
            <p className="text-[#1E1B4B] font-black text-sm mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.name} className="text-xs font-bold" style={{ color: entry.fill }}>
                    {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}: {entry.value}
                </p>
            ))}
        </div>
    );
};

/* ═══════════════════════════════════════
   Task Progress Chart
   • Polls /api/admin/task-stats every 30 s
   • Accepts refreshTrigger prop for on-demand re-fetch
   • Manual refresh button in header
═══════════════════════════════════════ */
const TaskProgressChart = ({ refreshTrigger = 0 }: Props) => {
    const [data, setData] = useState<FacultyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStats = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const response = await fetch("http://localhost:3000/api/admin/task-stats", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const result = await response.json();
            if (Array.isArray(result)) {
                setData(result);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch task stats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load + polling
    useEffect(() => {
        fetchStats();
        timerRef.current = setInterval(() => fetchStats(), POLL_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchStats]);

    // Re-fetch when parent signals a change (e.g. after task status update)
    useEffect(() => {
        if (refreshTrigger > 0) fetchStats();
    }, [refreshTrigger, fetchStats]);

    return (
        <div className="glass-card glass-shadow rounded-[2rem] p-8 w-full overflow-hidden">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                        Institutional{" "}
                        <span className="text-gradient-indigo">Productivity</span>
                    </h3>
                    <p className="text-slate-400 text-sm mt-0.5 font-medium">
                        Completed vs. Pending tasks by Faculty
                        {lastUpdated && (
                            <span className="ml-2 text-slate-500 text-xs">
                                · updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {/* Legend */}
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Completed
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F472B6]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Pending
                            </span>
                        </div>
                    </div>
                    {/* Manual refresh */}
                    <button
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        title="Refresh now"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Chart body */}
            {loading ? (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
                    Loading chart data…
                </div>
            ) : data.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
                    No task data available yet. Assign tasks to faculty to see analytics.
                </div>
            ) : (
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="rgba(255,255,255,0.07)"
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94A3B8", fontWeight: 700, fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#64748B", fontSize: 10 }}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                            {/* Completed — indigo */}
                            <Bar
                                dataKey="completed"
                                stackId="a"
                                fill="#6366F1"
                                radius={[0, 0, 0, 0]}
                                barSize={32}
                            />
                            {/* Pending — pink, rounded top */}
                            <Bar
                                dataKey="pending"
                                stackId="a"
                                fill="#F472B6"
                                radius={[8, 8, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default TaskProgressChart;
