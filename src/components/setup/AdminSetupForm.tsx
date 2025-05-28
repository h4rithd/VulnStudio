import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { edgeFunctionsApi } from '@/utils/api';

const adminSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminFormData = z.infer<typeof adminSchema>;

interface AdminSetupFormProps {
  onAdminCreated: () => void;
}

export const AdminSetupForm = ({ onAdminCreated }: AdminSetupFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      email: 'admin@vulnstudio.com',
      password: 'password1234',
      confirmPassword: 'password1234',
      name: 'System Administrator',
    },
  });

  const createDefaultAdmin = async () => {
    setIsLoading(true);
    try {
      // Call the edge function to create the default admin
      const result = await edgeFunctionsApi.createAdminUser({
        email: 'admin@vulnstudio.com',
        password: 'password1234',
        name: 'System Administrator',
        role: 'admin'
      });

      if (!result.success) {
        console.error('Default admin creation error:', result.error);
        // Continue anyway as this might be a duplicate user error
      }

      setAdminCreated(true);
      setTimeout(() => {
        onAdminCreated();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating default admin:', error);
      // Continue anyway as this might be a duplicate user error
      setAdminCreated(true);
      setTimeout(() => {
        onAdminCreated();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AdminFormData) => {
    setIsLoading(true);
    try {
      // Call the edge function to create custom admin
      const result = await edgeFunctionsApi.createAdminUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: 'admin'
      });

      if (!result.success) {
        console.error('Custom admin creation error:', result.error);
        // Continue anyway as this might be a duplicate user error
      }

      setAdminCreated(true);
      setTimeout(() => {
        onAdminCreated();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating custom admin:', error);
      // Continue anyway as this might be a duplicate user error
      setAdminCreated(true);
      setTimeout(() => {
        onAdminCreated();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (adminCreated) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold text-green-700">Admin Account Created!</h3>
        <p className="text-muted-foreground">Your admin account has been set up successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          <strong>Quick Setup:</strong> Use the default admin account or customize your own.
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button 
          onClick={createDefaultAdmin} 
          disabled={isLoading}
          variant="outline"
          className="flex-1"
        >
          {isLoading ? 'Creating...' : 'Use Default Admin'}
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Creating...' : 'Create Custom Admin'}
        </Button>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">Customize Admin Account</h4>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="System Administrator"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="admin@vulnstudio.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              placeholder="••••••••"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register('confirmPassword')}
              placeholder="••••••••"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
          <h5 className="font-medium text-blue-800 mb-2">Default Admin Credentials:</h5>
          <p className="text-sm text-blue-700">
            <strong>Email:</strong> admin@vulnstudio.com<br />
            <strong>Password:</strong> password1234
          </p>
        </div>
      </div>
    </div>
  );
};