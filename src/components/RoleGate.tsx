import { useAuth } from "@/context/AuthContext";

interface RoleGateProps {
    children: React.ReactNode;
    allowedRoles: Array<"admin" | "faculty">;
    /** Optional fallback to render when the role doesn't match */
    fallback?: React.ReactNode;
}

/**
 * RoleGate — renders children only when the logged-in user's role
 * is in `allowedRoles`. Otherwise renders `fallback` (default: nothing).
 *
 * Usage:
 *   <RoleGate allowedRoles={['admin']}>
 *     <AdminOnlyButton />
 *   </RoleGate>
 */
export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
