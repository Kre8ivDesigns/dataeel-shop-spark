import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/auth" replace />;

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
