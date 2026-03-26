import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: "admin" | "hod" | "faculty";
}

interface AuthContextType {
    isAuthenticated: boolean;
    role: string | null;
    user: AuthUser | null;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode JWT payload without a library (base64url → JSON)
function decodeJwtPayload(token: string): AuthUser | null {
    try {
        const base64 = token.split(".")[1];
        if (!base64) return null;
        const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(json);
        if (!payload.id || !payload.role) return null;
        return {
            id: payload.id,
            name: payload.name || payload.email || "",
            email: payload.email || "",
            role: payload.role,
        };
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    // Restore session from stored JWT on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = decodeJwtPayload(token);
        if (!decoded) {
            // Invalid or stale token — clean up
            localStorage.clear();
            return;
        }

        setIsAuthenticated(true);
        setUser(decoded);
    }, []);

    const login = (token: string, userData: AuthUser) => {
        localStorage.setItem("token", token);
        localStorage.setItem("role", userData.role);
        localStorage.setItem("isAuthenticated", "true");
        setIsAuthenticated(true);
        setUser(userData);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.clear();
    };

    const role = user?.role ?? null;

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
