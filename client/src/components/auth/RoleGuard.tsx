// src/components/auth/RoleGuard.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[];
}

export default function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role))
    return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}