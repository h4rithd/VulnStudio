
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';

const Index = () => {
  const { session, loading } = useAuth();

  useEffect(() => {
    console.log('[Index] Auth state -', loading ? 'loading' : 'loaded', 'session:', session ? 'exists' : 'none');
  }, [loading, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" variant="secondary" />
      </div>
    );
  }

  // If authenticated, redirect to dashboard, otherwise to login
  console.log('[Index] Redirecting to', session ? 'dashboard' : 'login');
  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
};

export default Index;
