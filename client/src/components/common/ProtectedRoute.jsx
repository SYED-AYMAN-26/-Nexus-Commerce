import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../ui/Feedback';
import { EmptyState } from '../ui/Feedback';

/**
 * Route guard.
 * - `requireAuth` redirects guests to /login and remembers where they wanted to go.
 * - `requireAdmin` blocks non-admins with a friendly 403 instead of a redirect loop.
 */
export function ProtectedRoute({ children, requireAuth = true, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loader className="py-32" label="Checking your session…" />;

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="shield"
          title="Administrator access required"
          description="This area is limited to store administrators. If you believe you should have access, contact the account owner."
          actionTo="/"
          actionLabel="Back to store"
        />
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
