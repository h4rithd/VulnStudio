
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, getUserRolesFromToken, hasRole } from '@/utils/api';

interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  user_metadata?: any;
}

interface Session {
  user: User;
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAuditor: boolean;
  hasRole: (role: string) => boolean;
  userRoles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Helper function to update auth state
  const updateAuthState = (newSession: Session | null) => {
    console.log('[AuthContext] Updating auth state:', newSession?.user?.email || 'no session');
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    if (newSession?.user) {
      const roles = newSession.user.roles || getUserRolesFromToken();
      setUserRoles(roles);
    } else {
      setUserRoles([]);
    }
  };

  // Clear session and redirect to login
  const clearSessionAndRedirect = () => {
    console.log('[AuthContext] Clearing session and redirecting to login');
    localStorage.removeItem('auth_token');
    updateAuthState(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      
      try {
        // Check for existing session
        const result = await authApi.getCurrentSession();
        if (result.success && result.data) {
          console.log('[AuthContext] Found existing session');
          updateAuthState(result.data);
        } else {
          console.log('[AuthContext] No existing session found');
          updateAuthState(null);
        }
      } catch (error: any) {
        console.error('[AuthContext] Error initializing auth:', error);
        // If token is invalid, clear session and redirect
        if (error.message === 'Session expired' || error.message.includes('Invalid token')) {
          clearSessionAndRedirect();
        } else {
          updateAuthState(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Signing in user:', email);
    
    try {
      const result = await authApi.signIn(email, password);
      
      if (result.success && result.data) {
        console.log('[AuthContext] Sign in successful');
        const newSession = {
          user: {
            ...result.data.user,
            roles: result.data.roles || []
          },
          access_token: result.data.token
        };
        updateAuthState(newSession);
        return { success: true };
      } else {
        console.error('[AuthContext] Sign in failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('[AuthContext] Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log('[AuthContext] Signing up user:', email);
    
    try {
      const result = await authApi.signUp(email, password, metadata);
      
      if (result.success && result.data) {
        console.log('[AuthContext] Sign up successful');
        const newSession = {
          user: {
            ...result.data.user,
            roles: result.data.roles || []
          },
          access_token: result.data.token
        };
        updateAuthState(newSession);
        return { success: true };
      } else {
        console.error('[AuthContext] Sign up failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('[AuthContext] Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out user');
    
    try {
      await authApi.signOut();
      updateAuthState(null);
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
      updateAuthState(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userRoles.includes('admin'),
    isAuditor: userRoles.includes('auditor'),
    hasRole: (role: string) => userRoles.includes(role),
    userRoles,
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
