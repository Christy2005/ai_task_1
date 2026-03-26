import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Download, Pencil, Save, Trash2 } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { generateMeetingPDF } from "@/utils/exportPdf";

function getToken() { return localStorage.getItem("token") ?? ""; }

interface EditableTask {
  title: string;
  assignee_name: string;
  due_date: string;
  priority: string;
  description: string;
  user_id: number | null;
  is_registered: boolean;
}

export function UploadMeetingAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>([]);
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("General Discussion");
  const [audioFilename, setAudioFilename] = useState("");
  const { role } = useAuth();

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  // ── STEP 1: Extract tasks (not saved yet) ──────────────────────────────────
  const handleExtract = async () => {
    if (!file) return alert("Please select a file.");

    setLoading(true);
    setSaved(false);
    setEditableTasks([]);
    setTranscript(null);

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch("http://localhost:3000/api/ai/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (res.status === 401 || errData?.code === "STALE_TOKEN") {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          window.location.href = "/login";
          return;
        }
        console.error("Extract error:", errData);
        alert(`Backend error (${res.status}). Check console.`);
        return;
      }

      const data = await res.json();
      setTranscript(data.transcript || null);
      setAudioFilename(data.audioFilename || file.name);

      const tasks: EditableTask[] = (data.tasks || []).map((t: any) => ({
        title: t.title || "",
        assignee_name: t.assignee_name || t.assignee || "",
        due_date: t.due_date || "",
        priority: t.priority || "Medium",
        description: t.description || "",
        user_id: t.user_id || null,
        is_registered: t.is_registered || false,
      }));

      setEditableTasks(tasks);

      if (tasks.length === 0) {
        alert("Processing complete. No tasks were extracted.");
      } else {
        triggerToast(`Extracted ${tasks.length} task${tasks.length === 1 ? "" : "s"}. Edit below, then save.`);
      }
    } catch (err: any) {
      console.error("Extract error:", err);
      alert(`Error: ${err?.message || "Check console."}`);
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Save edited tasks ──────────────────────────────────────────────
  const handleSave = async () => {
    if (editableTasks.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("http://localhost:3000/api/ai/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: meetingTitle,
          transcript,
          audioFilename,
          tasks: editableTasks.map((t) => ({
            title: t.title,
            assignee: t.assignee_name,
            dueDate: t.due_date,
            priority: t.priority,
            description: t.description,
          })),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Save error:", errorText);
        alert(`Save failed (${res.status}).`);
        return;
      }

      const data = await res.json();
      setSaved(true);
      triggerToast(`Saved ${data.tasks?.length || 0} tasks to meeting "${data.meeting?.title}".`);
      setFile(null);
    } catch (err: any) {
      console.error("Save error:", err);
      alert(`Error: ${err?.message || "Check console."}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Task editing helpers ───────────────────────────────────────────────────
  const updateTask = (index: number, field: keyof EditableTask, value: string) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const removeTask = (index: number) => {
    setEditableTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addTask = () => {
    setEditableTasks((prev) => [
      ...prev,
      { title: "", assignee_name: "", due_date: "", priority: "Medium", description: "", user_id: null, is_registered: false },
    ]);
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

        {/* Meeting title input */}
        <div>
          <label className="text-sm font-semibold text-slate-600 mb-1 block">Meeting Title</label>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-indigo-200 bg-white/60 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Faculty Board Meeting"
          />
        </div>

        {/* Drop Zone */}
        <label className="flex flex-col items-center justify-center w-full h-40 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer group">
          <svg className="h-10 w-10 text-indigo-300 group-hover:text-indigo-400 mb-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          <span className="text-sm font-semibold text-indigo-600">{file ? file.name : "Click to select audio file"}</span>
          <span className="text-xs text-slate-400 mt-1">MP3, WAV, MP4 supported</span>
          <input type="file" accept="audio/*,video/mp4" className="hidden" onChange={(e) => { e.target.files && setFile(e.target.files[0]); setSaved(false); }} />
        </label>

        {file && !saved && (
          <button
            onClick={handleExtract}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "AI is analysing..." : "Extract Tasks"}
          </button>
        )}
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="glass-card glass-shadow rounded-[2rem] p-8 border-l-4 border-indigo-400">
          <h3 className="text-lg font-bold mb-4 text-indigo-800">Transcript</h3>
          <p className="transcript-box transcript-text text-slate-700 bg-white/60 p-5 rounded-2xl leading-relaxed">
            {transcript}
          </p>
        </div>
      )}

      {/* Editable Tasks */}
      {editableTasks.length > 0 && !saved && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black px-1">
              Edit Tasks <span className="text-accent-indigo">({editableTasks.length})</span>
            </h3>
            <button
              onClick={addTask}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors"
            >
              + Add Task
            </button>
          </div>

          {editableTasks.map((task, idx) => (
            <div key={idx} className="glass-card p-6 rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Pencil size={12} />
                  Task {idx + 1}
                  {!task.is_registered && task.assignee_name && (
                    <span className="text-amber-600 font-semibold">(unregistered)</span>
                  )}
                </div>
                <button onClick={() => removeTask(idx)} className="text-rose-400 hover:text-rose-600 p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              <input
                type="text"
                value={task.title}
                onChange={(e) => updateTask(idx, "title", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/30 bg-white/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Task title"
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={task.assignee_name}
                  onChange={(e) => updateTask(idx, "assignee_name", e.target.value)}
                  className="px-3 py-2 rounded-xl border border-white/30 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Assignee"
                />
                <input
                  type="date"
                  value={task.due_date}
                  onChange={(e) => updateTask(idx, "due_date", e.target.value)}
                  className="px-3 py-2 rounded-xl border border-white/30 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(idx, "priority", e.target.value)}
                  className="px-3 py-2 rounded-xl border border-white/30 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <textarea
                value={task.description}
                onChange={(e) => updateTask(idx, "description", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/30 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={2}
                placeholder="Description"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-200/60 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Confirm & Save Tasks"}
          </button>
        </div>
      )}

      {/* Saved confirmation */}
      {saved && editableTasks.length > 0 && (
        <div className="glass-card glass-shadow rounded-[2rem] p-8 text-center border-2 border-emerald-200/40">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Save className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-700">Tasks saved successfully!</p>
          <p className="text-sm text-slate-500 mt-1">Tasks are now pending HOD approval before being assigned to faculty.</p>
        </div>
      )}

      {/* PDF Export */}
      {saved && editableTasks.length > 0 && (role === "admin" || role === "hod") && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => generateMeetingPDF(meetingTitle, editableTasks)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black hover:bg-white/20 transition-all shadow-lg"
          >
            <Download size={17} className="text-indigo-400" />
            Download Minutes (PDF)
          </button>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <Toast message={toastMsg} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}
