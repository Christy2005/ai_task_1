import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { type ReactNode } from "react";

interface AdminOnlyRouteProps {
  children?: ReactNode;
}

export function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { role, isAuthenticated } = useAuth();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role !== "admin") {
    // If not admin, send them to the safe dashboard
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
