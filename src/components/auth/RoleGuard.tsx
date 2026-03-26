import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

/**
 * Redirects users to their default page if they don't have the required role.
 * - admin  → /
 * - hod    → /
 * - faculty → /faculty-tasks
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    const fallback = role === "faculty" ? "/faculty-tasks" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
