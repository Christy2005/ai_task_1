import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    role: string | null;
    login: (email: string) => void;
    logout: () => void;
    user: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const storedAuth = localStorage.getItem("isAuthenticated");
        const storedUser = localStorage.getItem("user");
        const storedRole = localStorage.getItem("role");
        if (storedAuth === "true" && storedUser) {
            setIsAuthenticated(true);
            setUser(storedUser);
            setRole(storedRole);
        }
    }, []);

    const login = (email: string) => {
        setIsAuthenticated(true);
        setUser(email);
        setRole(localStorage.getItem("role")); // LoginPage sets this before calling login()
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", email);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setRole(null);
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, login, logout, user }}>
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
