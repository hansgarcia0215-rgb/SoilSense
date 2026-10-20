/**
 * Unauthorized.jsx — 403 page
 * Shown when a user tries to access a page their role doesn't allow.
 */
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to view this page.
          If you believe this is an error, please contact the administrator.
        </p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  );
}
