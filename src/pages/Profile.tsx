import { User, Mail, Phone, MapPin, Camera } from "lucide-react";
import React from "react";

interface UserProfile {
    fullName: string;
    email: string;
    role: string;
    phone: string;
    location: string;
}

export function Profile() {
    const [profile, setProfile] = React.useState<UserProfile>({
        fullName: "", email: "", role: "", phone: "", location: ""
    });
    const [originalProfile, setOriginalProfile] = React.useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        fetch('/api/profile')
            .then(res => res.json())
            .then(data => {
                if (data.message === 'success' && data.data) {
                    setProfile(data.data);
                    setOriginalProfile(data.data);
                }
            })
            .catch(err => console.error('Error fetching profile:', err));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
        setIsEditing(true);
    };

    const handleSave = () => {
        fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        })
            .then(res => res.json())
            .then(data => {
                if (data.message === 'success') {
                    setOriginalProfile(profile);
                    setIsEditing(false);
                    alert("Profile updated successfully!");
                } else {
                    alert("Error updating profile");
                }
            })
            .catch(err => console.error('Error updating profile:', err));
    };

    const handleCancel = () => {
        if (originalProfile) {
            setProfile(originalProfile);
            setIsEditing(false);
        }
    };

    const initials = profile.fullName
        ? profile.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
        : "AD";

    const inputClass = "flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium";
    const fieldWrap = "flex items-center gap-3 bg-white/60 border border-white/50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                    My <span className="text-gradient-indigo">Profile</span>
                </h1>
                <p className="text-slate-500 mt-1">Manage your personal information and preferences.</p>
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
                            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-300/40 border-4 border-white">
                                {initials}
                            </div>
                            <button className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg hover:scale-110 transition-all">
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex gap-3 mb-1">
                            <button
                                onClick={handleCancel}
                                disabled={!isEditing}
                                className="px-5 py-2.5 rounded-2xl bg-white/60 border border-white/50 text-sm font-semibold text-slate-600 hover:bg-white/80 transition-all disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isEditing}
                                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Form grid */}
                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="space-y-5">
                            <h3 className="font-bold text-slate-800">Personal Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Full Name</label>
                                    <div className={fieldWrap}>
                                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input name="fullName" type="text" value={profile.fullName || ""} onChange={handleChange} className={inputClass} placeholder="Your name" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Email Address</label>
                                    <div className={fieldWrap}>
                                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input name="email" type="email" value={profile.email || ""} onChange={handleChange} className={inputClass} placeholder="email@university.edu" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Role</label>
                                    <div className={fieldWrap}>
                                        <input name="role" type="text" value={profile.role || ""} onChange={handleChange} className={inputClass} placeholder="e.g. Department Head" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <h3 className="font-bold text-slate-800">Contact Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Phone Number</label>
                                    <div className={fieldWrap}>
                                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input name="phone" type="tel" value={profile.phone || ""} onChange={handleChange} className={inputClass} placeholder="+1 (555) 000-0000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Office Location</label>
                                    <div className={fieldWrap}>
                                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input name="location" type="text" value={profile.location || ""} onChange={handleChange} className={inputClass} placeholder="Room 204, Science Block" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
