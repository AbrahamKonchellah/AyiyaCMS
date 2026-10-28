// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}