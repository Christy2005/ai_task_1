import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, BookOpen, User } from "lucide-react";

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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            if (!data.token) {
                throw new Error("No token received from server");
            }

            // Clear old auth
            localStorage.clear();

            // Store JWT
            localStorage.setItem("token", data.token);

            // Update context
            login(email);

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

                        {/* Name field (only for register) */}
                        {isRegister && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Full Name
                                </label>
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
                            <label className="text-sm font-medium text-gray-700">
                                Email address
                            </label>
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
                            <label className="text-sm font-medium text-gray-700">
                                Password
                            </label>
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
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading
                            ? isRegister
                                ? "Creating..."
                                : "Signing in..."
                            : isRegister
                            ? "Create Account"
                            : "Sign in"}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                {/* Toggle Button */}
                <p className="text-center text-sm text-gray-500">
                    {isRegister
                        ? "Already have an account?"
                        : "Don't have an account?"}{" "}
                    <button
                        onClick={() => {
                            setError("");
                            setIsRegister(!isRegister);
                        }}
                        className="text-primary font-medium hover:underline"
                    >
                        {isRegister ? "Sign in" : "Create one"}
                    </button>
                </p>
            </div>
        </div>
    );
}