/**
 * ProtectedRoute.jsx — Route guard for authenticated pages
 *
 * What it does:
 *   Wraps a route and redirects unauthenticated users to /login.
 *   Optionally restricts access to specific roles.
 *
 * Why it exists:
 *   Without this, anyone could navigate directly to /dashboard
 *   without being logged in.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute roles={['admin']} />}>
 *     <Route path="/analytics" element={<Analytics />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show spinner while checking auth status (prevents flash of login page)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading SoilSense..." />
      </div>
    );
  }

  // Not logged in → redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — if roles prop is provided, check user's role
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Auth passed — render the child routes
  return <Outlet />;
}
