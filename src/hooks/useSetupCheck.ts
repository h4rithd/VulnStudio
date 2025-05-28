import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export const useSetupCheck = () => {
  const [isSetupRequired, setIsSetupRequired] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSetup = async () => {
    try {
      setIsLoading(true);
      
      // Check if essential tables exist and have the correct structure
      const requiredTables = [
        { name: 'users', requiredColumns: ['id', 'email', 'name', 'first_login'] },
        { name: 'user_roles', requiredColumns: ['id', 'user_id', 'role'] },
        { name: 'reports', requiredColumns: ['id', 'title', 'created_by'] },
        { name: 'vulnerabilities', requiredColumns: ['id', 'title', 'severity', 'report_id'] },
        { name: 'vulndb', requiredColumns: ['id', 'title', 'created_by'] },
        { name: 'attachments', requiredColumns: ['id', 'vulnerability_id', 'name'] }
      ];
      
      let allTablesExist = true;

      for (const table of requiredTables) {
        try {
          // Try to query the table with a limit to check if it exists and is accessible
          const { error } = await supabase
            .from(table.name)
            .select(table.requiredColumns.join(','))
            .limit(1);
          
          if (error) {
            console.log(`Table ${table.name} check failed:`, error.message);
            allTablesExist = false;
            break;
          }
        } catch (err) {
          console.log(`Error checking table ${table.name}:`, err);
          allTablesExist = false;
          break;
        }
      }

      // If tables exist, check if there's at least one admin user in the new user_roles system
      if (allTablesExist) {
        try {
          const { data: adminRoles, error: adminError } = await supabase
            .from('user_roles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);

          if (adminError) {
            console.log('Error checking for admin users:', adminError);
            allTablesExist = false;
          } else if (!adminRoles || adminRoles.length === 0) {
            console.log('No admin users found, setup required');
            allTablesExist = false;
          } else {
            console.log('Admin users found, setup complete');
          }
        } catch (err) {
          console.log('Error checking for admin users:', err);
          allTablesExist = false;
        }
      }

      console.log('Setup check result:', allTablesExist ? 'Complete' : 'Required');
      setIsSetupRequired(!allTablesExist);
    } catch (error) {
      console.error('Error during setup check:', error);
      setIsSetupRequired(true); // Assume setup is required if check fails
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const markSetupComplete = () => {
    setIsSetupRequired(false);
  };

  return {
    isSetupRequired,
    isLoading,
    recheckSetup: checkSetup,
    markSetupComplete,
  };
};