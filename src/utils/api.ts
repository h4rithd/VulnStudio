import { supabase } from './supabase';
import { Database } from '../types/database.types';

// Type definitions
type Tables = Database['public']['Tables'];
type Report = Tables['reports']['Row'];
type Vulnerability = Tables['vulnerabilities']['Row'];
type VulnDB = Tables['vulndb']['Row'];
type User = Tables['users']['Row'];
type UserRole = Tables['user_roles']['Row'];
type Attachment = Tables['attachments']['Row'];

// Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface VulnerabilityCount {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ProjectWithVulnerabilities extends Report {
  vulnerabilities_count: VulnerabilityCount;
  isTemporary?: boolean;
  is_retest?: boolean;
}

// Authentication API
export const authApi = {
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      
      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data: user, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data: session, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  onAuthStateChange(callback: (event: any, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async updatePassword(newPassword: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getUserRoles(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const roles = data?.map(r => r.role) || [];
      return { data: roles, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Reports/Projects API
export const reportsApi = {
  async getAll(): Promise<ApiResponse<ProjectWithVulnerabilities[]>> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include vulnerability counts and retest status
      const projectsWithVulnCounts = await Promise.all(
        (data || []).map(async (report) => {
          // Get vulnerability counts for each project
          const { data: vulnData, error: vulnError } = await supabase
            .from('vulnerabilities')
            .select('severity')
            .eq('report_id', report.id);

          if (vulnError) {
            console.error("Error fetching vulnerabilities:", vulnError);
            return {
              ...report,
              vulnerabilities_count: {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0
              },
              is_retest: report.title.startsWith('Re-test:'),
              isTemporary: false
            };
          }

          const vulnCounts = {
            total: vulnData?.length || 0,
            critical: vulnData?.filter(v => v.severity === 'critical').length || 0,
            high: vulnData?.filter(v => v.severity === 'high').length || 0,
            medium: vulnData?.filter(v => v.severity === 'medium').length || 0,
            low: vulnData?.filter(v => v.severity === 'low').length || 0,
            info: vulnData?.filter(v => v.severity === 'info').length || 0,
          };

          // Check if this is a retest project
          const isRetest = report.title.startsWith('Re-test:');

          return {
            ...report,
            vulnerabilities_count: vulnCounts,
            is_retest: isRetest,
            isTemporary: false
          };
        })
      );

      return { data: projectsWithVulnCounts, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<Report>> {
    try {
      // Check if this is a temporary project ID
      if (id.startsWith('temp_')) {
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (!tempProjectsJSON) {
          throw new Error('No temporary projects found');
        }
        
        const tempProjects = JSON.parse(tempProjectsJSON);
        const project = tempProjects.find((p: any) => p.id === id);
        
        if (!project) {
          throw new Error(`Temporary project with ID ${id} not found`);
        }
        
        return { data: project, success: true };
      }
      
      // Regular project from database
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(report: Partial<Report>): Promise<ApiResponse<Report>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          ...report,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: Partial<Report>): Promise<ApiResponse<Report>> {
    try {
      // Check if this is a temporary project
      if (id.startsWith('temp_')) {
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (!tempProjectsJSON) {
          throw new Error('No temporary projects found');
        }
        
        const tempProjects = JSON.parse(tempProjectsJSON);
        const projectIndex = tempProjects.findIndex((p: any) => p.id === id);
        
        if (projectIndex === -1) {
          throw new Error(`Temporary project with ID ${id} not found`);
        }
        
        // Update the project
        const updatedProject = {
          ...tempProjects[projectIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        tempProjects[projectIndex] = updatedProject;
        localStorage.setItem('tempProjects', JSON.stringify(tempProjects));
        
        return { data: updatedProject, success: true };
      }
      
      // Regular project in database
      const { data, error } = await supabase
        .from('reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      // Check if this is a temporary project
      if (id.startsWith('temp_')) {
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (tempProjectsJSON) {
          const tempProjects = JSON.parse(tempProjectsJSON);
          const updatedProjects = tempProjects.filter((p: any) => p.id !== id);
          localStorage.setItem('tempProjects', JSON.stringify(updatedProjects));
          
          // Also delete associated vulnerabilities
          localStorage.removeItem(`tempVulnerabilities_${id}`);
        }
        return { success: true };
      }
      
      // For regular projects, first delete all vulnerabilities
      const { error: vulnError } = await supabase
        .from('vulnerabilities')
        .delete()
        .eq('report_id', id);
        
      if (vulnError) throw vulnError;
      
      // Then delete the project
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getVulnerabilityCountsForReport(reportId: string): Promise<VulnerabilityCount> {
    try {
      // Check if this is a temporary project
      if (reportId.startsWith('temp_')) {
        const vulnKey = `tempVulnerabilities_${reportId}`;
        const vulnJSON = localStorage.getItem(vulnKey);
        const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) : [];
        
        const counts = {
          total: vulnerabilities.length,
          critical: vulnerabilities.filter((v: any) => v.severity === 'critical').length,
          high: vulnerabilities.filter((v: any) => v.severity === 'high').length,
          medium: vulnerabilities.filter((v: any) => v.severity === 'medium').length,
          low: vulnerabilities.filter((v: any) => v.severity === 'low').length,
          info: vulnerabilities.filter((v: any) => v.severity === 'info').length
        };
        
        return counts;
      }
      
      // Regular project in database
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select('severity')
        .eq('report_id', reportId);

      if (error) throw error;

      const counts = {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      };

      (data || []).forEach((vuln) => {
        counts.total++;
        const severity = vuln.severity.toLowerCase();
        if (severity in counts) {
          (counts as any)[severity]++;
        }
      });

      return counts;
    } catch (error) {
      return { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    }
  },
  
  async duplicateProject(projectId: string, newTitle: string, newVersion: string, type: 'duplicate' | 'retest'): Promise<ApiResponse<Report>> {
    try {
      // Get the original project
      const { data: originalProject, error: projectError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Get the user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');
      
      // Create the new project
      const { data: newProject, error: createError } = await supabase
        .from('reports')
        .insert({
          title: newTitle,
          start_date: originalProject.start_date,
          end_date: originalProject.end_date,
          preparer: originalProject.preparer,
          preparer_email: originalProject.preparer_email,
          reviewer: originalProject.reviewer,
          reviewer_email: originalProject.reviewer_email,
          version: newVersion,
          version_history: originalProject.version_history,
          scope: originalProject.scope,
          status: 'draft',
          created_by: userData.user.id
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Get vulnerabilities from the original project
      const { data: vulnerabilities, error: vulnError } = await supabase
        .from('vulnerabilities')
        .select('*')
        .eq('report_id', projectId);
        
      if (vulnError) throw vulnError;
      
      // If there are vulnerabilities, duplicate them
      if (vulnerabilities && vulnerabilities.length > 0) {
        // Prepare vulnerabilities for the new project
        const newVulnerabilities = vulnerabilities.map(vuln => {
          const { id, ...vulnWithoutId } = vuln;
          return {
            ...vulnWithoutId,
            report_id: newProject.id,
            created_by: userData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // For retests, reset the current_status
            ...(type === 'retest' ? { current_status: false, retest_date: null, retest_result: null, retest_images: null } : {})
          };
        });
        
        // Insert the new vulnerabilities
        const { error: insertError } = await supabase
          .from('vulnerabilities')
          .insert(newVulnerabilities);
          
        if (insertError) throw insertError;
      }
      
      return { data: newProject, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async exportDatabase(): Promise<ApiResponse<Blob>> {
    try {
      // Fetch data from all tables
      const [usersRes, reportsRes, vulnRes, vulnDBRes, attachmentsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('reports').select('*'),
        supabase.from('vulnerabilities').select('*'),
        supabase.from('vulndb').select('*'),
        supabase.from('attachments').select('*'),
      ]);
      
      // Prepare export data
      const exportData = {
        users: usersRes.data,
        reports: reportsRes.data,
        vulnerabilities: vulnRes.data,
        vulndb: vulnDBRes.data,
        attachments: attachmentsRes.data,
        exportDate: new Date().toISOString(),
      };
      
      // Create a Blob with the JSON data
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      return { data: blob, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async importDatabase(jsonData: string): Promise<ApiResponse<void>> {
    try {
      // Parse the JSON data
      const importedData = JSON.parse(jsonData);
      
      // Validate the imported data structure
      const requiredTables = ['users', 'reports', 'vulnerabilities', 'vulndb'];
      for (const table of requiredTables) {
        if (!importedData[table] || !Array.isArray(importedData[table])) {
          throw new Error(`Invalid import file: ${table} data is missing or invalid`);
        }
      }
      
      // Insert data into each table
      const results = await Promise.all([
        supabase.from('vulndb').upsert(importedData.vulndb.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('reports').upsert(importedData.reports.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('vulnerabilities').upsert(importedData.vulnerabilities.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('users').upsert(importedData.users.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString()
        }))),
      ]);
      
      // Check for errors
      const errors = results.filter(r => r.error).map(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Import errors: ${errors.map(e => e?.message).join(', ')}`);
      }
      
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Vulnerabilities API
export const vulnerabilitiesApi = {
  async getByReportId(reportId: string): Promise<ApiResponse<Vulnerability[]>> {
    try {
      // Check if this is a temporary project
      if (reportId.startsWith('temp_')) {
        const vulnKey = `tempVulnerabilities_${reportId}`;
        const vulnJSON = localStorage.getItem(vulnKey);
        const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) : [];
        return { data: vulnerabilities, success: true };
      }
      
      // Regular project in database
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select('*')
        .eq('report_id', reportId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<Vulnerability>> {
    try {
      // Check if this is a temporary vulnerability
      if (id.startsWith('temp_vuln_')) {
        // We need to search through all temp vulnerabilities
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (!tempProjectsJSON) {
          throw new Error('No temporary projects found');
        }
        
        const tempProjects = JSON.parse(tempProjectsJSON);
        
        // Search in each project's vulnerabilities
        for (const project of tempProjects) {
          const vulnKey = `tempVulnerabilities_${project.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          
          if (vulnJSON) {
            const vulnerabilities = JSON.parse(vulnJSON);
            const vulnerability = vulnerabilities.find((v: any) => v.id === id);
            
            if (vulnerability) {
              return { data: vulnerability, success: true };
            }
          }
        }
        
        throw new Error(`Temporary vulnerability with ID ${id} not found`);
      }
      
      // Regular vulnerability in database
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(vulnerability: Partial<Vulnerability>): Promise<ApiResponse<Vulnerability>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Check if this is for a temporary project
      if (vulnerability.report_id && vulnerability.report_id.startsWith('temp_')) {
        const vulnId = `temp_vuln_${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
        
        const newVuln = {
          ...vulnerability,
          id: vulnId,
          created_by: user.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Get existing vulnerabilities for this project
        const vulnKey = `tempVulnerabilities_${vulnerability.report_id}`;
        const vulnJSON = localStorage.getItem(vulnKey);
        const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) : [];
        
        // Add new vulnerability
        vulnerabilities.push(newVuln);
        
        // Save back to localStorage
        localStorage.setItem(vulnKey, JSON.stringify(vulnerabilities));
        
        return { data: newVuln as Vulnerability, success: true };
      }
      
      // Regular vulnerability in database
      const { data, error } = await supabase
        .from('vulnerabilities')
        .insert({
          ...vulnerability,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: Partial<Vulnerability>): Promise<ApiResponse<Vulnerability>> {
    try {
      // Check if this is a temporary vulnerability
      if (id.startsWith('temp_vuln_')) {
        // We need to find which project this vulnerability belongs to
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (!tempProjectsJSON) {
          throw new Error('No temporary projects found');
        }
        
        const tempProjects = JSON.parse(tempProjectsJSON);
        
        // Search in each project's vulnerabilities
        for (const project of tempProjects) {
          const vulnKey = `tempVulnerabilities_${project.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          
          if (vulnJSON) {
            const vulnerabilities = JSON.parse(vulnJSON);
            const vulnIndex = vulnerabilities.findIndex((v: any) => v.id === id);
            
            if (vulnIndex !== -1) {
              // Update the vulnerability
              vulnerabilities[vulnIndex] = {
                ...vulnerabilities[vulnIndex],
                ...updates,
                updated_at: new Date().toISOString()
              };
              
              // Save back to localStorage
              localStorage.setItem(vulnKey, JSON.stringify(vulnerabilities));
              
              return { data: vulnerabilities[vulnIndex], success: true };
            }
          }
        }
        
        throw new Error(`Temporary vulnerability with ID ${id} not found`);
      }
      
      // Regular vulnerability in database
      const { data, error } = await supabase
        .from('vulnerabilities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      // Check if this is a temporary vulnerability
      if (id.startsWith('temp_vuln_')) {
        // We need to find which project this vulnerability belongs to
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (!tempProjectsJSON) {
          throw new Error('No temporary projects found');
        }
        
        const tempProjects = JSON.parse(tempProjectsJSON);
        
        // Search in each project's vulnerabilities
        for (const project of tempProjects) {
          const vulnKey = `tempVulnerabilities_${project.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          
          if (vulnJSON) {
            const vulnerabilities = JSON.parse(vulnJSON);
            const filteredVulns = vulnerabilities.filter((v: any) => v.id !== id);
            
            if (filteredVulns.length !== vulnerabilities.length) {
              // Save back to localStorage
              localStorage.setItem(vulnKey, JSON.stringify(filteredVulns));
              return { success: true };
            }
          }
        }
        
        throw new Error(`Temporary vulnerability with ID ${id} not found`);
      }
      
      // First delete any attachments related to this vulnerability
      const { error: attachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('vulnerability_id', id);

      if (attachmentError) {
        console.error("Error deleting attachments:", attachmentError);
      }
      
      // Then delete the vulnerability
      const { error } = await supabase
        .from('vulnerabilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// VulnDB API
export const vulnDbApi = {
  async search(searchTerm: string, limit: number = 10): Promise<ApiResponse<VulnDB[]>> {
    try {
      const { data, error } = await supabase
        .from('vulndb')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .limit(limit);

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getAll(): Promise<ApiResponse<VulnDB[]>> {
    try {
      const { data, error } = await supabase
        .from('vulndb')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<VulnDB>> {
    try {
      const { data, error } = await supabase
        .from('vulndb')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(vulndb: Partial<VulnDB>): Promise<ApiResponse<VulnDB>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vulndb')
        .insert({
          ...vulndb,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: Partial<VulnDB>): Promise<ApiResponse<VulnDB>> {
    try {
      const { data, error } = await supabase
        .from('vulndb')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('vulndb')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Users API
export const usersApi = {
  async getAll(): Promise<ApiResponse<(User & { role: string })[]>> {
    try {
      // First get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;
      
      // Then get all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
        
      if (rolesError) throw rolesError;
      
      // Combine users with their roles
      const usersWithRoles = (usersData || []).map(user => {
        const userRoles = rolesData?.filter(r => r.user_id === user.id) || [];
        const role = userRoles.length > 0 ? userRoles[0].role : 'auditor';
        
        return {
          ...user,
          role
        };
      });

      return { data: usersWithRoles, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async updateRole(userId: string, role: string): Promise<ApiResponse<void>> {
    try {
      // Delete old role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (insertError) throw insertError;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Attachments API
export const attachmentsApi = {
  async getByVulnerabilityId(vulnerabilityId: string): Promise<ApiResponse<Attachment[]>> {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('vulnerability_id', vulnerabilityId);

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(attachment: Partial<Attachment>): Promise<ApiResponse<Attachment>> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('attachments')
        .insert({
          ...attachment,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Edge Functions API
export const edgeFunctionsApi = {
  async createAdminUser(userData: { email: string; password: string; name: string; role: string }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`https://dzqaszkmmxafenqujsyv.supabase.co/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cWFzemttbXhhZmVucXVqc3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTQ0ODEsImV4cCI6MjA2MjEzMDQ4MX0.rjqJXrI4JK3Hbqs4XiIun69DCp50WJMrTQN8dBwB0qE`,
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      return { data: result, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};