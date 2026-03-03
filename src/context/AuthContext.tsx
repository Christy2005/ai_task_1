import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DecodedToken {
    id: number;
    email: string;
    role: "admin" | "faculty";
    iat: number;
    exp: number;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: DecodedToken | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper: decode token safely ──────────────────────────────────────────────
function decodeToken(token: string): DecodedToken | null {
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Reject expired tokens
        if (decoded.exp * 1000 < Date.now()) return null;
        return decoded;
    } catch {
        return null;
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<DecodedToken | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Rehydrate from localStorage on app mount
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            const decoded = decodeToken(storedToken);
            if (decoded) {
                setToken(storedToken);
                setUser(decoded);
            } else {
                // Token expired — clean up
                localStorage.removeItem("token");
            }
        }
    }, []);

    const login = (newToken: string) => {
        const decoded = decodeToken(newToken);
        if (!decoded) return;
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(decoded);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!user,
                user,
                token,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
