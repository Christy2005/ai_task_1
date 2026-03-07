import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle Component
 * Day/Night switch with a smooth slider animation
 */
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex items-center justify-between gap-1 p-1 rounded-full w-14 h-8 transition-all duration-300",
                theme === "dark"
                    ? "bg-indigo-950/50 border border-indigo-500/30"
                    : "bg-slate-200 border border-slate-300"
            )}
            aria-label="Toggle theme"
        >
            {/* Sliding Dot */}
            <div
                className={cn(
                    "absolute top-1 bottom-1 w-6 rounded-full transition-all duration-500 flex items-center justify-center shadow-sm",
                    theme === "dark"
                        ? "left-[calc(100%-1.75rem)] bg-indigo-500 text-white"
                        : "left-1 bg-white text-indigo-600"
                )}
            >
                {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            </div>

            {/* Background Icons */}
            <div className="flex-1 flex justify-start pl-1 text-slate-400">
                <Sun size={12} className={cn(theme === "light" && "opacity-0")} />
            </div>
            <div className="flex-1 flex justify-end pr-1 text-slate-400">
                <Moon size={12} className={cn(theme === "dark" && "opacity-0")} />
            </div>
        </button>
    );
}
