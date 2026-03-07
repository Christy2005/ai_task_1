import { useState } from "react";
import { useTasks, type TaskPriority } from "@/context/TaskContext";

function toTaskPriority(val: string): TaskPriority {
  if (val === "High" || val === "Low") return val;
  return "Medium";
}

export function UploadMeetingAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const { addTask } = useTasks();

  const handleProcess = async () => {
    if (!file) return alert("Please select a file.");

    setLoading(true);
    const formData = new FormData();
    formData.append("audio", file);

    try {
      console.log("📤 Sending audio to backend...");
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/ai/analyze-voice", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      console.log("📥 Response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ HTTP Error Response:", errorText);
        alert(`Backend error (${res.status}). Check console for details.`);
        return;
      }

      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON response:", parseErr);
        alert("Backend returned an unreadable response.");
        return;
      }

      console.log("✅ Raw response data:", data);

      const rawTranscript: string = typeof data.transcript === "string" ? data.transcript : "";
      const rawTasks: any[] = Array.isArray(data.tasks) ? data.tasks : [];

      console.log(`📋 Transcript length: ${rawTranscript.length} chars`);
      console.log(`🗂️ Tasks received: ${rawTasks.length}`);

      setTranscript(rawTranscript || null);

      const normalizedTasks = rawTasks.map((task: any, idx: number) => {
        const title: string = task?.title || "Untitled Task";
        const assignee: string = task?.assignee || task?.assigned_to || "Unknown";
        const dueDate: string = task?.dueDate || task?.due_date || "";
        const priority: TaskPriority = toTaskPriority(task?.priority || "Medium");

        console.log(`  Task[${idx}]:`, { title, assignee, dueDate, priority });

        return { title, assignee, dueDate, priority };
      });

      setExtractedTasks(normalizedTasks);

      normalizedTasks.forEach((task) => {
        addTask({
          title: task.title,
          assignee: task.assignee,
          dueDate: task.dueDate,
          priority: task.priority,
          status: "Pending",
          category: "Approval",
          description: rawTranscript ? `Extracted from: "${rawTranscript}"` : "Extracted from audio",
        });
      });

      if (normalizedTasks.length === 0) {
        alert("Processing complete. No tasks were extracted from this audio.");
      } else {
        alert(`Success! Extracted ${normalizedTasks.length} task${normalizedTasks.length === 1 ? "" : "s"}.`);
      }

      setFile(null);
    } catch (err: any) {
      console.error("❌ Frontend Error:", err);
      alert(`Unexpected error: ${err?.message || "Check the browser console for details."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">
          Upload <span className="text-gradient-indigo">Audio</span>
        </h1>
        <p className="text-slate-500 mt-1">Transcribe meeting recordings and extract tasks with AI.</p>
      </div>

      {/* Upload Card */}
      <div className="glass-card glass-shadow rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">AI Meeting Transcriber</h2>
        </div>

        {/* Drop Zone */}
        <label className="flex flex-col items-center justify-center w-full h-40 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer group">
          <svg className="h-10 w-10 text-indigo-300 group-hover:text-indigo-400 mb-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          <span className="text-sm font-semibold text-indigo-600">{file ? `📎 ${file.name}` : "Click to select audio file"}</span>
          <span className="text-xs text-slate-400 mt-1">MP3, WAV, MP4 supported</span>
          <input type="file" accept="audio/*,video/mp4" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
        </label>

        {file && (
          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "🤖 AI is analysing…" : "✨ Extract Tasks"}
          </button>
        )}
      </div>

      {/* Transcript Result */}
      {transcript && (
        <div className="glass-card glass-shadow rounded-[2rem] p-8 border-l-4 border-indigo-400">
          <h3 className="text-lg font-bold mb-4 text-indigo-800">📝 Transcript</h3>
          <p className="transcript-box transcript-text text-slate-700 bg-white/60 p-5 rounded-2xl leading-relaxed">
            {transcript}
          </p>
        </div>
      )}

      {/* Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <div className="glass-card glass-shadow rounded-[2rem] p-8">
          <h3 className="text-lg font-bold mb-5 text-emerald-800">✅ Extracted Tasks ({extractedTasks.length})</h3>
          <div className="space-y-3">
            {extractedTasks.map((task, index) => (
              <div
                key={index}
                className="task-card bg-white/60 p-5 rounded-2xl border border-emerald-100 flex justify-between items-start gap-4"
              >
                <div>
                  <h4 className="task-title font-semibold text-slate-800">{task.title}</h4>
                  <p className="text-sm text-slate-500 mt-0.5">👤 {task.assignee}</p>
                  {task.dueDate && <p className="text-xs text-slate-400 mt-1">📅 {task.dueDate}</p>}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${task.priority === "High" ? "bg-red-100 text-red-700" : task.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}