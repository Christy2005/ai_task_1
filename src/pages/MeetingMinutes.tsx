import { FileText, Download, Eye, MoreHorizontal } from "lucide-react";

const minutes = [
    {
        id: 1,
        title: "Faculty Board Meeting",
        date: "Jan 28, 2026",
        duration: "45 min",
        attendees: 12,
        status: "Processed",
    },
    {
        id: 2,
        title: "Curriculum Review",
        date: "Jan 25, 2026",
        duration: "1h 20m",
        attendees: 8,
        status: "Processed",
    },
    {
        id: 3,
        title: "Research Grant Discussion",
        date: "Jan 22, 2026",
        duration: "30 min",
        attendees: 4,
        status: "Processing",
    },
];

export function MeetingMinutes() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                    Meeting <span className="text-gradient-indigo">Minutes</span>
                </h1>
                <p className="text-slate-500 mt-1">Access and manage generated minutes and transcripts.</p>
            </div>

            <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/40">
                            <tr>
                                <th className="px-7 py-4">Meeting Title</th>
                                <th className="px-7 py-4">Date</th>
                                <th className="px-7 py-4">Duration</th>
                                <th className="px-7 py-4">Status</th>
                                <th className="px-7 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/30">
                            {minutes.map((item) => (
                                <tr key={item.id} className="hover:bg-white/40 transition-colors">
                                    <td className="px-7 py-4 font-semibold text-slate-800 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        {item.title}
                                    </td>
                                    <td className="px-7 py-4 text-slate-500">{item.date}</td>
                                    <td className="px-7 py-4 text-slate-500">{item.duration}</td>
                                    <td className="px-7 py-4">
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${item.status === "Processed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-7 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all" title="View"><Eye className="h-4 w-4" /></button>
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all" title="Download"><Download className="h-4 w-4" /></button>
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all"><MoreHorizontal className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
