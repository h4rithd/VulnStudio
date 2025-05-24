
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextProps {
  user: any;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  firstLogin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firstLogin, setFirstLogin] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth subscription');
    
    // Set up auth listener FIRST to avoid missing events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AuthContext] Auth state changed, event:', event);
      
      setSession(newSession);
      
      if (newSession) {
        console.log('[AuthContext] New session detected, user ID:', newSession.user.id);
        fetchAndSetUser(newSession);
      } else {
        console.log('[AuthContext] Session ended');
        setUser(null);
        setIsAdmin(false);
        setFirstLogin(false);
        setLoading(false);
      }
    });

    // THEN check for existing session
    const getSession = async () => {
      setLoading(true);
      try {
        console.log('[AuthContext] Checking for existing session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          throw error;
        }
        
        if (data?.session) {
          console.log('[AuthContext] Found existing session, user ID:', data.session.user.id);
          setSession(data.session);
          fetchAndSetUser(data.session);
        } else {
          console.log('[AuthContext] No existing session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Session fetch error:', error);
        setLoading(false);
      }
    };

    getSession();

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Fetch additional user info from the database and check role
  const fetchAndSetUser = async (session: Session) => {
    if (!session?.user?.id) return;
    
    try {
      console.log('[AuthContext] Fetching user data for ID:', session.user.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching user data:', error);
        // Don't throw here - we'll fall back to session user below
      }
      
      if (data) {
        console.log('[AuthContext] User data fetched:', data.email);
        setUser(data);
        setFirstLogin(data.first_login || false);
        
        // Check user role using the new role system
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleError) {
          console.error('[AuthContext] Error fetching user role:', roleError);
          setIsAdmin(false);
        } else {
          console.log('[AuthContext] User role:', roleData?.role);
          setIsAdmin(roleData?.role === 'admin');
        }
      } else {
        console.log('[AuthContext] User data not found in database, using session user');
        setUser(session.user);
        setIsAdmin(false);
        setFirstLogin(false);
      }
    } catch (error) {
      console.error('[AuthContext] Error in fetchAndSetUser:', error);
      // Fall back to session user if database fetch fails
      setUser(session.user);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Signing in user:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
      } else {
        console.log('[AuthContext] Sign in successful');
      }
      return { error };
    } catch (error) {
      console.error('[AuthContext] Unexpected sign in error:', error);
      return { error };
    }
  };

  // Sign up a new user
  const signUp = async (email: string, password: string, username: string, name: string) => {
    console.log('[AuthContext] Signing up new user:', email);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, name }
        }
      });
      
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
      } else {
        console.log('[AuthContext] Sign up successful');
        
        // Create user profile entry with username and name
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: sessionData.session.user.id,
              email,
              username,
              name,
              first_login: false
            });
          
          if (profileError) {
            console.error('[AuthContext] Error creating user profile:', profileError);
            toast({
              title: 'Profile Creation Error',
              description: 'Your account was created but there was a problem setting up your profile.',
              variant: 'destructive'
            });
          }
        }
      }
      
      return { error };
    } catch (error) {
      console.error('[AuthContext] Unexpected sign up error:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    console.log('[AuthContext] Signing out user');
    try {
      await supabase.auth.signOut();
      console.log('[AuthContext] Sign out successful');
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    firstLogin,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
