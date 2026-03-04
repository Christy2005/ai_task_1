import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const initials = user
        ? user.split("@")[0].substring(0, 2).toUpperCase()
        : "AD";

    return (
        /* Only visible on mobile — desktop has its own page-level header */
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 lg:hidden">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="glass-card glass-shadow rounded-xl p-2.5 text-slate-600 hover:text-indigo-600 transition-colors"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </button>
                <span className="text-lg font-black text-gradient-indigo">SmartTask</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate("/notifications")}
                    className="relative glass-card glass-shadow rounded-xl p-2.5 text-slate-500 hover:text-indigo-600 transition-colors"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-black shadow-md">
                    {initials}
                </div>
            </div>
        </header>
    );
}
