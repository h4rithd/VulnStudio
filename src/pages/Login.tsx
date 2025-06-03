
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/components/layouts/AuthLayout';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

const Login = () => {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    if (!loading) {
      console.log('[Login] Auth loading complete. Session status:', session ? 'Active session' : 'No session');
      if (session) {
        console.log('[Login] User already authenticated, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [session, loading, navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    console.log('[Login] Submitting login form with email:', data.email);
    setIsLoading(true);
    
    try {
      const result = await signIn(data.email, data.password);
      
      if (!result.success) {
        console.error('[Login] Login error:', result.error);
        toast({ 
          title: 'Authentication failed', 
          description: result.error || 'Invalid credentials', 
          variant: 'destructive'
        });
      } else {
        console.log('[Login] Login successful');
        toast({ 
          title: 'Success', 
          description: 'Logged in successfully'
        });
        // Navigate immediately after successful login
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('[Login] Unexpected error during login:', error);
      toast({ 
        title: 'Error', 
        description: 'An unexpected error occurred', 
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner if auth is still loading
  if (loading) {
    return (
      <AuthLayout>
        <div className="vulnstudio-card animate-fade-in">
          <div className="text-center flex flex-col items-center">
            <span className="animate-spin text-2xl">⟳</span>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="vulnstudio-card animate-fade-in">
        <div className="text-center flex flex-col items-center mb-8">
          <img src="/images/logo.png" alt="Logo" className="w-3/4" />
          <p className="text-muted-foreground mt-2">Enter your credentials to access your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@vulnstudio.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span> Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};

export default Login;
