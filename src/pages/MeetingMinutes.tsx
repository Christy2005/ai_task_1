import { useEffect, useState } from "react";

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  host: string;
  summary: string;
}

export function MeetingMinutes() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // For delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  /* =============================
     FETCH MEETINGS
  ============================= */
  const fetchMeetings = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/meetings", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setMeetings(data);
      } else {
        setMeetings([]);
      }
    } catch (error) {
      console.error("❌ Error fetching meetings:", error);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  /* =============================
     DELETE MEETING
  ============================= */
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(
        `http://localhost:3000/api/meetings/${deleteId}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Delete failed:", errorText);
        return;
      }

      // Close modal
      setDeleteId(null);

      // Refresh list
      fetchMeetings();
    } catch (err) {
      console.error("❌ Error deleting meeting:", err);
    }
  };

  /* =============================
     UI
  ============================= */
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">
        Meeting <span className="text-indigo-500">Minutes</span>
      </h1>

      {meetings.length === 0 && (
        <p className="text-gray-500">No meetings found</p>
      )}

      {meetings.map((m) => (
        <div key={m.id} className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold">{m.title}</h2>
              <p className="text-sm text-gray-500">
                {m.meeting_date} • {m.host}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={() =>
                  setOpenId(openId === m.id ? null : m.id)
                }
                className="text-indigo-500"
              >
                {openId === m.id ? "Hide" : "View"}
              </button>

              <button
                onClick={() => setDeleteId(m.id)}
                className="text-red-500"
              >
                Delete
              </button>
            </div>
          </div>

          {openId === m.id && (
            <div className="mt-3">
              <p className="text-gray-700 whitespace-pre-line">
                {m.summary}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* =============================
          DELETE CONFIRMATION MODAL
      ============================= */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded shadow w-80">
            <h2 className="text-lg font-bold mb-4">
              Confirm Delete
            </h2>

            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this meeting minutes?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}