import { useEffect, useState } from "react";
import { User, Mail, Phone, Building2, FileText, Camera, Save, X, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: "admin" | "faculty";
    bio: string | null;
    department: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
}

export function Profile() {
    const { user: authUser, logout } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [form, setForm] = useState({ name: "", bio: "", department: "", phone: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // ── Fetch real profile from /api/auth/me ─────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login", { replace: true }); return; }

        fetch("http://localhost:3000/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load profile");
                return r.json();
            })
            .then((data: UserProfile) => {
                setProfile(data);
                setForm({
                    name: data.name ?? "",
                    bio: data.bio ?? "",
                    department: data.department ?? "",
                    phone: data.phone ?? "",
                });
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [navigate]);

    // ── Save via PATCH /api/auth/me ───────────────────────────────────────────────
    const handleSave = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:3000/api/auth/me", {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");
            setProfile((p) => p ? { ...p, ...data } : p);
            setIsEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const initials = (profile?.name ?? authUser?.email ?? "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                    ✅ Profile updated successfully
                </div>
            )}

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="px-8 pb-8">
                    {/* Avatar row */}
                    <div className="relative -mt-12 mb-6 flex items-end justify-between">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-background p-1 ring-4 ring-background shadow">
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.name}
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 shadow-sm">
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex items-center gap-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        <X className="h-4 w-4" /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Name + role badge */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold">{profile?.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                profile?.role === "admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                            )}>
                                <Shield className="h-3 w-3" />
                                {profile?.role?.charAt(0).toUpperCase()}{profile?.role?.slice(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Member since {profile?.created_at ? new Date(profile.created_at).getFullYear() : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Form fields */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Left column */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</h3>

                            <Field icon={<User className="h-4 w-4 text-muted-foreground" />} label="Full Name">
                                {isEditing ? (
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        className="flex-1 bg-transparent text-sm focus:outline-none"
                                    />
                                ) : (
                                    <span className="text-sm">{profile?.name || "—"}</span>
                                )}
                            </Field>

                            <Field icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email">
                                <span className="text-sm text-muted-foreground">{profile?.email}</span>
                            </Field>

                            <Field icon={<Building2 className="h-4 w-4 text-muted-foreground" />} label="Department">
                                {isEditing ? (
                                    <input
                                        value={form.department}
                                        onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                                        placeholder="e.g. Computer Science"
                                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
                                    />
                                ) : (
                                    <span className="text-sm">{profile?.department || "Not assigned"}</span>
                                )}
                            </Field>
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact & Bio</h3>

                            <Field icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Phone">
                                {isEditing ? (
                                    <input
                                        value={form.phone}
                                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                        placeholder="+91 XXXXX XXXXX"
                                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
                                    />
                                ) : (
                                    <span className="text-sm">{profile?.phone || "N/A"}</span>
                                )}
                            </Field>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Bio
                                </label>
                                {isEditing ? (
                                    <textarea
                                        value={form.bio}
                                        onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                                        rows={4}
                                        placeholder="Tell us about yourself..."
                                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {profile?.bio || "No bio added yet."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Logout */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                            <LogOut className="h-4 w-4" /> Sign out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Helper sub-component ────────────────────────────────────────────────────────
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 min-h-[38px]">
                {children}
            </div>
        </div>
    );
}
