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

    setLoading(true);
    const formData = new FormData();
    formData.append("audio", file);

    try {
      console.log("📤 Sending audio to backend...");
      const res = await fetch("http://localhost:3000/api/ai/analyze-voice", {
        method: "POST",
        body: formData,
      });

      console.log("📥 Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ HTTP Error Response:", errorText);
        throw new Error(`Processing failed with status ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("✅ Response data:", data);

      // ✅ Loop through the extracted tasks (handles multiple people/tasks)
      if (!data.extracted || !Array.isArray(data.extracted)) {
        console.error("❌ Invalid response format:", data);
        throw new Error("Invalid response format from backend");
      }

      // Store transcript and tasks for display
      setTranscript(data.transcript);
      setExtractedTasks(data.extracted);

      data.extracted.forEach((task: any) => {
        addTask({
          title: task.title || "Untitled Task",
          assignee: task.assignee || "Unknown",
          dueDate: task.dueDate || "",
          priority: task.priority || "Medium",
          status: "Pending",
          category: "Approval",
          description: `Extracted from: "${data.transcript}"`,
        });
      });

      alert(`Success! Extracted ${data.extracted.length} tasks.`);
      setFile(null);
    } catch (err: any) {
      console.error("❌ Frontend Error:", err);
      alert(`Error: ${err.message || "Error processing audio. Check browser console."}`);
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

      {/* Display Transcript */}
      {transcript && (
        <div className="p-6 bg-blue-50 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-lg font-bold mb-3 text-blue-900">📝 Transcript</h3>
          <p className="text-gray-700 bg-white p-4 rounded-md">{transcript}</p>
        </div>
      )}

      {/* Display Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <div className="p-6 bg-green-50 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-lg font-bold mb-4 text-green-900">✅ Extracted Tasks ({extractedTasks.length})</h3>
          <div className="space-y-3">
            {extractedTasks.map((task, index) => (
              <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-green-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800">{task.title || "Untitled Task"}</h4>
                    <p className="text-sm text-gray-600">👤 Assignee: {task.assignee || "Unknown"}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.priority === "High" ? "bg-red-100 text-red-800" :
                    task.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {task.priority || "Medium"}
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