
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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

      // Get all users from the users table (without created_at since it doesn't exist)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('[useUserManagement] Error fetching users:', usersError);
        throw usersError;
      }

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (rolesError) {
        console.error('[useUserManagement] Error fetching roles:', rolesError);
        throw rolesError;
      }

      // Create a map of user roles with created_at from user_roles table
      const roleMap = new Map();
      rolesData?.forEach(role => {
        roleMap.set(role.user_id, { role: role.role, created_at: role.created_at });
      });

      // Combine users with their roles
      const usersWithRoles = usersData?.map(user => {
        const roleInfo = roleMap.get(user.id);
        return {
          id: user.id,
          name: user.name || user.username || 'Unknown User',
          email: user.email || 'No email',
          role: roleInfo?.role || 'auditor',
          created_at: roleInfo?.created_at || new Date().toISOString(),
          first_login: user.first_login || false,
        };
      }) || [];

      console.log('[useUserManagement] Fetched users:', usersWithRoles);
      setUsers(usersWithRoles);
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
      
      // First delete user roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.error('[useUserManagement] Error deleting user roles:', roleError);
        throw roleError;
      }

      // Then delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        console.error('[useUserManagement] Error deleting user:', userError);
        throw userError;
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
      
      // Update or insert user role
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' });

      if (error) {
        console.error('[useUserManagement] Error updating user role:', error);
        throw error;
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