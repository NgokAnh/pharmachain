import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Permission } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  requireAll?: boolean;
}

export function ProtectedRoute({
  children,
  permissions,
  requireAll = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, hasAnyPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? permissions.every((p) => hasPermission(p))
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
