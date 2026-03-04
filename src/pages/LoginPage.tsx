import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, Zap, User } from "lucide-react";

export function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password || (isRegister && !name)) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setLoading(true);

            const endpoint = isRegister
                ? "http://localhost:3000/api/auth/register"
                : "http://localhost:3000/api/auth/login";

            const bodyData = isRegister
                ? { name, email, password }
                : { email, password };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Something went wrong");
            if (!data.token) throw new Error("No token received from server");

            localStorage.clear();
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role ?? "faculty");
            login(email);
            navigate("/", { replace: true });


        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Decorative blobs */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-300/30 blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-pink-300/25 blur-[80px]" />
                <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-purple-300/20 blur-[80px]" />
            </div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl rotate-12 shadow-xl shadow-indigo-300/40 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-white -rotate-12" />
                        </div>
                        <span className="text-3xl font-black text-gradient-indigo">SmartTask</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">
                        {isRegister ? "Create your account" : "Welcome back"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {isRegister
                            ? "Join the Smart Task Dashboard"
                            : "Sign in to continue to your dashboard"}
                    </p>
                </div>

                {/* Glass Card */}
                <div className="glass-card-strong glass-shadow-lg rounded-[2rem] p-8 space-y-6">
                    <form className="space-y-5" onSubmit={handleSubmit}>

                        {/* Name (register only) */}
                        {isRegister && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                                <div className="flex items-center gap-3 bg-white/60 border border-white/50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                            <div className="flex items-center gap-3 bg-white/60 border border-white/50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
                            <div className="flex items-center gap-3 bg-white/60 border border-white/50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="text-sm text-rose-600 bg-rose-50/80 border border-rose-100 rounded-2xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading
                                ? (isRegister ? "Creating account…" : "Signing in…")
                                : (isRegister ? "Create Account" : "Sign In")}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>

                    {/* Toggle */}
                    <p className="text-center text-sm text-slate-500">
                        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            onClick={() => { setError(""); setIsRegister(!isRegister); }}
                            className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                        >
                            {isRegister ? "Sign in" : "Create one"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}