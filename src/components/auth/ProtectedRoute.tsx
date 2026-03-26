import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const token = localStorage.getItem("token");

  // No token at all → redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token exists — AuthContext restores session from JWT on mount.
  // If not yet hydrated, show nothing briefly while useEffect runs.
  if (!isAuthenticated) {
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
}
