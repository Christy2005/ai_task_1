import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Upload,
    FileText,
    CheckSquare,
    ClipboardList,
    Bell,
    Calendar,
    User,
    X,
    LogOut,
    Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Upload Audio", href: "/upload-audio", icon: Upload },
    { name: "Meeting Minutes", href: "/meeting-minutes", icon: FileText },
    { name: "Task Approval", href: "/task-approval", icon: CheckSquare },
    { name: "Faculty Tasks", href: "/faculty-tasks", icon: ClipboardList },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Profile", href: "/profile", icon: User },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Get initials from email
    const initials = user
        ? user.split("@")[0].substring(0, 2).toUpperCase()
        : "AD";

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Floating Sidebar Pod */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col",
                    "w-72 m-4 h-[calc(100vh-2rem)]",
                    "glass-card glass-shadow-lg rounded-[2rem]",
                    "transition-all duration-300 ease-in-out",
                    "lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl rotate-12 shadow-lg shadow-indigo-300/40 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-white -rotate-12" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-gradient-indigo">
                            SmartTask
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden rounded-xl p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            end={item.href === "/"}
                            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200",
                                    isActive
                                        ? "glass-nav-active text-indigo-700 shadow-sm"
                                        : "text-slate-400 hover:bg-[#EDE9FE] hover:text-[#3B0764]"
                                )
                            }
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* User capsule + Logout */}
                <div className="px-4 pb-6 pt-4 space-y-2 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold text-rose-400 hover:bg-rose-50/80 hover:text-rose-600 transition-all duration-200"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>

                    <div className="bg-white/40 border border-white/30 rounded-[1.5rem] p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-black shadow-md shadow-indigo-200/60 shrink-0">
                            {initials}
                        </div>
                        <div className="overflow-hidden min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{user ?? "admin@gmail.com"}</p>
                            <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-black">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
