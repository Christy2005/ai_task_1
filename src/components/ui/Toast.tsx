import { CheckCircle, X } from "lucide-react";

interface ToastProps {
    message: string;
    subtext?: string;
    onClose: () => void;
}

/* ═══════════════════════════════════════
   Glass Toast Notification
   Shows after successful AI analysis
═══════════════════════════════════════ */
export const Toast = ({ message, subtext = "Database Synced", onClose }: ToastProps) => (
    <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="glass-card-strong flex items-center gap-4 p-5 rounded-3xl border border-white/40 shadow-2xl min-w-[300px] max-w-sm">
            {/* Icon */}
            <div className="bg-emerald-500/20 p-2.5 rounded-2xl shrink-0">
                <CheckCircle className="text-emerald-400" size={22} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm tracking-tight leading-snug">
                    {message}
                </p>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    {subtext}
                </p>
            </div>

            {/* Close */}
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
                aria-label="Dismiss notification"
            >
                <X size={16} />
            </button>
        </div>
    </div>
);
