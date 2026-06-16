import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();
  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/devices" replace />;
  }
  return <Outlet />;
}
