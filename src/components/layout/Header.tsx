import { Menu, Bell, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Generate initials from email or a name if we had it
    const initials = user?.email
        ? user.email.substring(0, 2).toUpperCase()
        : "?";

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </button>
                <h1 className="text-lg font-semibold lg:hidden">Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
                <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                    <span className="sr-only">Notifications</span>
                </button>

                {/* User avatar + info pill — click to go to Profile */}
                <button
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted transition-colors"
                >
                    {/* Avatar circle with initials */}
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                        user?.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-emerald-100 text-emerald-700"
                    )}>
                        {initials}
                    </div>

                    {/* Name + role — only on desktop */}
                    <div className="hidden lg:flex flex-col items-start leading-tight">
                        <span className="text-sm font-medium text-foreground">
                            {user?.email ?? "Guest"}
                        </span>
                        <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-semibold",
                            user?.role === "admin" ? "text-purple-600" : "text-emerald-600"
                        )}>
                            <Shield className="h-3 w-3" />
                            {user?.role
                                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                                : ""}
                        </span>
                    </div>
                </button>
            </div>
        </header>
    );
}
