
import { useState, useEffect } from 'react';
import { getUserRolesFromToken } from '@/utils/api';

export interface UserRole {
  role: 'admin' | 'auditor';
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canImport: boolean;
  };
}

export const useUserRole = (): UserRole => {
  const [userRole, setUserRole] = useState<UserRole>({
    role: 'auditor',
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canImport: false,
    }
  });

  useEffect(() => {
    // Get user roles from JWT token
    const roles = getUserRolesFromToken();
    
    // Determine primary role (admin takes precedence)
    const primaryRole = roles.includes('admin') ? 'admin' : 'auditor';
    
    // Set permissions based on role
    const permissions = {
      canCreate: primaryRole === 'admin',
      canEdit: primaryRole === 'admin',
      canDelete: primaryRole === 'admin',
      canExport: primaryRole === 'admin',
      canImport: primaryRole === 'admin',
    };
    
    setUserRole({ role: primaryRole, permissions });
  }, []);

  return userRole;
};
