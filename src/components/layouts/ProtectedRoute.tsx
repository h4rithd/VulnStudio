
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

const ProtectedRoute = () => {
  const { session, loading } = useAuth();
  
  useEffect(() => {
    console.log('[ProtectedRoute] Auth state -', loading ? 'loading' : 'loaded', 'session:', session ? 'exists' : 'none');
  }, [loading, session]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" variant="secondary" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!session) {
    console.log('[ProtectedRoute] No session found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Session found, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute;
