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
        fullName: "",
        email: "",
        role: "",
        phone: "",
        location: ""
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

    const handleChange = (e) => {
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative -mt-12 mb-6 flex items-end justify-between">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-background p-1">
                                <div className="h-full w-full rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                    <User className="h-12 w-12 text-slate-400" />
                                </div>
                            </div>
                            <button className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={!isEditing}
                                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isEditing}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
                                Save Changes
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Personal Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            name="fullName"
                                            type="text"
                                            value={profile.fullName || ""}
                                            onChange={handleChange}
                                            className="flex-1 bg-transparent text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            name="email"
                                            type="email"
                                            value={profile.email || ""}
                                            onChange={handleChange}
                                            className="flex-1 bg-transparent text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Detailed Role</label>
                                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-muted/50">
                                        <input
                                            name="role"
                                            type="text"
                                            value={profile.role || ""}
                                            onChange={handleChange}
                                            className="flex-1 bg-transparent text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Contact Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            name="phone"
                                            type="tel"
                                            value={profile.phone || ""}
                                            onChange={handleChange}
                                            className="flex-1 bg-transparent text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Office Location</label>
                                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            name="location"
                                            type="text"
                                            value={profile.location || ""}
                                            onChange={handleChange}
                                            className="flex-1 bg-transparent text-sm focus:outline-none"
                                        />
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
