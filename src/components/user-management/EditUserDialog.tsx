import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/utils/api';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'auditor']),
});

type FormData = z.infer<typeof formSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'auditor',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        role: user.role as 'admin' | 'auditor',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('[EditUserDialog] Updating user:', user.id, data);

      // Update user basic info
      const userResult = await usersApi.update(user.id, {
        name: data.name,
        email: data.email,
      });

      if (!userResult.success) {
        throw new Error(userResult.error || 'Failed to update user');
      }

      // Update user role if changed
      if (data.role !== user.role) {
        const roleResult = await usersApi.updateRole(user.id, data.role);
        
        if (!roleResult.success) {
          throw new Error(roleResult.error || 'Failed to update user role');
        }
      }

      console.log('[EditUserDialog] User updated successfully');

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      onOpenChange(false);
      onUserUpdated();
    } catch (error: any) {
      console.error('[EditUserDialog] Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auditor">Auditor (Read-only access)</SelectItem>
                      <SelectItem value="admin">Admin (Full access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};