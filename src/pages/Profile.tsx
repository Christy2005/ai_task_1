import { useState, useEffect } from "react";
import { User, Mail, Phone, Building2, FileText, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function getToken() { return localStorage.getItem("token") ?? ""; }
const API = "http://localhost:3000";

const DEPARTMENTS = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication Engineering",
  "Electrical and Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biomedical Engineering",
  "Aerospace Engineering",
  "Artificial Intelligence and Data Science",
  "Cyber Security",
  "Robotics and Automation",
  "Other",
];

interface ProfileData {
  fullName: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  bio: string;
}

export function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "", email: "", role: "", department: "", phone: "", bio: "",
  });
  const [original, setOriginal] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    fetch(`${API}/api/profile`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message === "success" && data.data) {
          setProfile(data.data);
          setOriginal(data.data);
        }
      })
      .catch((err) => console.error("Error fetching profile:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          department: profile.department,
          phone: profile.phone,
          bio: profile.bio,
        }),
      });
      const data = await res.json();
      if (data.message === "success") {
        setOriginal(data.data);
        setProfile(data.data);
        setIsEditing(false);
        setToast("Profile updated successfully!");
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast("Error updating profile");
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast("Error updating profile");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (original) {
      setProfile(original);
      setIsEditing(false);
    }
  };

  const initials = (profile.fullName || user?.name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  const roleBadge = {
    admin: "bg-red-100 text-red-700",
    hod: "bg-purple-100 text-purple-700",
    faculty: "bg-blue-100 text-blue-700",
  }[profile.role] || "bg-gray-100 text-gray-700";

  const inputClass =
    "flex-1 bg-transparent text-sm text-foreground placeholder-slate-400 focus:outline-none font-medium";
  const fieldWrap =
    "flex items-center gap-3 bg-white/60 dark:bg-white/10 border border-white/50 dark:border-white/20 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-foreground tracking-tight">
          My <span className="text-gradient-indigo">Profile</span>
        </h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="glass-card glass-shadow rounded-[2rem] overflow-hidden">
        {/* Cover banner */}
        <div className="h-36 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-400 relative">
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)" }}
          />
        </div>

        <div className="px-8 pb-8">
          {/* Avatar row */}
          <div className="relative -mt-14 mb-8 flex items-end justify-between">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-300/40 border-4 border-white dark:border-gray-800">
                {initials}
              </div>
              <button className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg hover:scale-110 transition-all">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${roleBadge}`}>
                {profile.role}
              </span>
              <button
                onClick={handleCancel}
                disabled={!isEditing}
                className="px-5 py-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-white/50 dark:border-white/20 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isEditing || saving}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-5">
              <h3 className="font-bold text-foreground">Personal Information</h3>
              <div className="space-y-3">
                {/* Name — auto-filled, read-only */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Full Name
                  </label>
                  <div className={`${fieldWrap} opacity-70`}>
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={profile.fullName || ""}
                      readOnly
                      className={`${inputClass} cursor-not-allowed`}
                    />
                  </div>
                </div>

                {/* Email — auto-filled, read-only */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Email Address
                  </label>
                  <div className={`${fieldWrap} opacity-70`}>
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={profile.email || ""}
                      readOnly
                      className={`${inputClass} cursor-not-allowed`}
                    />
                  </div>
                </div>

                {/* Department — dropdown */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Department
                  </label>
                  <div className={fieldWrap}>
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <select
                      name="department"
                      value={profile.department || ""}
                      onChange={handleChange}
                      className={`${inputClass} bg-transparent`}
                    >
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="font-bold text-foreground">Contact & Bio</h3>
              <div className="space-y-3">
                {/* Phone */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Phone Number
                  </label>
                  <div className={fieldWrap}>
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      name="phone"
                      type="tel"
                      value={profile.phone || ""}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Bio
                  </label>
                  <div className="bg-white/60 dark:bg-white/10 border border-white/50 dark:border-white/20 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                    <div className="flex gap-3">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <textarea
                        name="bio"
                        value={profile.bio || ""}
                        onChange={handleChange}
                        rows={3}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder-slate-400 focus:outline-none font-medium resize-none"
                        placeholder="Tell us a little about yourself..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-xl animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
}
