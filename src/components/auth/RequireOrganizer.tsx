import { useAuth } from '@/hooks/useAuth';
import { useAppSelector } from '@/store/hooks';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function RequireOrganizer() {
  const { user } = useAuth();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const loc = useLocation();

  if (!user || !accessToken) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (user.role !== 'organizer') {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}
