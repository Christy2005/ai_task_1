import { useState, useEffect } from "react";
import { FileText, Download, Eye, X } from "lucide-react";
import { generateMeetingPDF } from "@/utils/exportPdf";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface Meeting {
    id: string;
    title: string;
    transcript: string | null;
    audio_filename: string | null;
    status: string;
    created_at: string;
    created_by_name: string | null;
    task_count: string;
}

interface MeetingDetail {
    meeting: Meeting;
    tasks: Array<{
        id: string;
        title: string;
        assigned_to_name: string | null;
        due_date: string | null;
        priority: string;
        approval_status: string;
    }>;
}

export function MeetingMinutes() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<MeetingDetail | null>(null);

    useEffect(() => {
        fetch("http://localhost:3000/api/meetings", {
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then((r) => r.json())
            .then((data) => setMeetings(data.meetings || []))
            .catch((err) => console.error("Failed to load meetings:", err))
            .finally(() => setLoading(false));
    }, []);

    const viewDetail = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/meetings/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            setDetail(data);
        } catch (err) {
            console.error("Failed to load meeting detail:", err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                    Meeting <span className="text-gradient-indigo">Minutes</span>
                </h1>
                <p className="text-muted-foreground mt-1">Access and manage generated minutes and transcripts.</p>
            </div>

            {loading ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                    <p className="text-muted-foreground font-semibold">Loading meetings...</p>
                </div>
            ) : meetings.length === 0 ? (
                <div className="glass-card glass-shadow rounded-[2rem] p-12 text-center">
                    <p className="text-muted-foreground font-semibold">No meetings recorded yet.</p>
                </div>
            ) : (
                <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/40">
                                <tr>
                                    <th className="px-7 py-4">Meeting Title</th>
                                    <th className="px-7 py-4">Date</th>
                                    <th className="px-7 py-4">Tasks</th>
                                    <th className="px-7 py-4">Status</th>
                                    <th className="px-7 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/30">
                                {meetings.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/40 transition-colors">
                                        <td className="px-7 py-4 font-semibold text-foreground flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            {item.title}
                                        </td>
                                        <td className="px-7 py-4 text-muted-foreground">{formatDate(item.created_at)}</td>
                                        <td className="px-7 py-4 text-muted-foreground">{item.task_count} tasks</td>
                                        <td className="px-7 py-4">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-700">
                                                {item.status || "Processed"}
                                            </span>
                                        </td>
                                        <td className="px-7 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => viewDetail(item.id)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => generateMeetingPDF(item.title, [])}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all"
                                                    title="Download"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Meeting Detail Modal */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetail(null)}>
                    <div className="glass-card glass-shadow rounded-[2rem] p-8 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-foreground">{detail.meeting.title}</h2>
                            <button onClick={() => setDetail(null)} className="p-2 hover:bg-white/60 rounded-xl">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {detail.meeting.transcript && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Transcript</h3>
                                <p className="text-sm text-slate-700 bg-white/60 p-5 rounded-2xl leading-relaxed max-h-48 overflow-y-auto">
                                    {detail.meeting.transcript}
                                </p>
                            </div>
                        )}

                        {detail.tasks.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Linked Tasks ({detail.tasks.length})
                                </h3>
                                <div className="space-y-2">
                                    {detail.tasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/30">
                                            <div>
                                                <p className="font-semibold text-sm">{task.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {task.assigned_to_name || "Unassigned"} &middot; {task.due_date || "No deadline"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    task.approval_status === "approved" ? "bg-emerald-100 text-emerald-700"
                                                    : task.approval_status === "rejected" ? "bg-rose-100 text-rose-700"
                                                    : "bg-amber-100 text-amber-700"
                                                }`}>
                                                    {task.approval_status}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    task.priority === "High" ? "bg-red-100 text-red-700"
                                                    : task.priority === "Low" ? "bg-blue-100 text-blue-700"
                                                    : "bg-indigo-100 text-indigo-700"
                                                }`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
