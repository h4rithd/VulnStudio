import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authApi } from '@/utils/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = authApi.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if user has admin role
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    // Get initial session
    authApi.getCurrentSession().then(({ data: session }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if user has admin role
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Function to check if user has admin role
  const checkAdminRole = async (userId: string) => {
    try {
      const { data: roles } = await authApi.getUserRoles(userId);
      setIsAdmin(roles?.includes('admin') || false);
    } catch (error) {
      console.error('[AuthContext] Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await authApi.signIn(email, password);
    return result;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const result = await authApi.signUp(email, password, metadata);
    return result;
  };

  const signOut = async () => {
    await authApi.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}