import { MoreHorizontal, Edit2, Trash2, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usersApi } from '@/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserActionsDropdownProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => Promise<{ success: boolean; error?: any }>;
  onRoleChange: (userId: string, role: string) => Promise<{ success: boolean; error?: any }>;
  currentUserId?: string;
}

export const UserActionsDropdown = ({ 
  user, 
  onEdit, 
  onDelete, 
  onRoleChange, 
  currentUserId 
}: UserActionsDropdownProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await usersApi.delete(user.id);
      if (result.success) {
        toast({
          title: 'User deleted',
          description: `${user.name} has been removed from the system.`,
        });
        setShowDeleteDialog(false);
        // Call the parent's onDelete to refresh the list
        await onDelete(user.id);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete user. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRoleToggle = async () => {
    const newRole = user.role === 'admin' ? 'auditor' : 'admin';
    try {
      const result = await usersApi.updateRole(user.id, newRole);
      if (result.success) {
        toast({
          title: 'Role updated',
          description: `${user.name} is now ${newRole === 'admin' ? 'an admin' : 'an auditor'}.`,
        });
        // Call the parent's onRoleChange to refresh the list
        await onRoleChange(user.id, newRole);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update user role. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRoleToggle}>
            {user.role === 'admin' ? (
              <>
                <User className="mr-2 h-4 w-4" />
                Make Auditor
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Make Admin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            disabled={isCurrentUser}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {user.name}'s 
              account and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};