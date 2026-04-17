import { useAuth } from '@/hooks/useAuth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function RequireOrganizer() {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (user.role !== 'organizer') {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}
