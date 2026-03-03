import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, BookOpen, User, Shield } from "lucide-react";

export function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"faculty" | "admin">("faculty");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setRetrying(false);

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
                ? { name, email, password, role }
                : { email, password };

            let response: Response;
            try {
                response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyData),
                });
            } catch {
                // Network error — likely Neon cold-start
                setRetrying(true);
                setError("Database is waking up — please try again in 5 seconds.");
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            if (!data.token) {
                throw new Error("No token received from server");
            }

            // ⚡ Pass the JWT — AuthContext decodes role/id/email automatically
            login(data.token);

            navigate("/", { replace: true });

        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">

                <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        {isRegister ? "Create Account" : "Welcome back"}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isRegister
                            ? "Register to access the Smart Task Dashboard"
                            : "Sign in to the Smart Task Dashboard"}
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">

                        {/* Name field (register only) */}
                        {isRegister && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full rounded-lg border border-gray-300 pl-10 py-2 text-gray-900"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 pl-10 py-2 text-gray-900"
                                    placeholder="doctor@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 pl-10 py-2 text-gray-900"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Role selector (register only) */}
                        {isRegister && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["faculty", "admin"] as const).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${role === r
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                                }`}
                                        >
                                            <Shield className="h-4 w-4" />
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className={`text-sm p-3 rounded-lg ${retrying ? "text-amber-700 bg-amber-50" : "text-red-600 bg-red-50"}`}>
                            {error}
                            {retrying && (
                                <button
                                    type="button"
                                    className="ml-2 underline font-medium"
                                    onClick={() => { setRetrying(false); handleSubmit({ preventDefault: () => { } } as React.FormEvent); }}
                                >
                                    Retry now
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading
                            ? isRegister ? "Creating..." : "Signing in..."
                            : isRegister ? "Create Account" : "Sign in"}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => { setError(""); setIsRegister(!isRegister); }}
                        className="text-primary font-medium hover:underline"
                    >
                        {isRegister ? "Sign in" : "Create one"}
                    </button>
                </p>
            </div>
        </div>
    );
}