import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading, configured } = useAuth();
  const location = useLocation();
  if (loading) return <section className="page-section auth-loading">Checking access…</section>;
  if (!configured || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role !== 'artist' && role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
