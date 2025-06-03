
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  first_login: boolean;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[useUserManagement] Fetching users');

      const result = await usersApi.getAll();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      console.log('[useUserManagement] Fetched users:', result.data?.length);
      setUsers(
        (result.data || []).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at || '', // Provide a fallback if missing
          first_login: user.first_login || false,
        }))
      );
    } catch (error) {
      console.error('[useUserManagement] Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      console.log('[useUserManagement] Deleting user:', userId);
      
      const result = await usersApi.delete(userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
      
      console.log('[useUserManagement] User deleted successfully');
      await fetchUsers(); // Refresh the list
      return { success: true };
    } catch (error) {
      console.error('[useUserManagement] Error deleting user:', error);
      return { success: false, error };
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      console.log('[useUserManagement] Updating user role:', userId, newRole);
      
      const result = await usersApi.updateRole(userId, newRole);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user role');
      }
      
      console.log('[useUserManagement] User role updated successfully');
      await fetchUsers(); // Refresh the list
      return { success: true };
    } catch (error) {
      console.error('[useUserManagement] Error updating user role:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    refreshUsers: fetchUsers,
    deleteUser,
    updateUserRole,
  };
};
