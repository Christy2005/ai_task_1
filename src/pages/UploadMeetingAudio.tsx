import { useState } from "react";
import { useTasks, type TaskPriority } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { Download } from "lucide-react";
import ExtractedTaskList from "@/components/ai/ExtractedTaskList";
import { Toast } from "@/components/ui/Toast";
import { generateMeetingPDF } from "@/utils/exportPdf";

interface RawTask {
  title?: string;
  assignee?: string;
  assigned_to?: string;
  dueDate?: string;
  due_date?: string;
  priority?: string;
}

interface ExtractedTask {
  title: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
}

interface ApiResponse {
  transcript?: string;
  tasks?: RawTask[];
}

function toTaskPriority(val: string): TaskPriority {
  if (val === "High" || val === "Low") return val;
  return "Medium";
}

export function UploadMeetingAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showToast, setShowToast] = useState(false);

  // ✅ NEW STATES
  const [title, setTitle] = useState("");
  const [host, setHost] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  const { addTask } = useTasks();
  const { role } = useAuth();

  const meetingTitle = title || "General Discussion";

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleProcess = async () => {
    if (!file) return alert("Please select a file.");

    // ✅ VALIDATION
    if (!title || !host || !meetingDate) {
      alert("Please fill all meeting details");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("title", title);
    formData.append("host", host);
    formData.append("meeting_date", meetingDate);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3000/api/ai/analyze-voice", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(errorText);
        alert("Backend error");
        return;
      }

      const data: ApiResponse = await res.json();

      const rawTranscript = data.transcript || "";
      const rawTasks = data.tasks || [];

      setTranscript(rawTranscript || null);

      const normalizedTasks = rawTasks.map((task) => ({
        title: task.title || "Untitled Task",
        assignee: task.assignee || task.assigned_to || "Unknown",
        dueDate: task.dueDate || task.due_date || "",
        priority: toTaskPriority(task.priority || "Medium"),
      }));

      setExtractedTasks(normalizedTasks);

      normalizedTasks.forEach((task) => {
        addTask({
          title: task.title,
          assignee: task.assignee,
          dueDate: task.dueDate,
          priority: task.priority,
          status: "Pending",
          category: "Approval",
          description: rawTranscript || "Extracted from audio",
        });
      });

      if (normalizedTasks.length > 0) {
        triggerToast();
      }

      // ✅ RESET FORM
      setFile(null);
      setTitle("");
      setHost("");
      setMeetingDate("");
    } catch (err: Error | unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black">
        Upload <span className="text-indigo-500">Audio</span>
      </h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        
        {/* ✅ INPUT FIELDS */}
        <input
          type="text"
          placeholder="Meeting Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <input
          type="text"
          placeholder="Host Name"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <input
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        {/* FILE UPLOAD */}
        <input
          type="file"
          accept="audio/*,video/mp4"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              console.log("Selected file:", e.target.files[0]);
              setFile(e.target.files[0]);
            } else {
              alert("File not selected properly");
            }
          }}
          className="w-full p-3 border rounded-lg"
        />


        <button
          onClick={handleProcess}
          disabled={loading}
          className="bg-indigo-500 text-white px-6 py-2 rounded"
        >
          {loading ? "Processing..." : "Extract Tasks"}
        </button>
      </div>

      {/* TRANSCRIPT */}
      {transcript && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold">Transcript</h3>
          <p>{transcript}</p>
        </div>
      )}

      {/* TASKS */}
      <ExtractedTaskList tasks={extractedTasks} />

      {/* PDF */}
      {extractedTasks.length > 0 && role === "admin" && (
        <button
          onClick={() =>
            generateMeetingPDF(meetingTitle, extractedTasks)
          }
        >
          <Download size={16} /> Download PDF
        </button>
      )}

      {showToast && (
        <Toast
          message={`Saved ${extractedTasks.length} tasks`}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}