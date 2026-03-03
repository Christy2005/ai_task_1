import { useState } from "react";
import { useTasks } from "@/context/TaskContext";

export function UploadMeetingAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const { addTask } = useTasks();

  const handleProcess = async () => {
    if (!file) return alert("Please select a file.");

    // ✅ Fix: send the JWT so the backend verifyToken middleware lets us through
    const token = localStorage.getItem("token");
    if (!token) return alert("You are not logged in.");

    setLoading(true);
    const formData = new FormData();
    formData.append("audio", file);

    try {
      console.log("📤 Sending audio to backend...");
      const res = await fetch("http://localhost:3000/api/ai/analyze-voice", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,  // ✅ Required — backend now enforces verifyToken
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
        const assignee: string = task?.assigned_to || task?.assignee || "Unknown";
        const dueDate: string = task?.due_date || task?.dueDate || "";
        const priority: string = task?.priority || "Medium";

        console.log(`  Task[${idx}]:`, { title, assignee, dueDate, priority });
        return { title, assignee, dueDate, priority };
      });

      setExtractedTasks(normalizedTasks);

      normalizedTasks.forEach((task) => {
        addTask({
          title: task.title,
          assignee: task.assignee,
          dueDate: task.dueDate,
          priority: (task.priority as import("@/context/TaskContext").TaskPriority) ?? "Medium",
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
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-bold">AI Meeting Transcriber</h2>
        <input
          type="file"
          accept="audio/*,video/mp4"
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {loading ? "🤖 AI is thinking..." : "Extract Tasks"}
          </button>
        )}
      </div>

      {transcript && (
        <div className="p-6 bg-blue-50 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-lg font-bold mb-3 text-blue-900">📝 Transcript</h3>
          <p className="text-gray-700 bg-white p-4 rounded-md">{transcript}</p>
        </div>
      )}

      {extractedTasks.length > 0 && (
        <div className="p-6 bg-green-50 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-lg font-bold mb-4 text-green-900">✅ Extracted Tasks ({extractedTasks.length})</h3>
          <div className="space-y-3">
            {extractedTasks.map((task, index) => (
              <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-green-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800">{task.title}</h4>
                    <p className="text-sm text-gray-600">👤 Assignee: {task.assignee}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${task.priority === "High"
                      ? "bg-red-100 text-red-800"
                      : task.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                      }`}
                  >
                    {task.priority}
                  </span>
                </div>
                {task.dueDate && (
                  <p className="text-sm text-gray-600">📅 Due: {task.dueDate}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}