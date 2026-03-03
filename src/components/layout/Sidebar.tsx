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
    Shield,
    UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    // Nav items filtered by role
    const allNavItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "faculty"] },
        { name: "Upload Audio", href: "/upload-audio", icon: Upload, roles: ["admin"] },
        { name: "Meeting Minutes", href: "/meeting-minutes", icon: FileText, roles: ["admin", "faculty"] },
        { name: "Task Approval", href: "/task-approval", icon: CheckSquare, roles: ["admin"] },
        { name: "Faculty Management", href: "/faculty-management", icon: UserCheck, roles: ["admin"] },
        { name: "My Tasks", href: "/faculty-tasks", icon: ClipboardList, roles: ["faculty"] },
        { name: "Notifications", href: "/notifications", icon: Bell, roles: ["admin", "faculty"] },
        { name: "Calendar", href: "/calendar", icon: Calendar, roles: ["admin", "faculty"] },
        { name: "Profile", href: "/profile", icon: User, roles: ["admin", "faculty"] },
    ];

    const navItems = allNavItems.filter(
        (item) => !user || item.roles.includes(user.role)
    );

    const initials = user?.email
        ? user.email.substring(0, 2).toUpperCase()
        : "?";

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-white border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 h-screen flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 shrink-0">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        SmartTask
                    </span>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-slate-800 lg:hidden text-slate-400 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={() => {
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )
                            }
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* User footer */}
                <div className="p-4 border-t border-slate-800 shrink-0 space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-3 px-1">
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            user?.role === "admin"
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-emerald-500/20 text-emerald-300"
                        )}>
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                                {user?.email ?? "Guest"}
                            </p>
                            <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold",
                                user?.role === "admin" ? "text-purple-400" : "text-emerald-400"
                            )}>
                                <Shield className="h-3 w-3" />
                                {user?.role
                                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                                    : ""}
                            </span>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
