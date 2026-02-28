import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, login } = useAuth();
  const token = localStorage.getItem("token");

  // Sync auth state if token exists but context is false
  useEffect(() => {
    if (token && !isAuthenticated) {
      login("restored-user"); // restore session (you can improve later)
    }
  }, [token, isAuthenticated, login]);

  // If no token → redirect
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists but context not ready yet
  if (!isAuthenticated) {
    return null; // or loading spinner if you want
  }

  return children ? <>{children}</> : <Outlet />;
}