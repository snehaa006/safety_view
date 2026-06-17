import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/lib/roles';

export default function AdminRoute() {
  const { user } = useAuth();
  if (!isAdminUser(user)) {
    return <Navigate to="/devices" replace />;
  }
  return <Outlet />;
}
