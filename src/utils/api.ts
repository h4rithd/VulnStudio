// API configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Decode JWT token to get user info
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Get user roles from token
const getUserRolesFromToken = (): string[] => {
  const token = getToken();
  if (!token) return [];
  
  const decoded = decodeToken(token);
  return decoded?.roles || [];
};

// Check if user has specific role
const hasRole = (role: string): boolean => {
  const roles = getUserRolesFromToken();
  return roles.includes(role);
};

// Check if user is admin
const isAdmin = (): boolean => {
  return hasRole('admin');
};

// Check if user is auditor
const isAuditor = (): boolean => {
  return hasRole('auditor');
};

// List of public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/settings/database/status',
  '/health'
];

// Check if endpoint is public
const isPublicEndpoint = (endpoint: string): boolean => {
  return PUBLIC_ENDPOINTS.some(publicEndpoint => endpoint.includes(publicEndpoint));
};

// API request helper with token validation
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Only add Authorization header if token exists and endpoint is not public
  if (token && !isPublicEndpoint(endpoint)) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log('[API] Making request to:', `${API_BASE_URL}${endpoint}`);
  console.log('[API] Request method:', options.method || 'GET');
  console.log('[API] Request headers:', headers);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    console.log('[API] Response status:', response.status);
    console.log('[API] Response ok:', response.ok);
    console.log('[API] Response type:', response.type);

    // Handle authentication errors only for non-public endpoints
    if ((response.status === 401 || response.status === 403) && !isPublicEndpoint(endpoint)) {
      console.log('[API] Authentication failed (401/403), clearing token');
      removeToken();
      console.log('[API] Redirecting to login due to 401/403');
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error: any) {
    console.log('[API] Request failed:', error);
    
    // Handle different types of errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('[API] Network error - server may be down or CORS misconfigured');
      throw new Error('Unable to connect to server. Please ensure the backend is running on http://localhost:3000');
    }
    
    // For public endpoints, don't redirect on auth errors
    if (isPublicEndpoint(endpoint) && (error.message === 'Authentication failed' || error.message.includes('401'))) {
      console.log('[API] Public endpoint auth error, not redirecting');
      throw new Error('Server request failed');
    }
    
    // If it's a network error or token validation error for protected endpoints, clear session
    if (error.message === 'Authentication failed' || error.message.includes('Invalid token')) {
      removeToken();
      window.location.href = '/login';
    }
    throw error;
  }
};

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

export interface ProjectWithVulnerabilities {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  preparer: string;
  preparer_email: string;
  reviewer: string;
  reviewer_email: string;
  version: string;
  version_history: any;
  scope: any;
  status: 'draft' | 'review' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  vulnerabilities_count: VulnerabilityCount;
  isTemporary?: boolean;
  is_retest?: boolean;
}

// Authentication API
export const authApi = {
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse<any>> {
    try {
      console.log('[AuthAPI] Signing up user:', email);
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name: metadata?.name
        }),
      });
      
      if (data.success && data.data.token) {
        setToken(data.data.token);
      }
      
      return data;
    } catch (error: any) {
      console.log('[AuthAPI] Signup error:', error.message);
      return { error: error.message, success: false };
    }
  },

  async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    try {
      console.log('[AuthAPI] Signing in user:', email);
      const data = await apiRequest('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (data.success && data.data.token) {
        setToken(data.data.token);
      }
      
      return data;
    } catch (error: any) {
      console.log('[AuthAPI] Signin error:', error.message);
      return { error: error.message, success: false };
    }
  },

  async signOut(): Promise<ApiResponse<void>> {
    try {
      removeToken();
      return { success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getCurrentUser() {
    try {
      const token = getToken();
      if (!token) {
        return { data: null, success: true };
      }
      
      const decoded = decodeToken(token);
      if (!decoded) {
        removeToken();
        return { data: null, success: true };
      }
      
      return { 
        data: { 
          id: decoded.id, 
          email: decoded.email,
          name: decoded.name,
          roles: decoded.roles || [],
          user_metadata: {}
        }, 
        success: true 
      };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getCurrentSession() {
    try {
      const token = getToken();
      if (!token) {
        return { data: null, success: true };
      }
      
      const decoded = decodeToken(token);
      if (!decoded) {
        removeToken();
        return { data: null, success: true };
      }
      
      return { 
        data: { 
          user: { 
            id: decoded.id, 
            email: decoded.email,
            name: decoded.name,
            roles: decoded.roles || []
          },
          access_token: token
        }, 
        success: true 
      };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  onAuthStateChange(callback: (event: any, session: any) => void) {
    const token = getToken();
    let session = null;
    
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        session = {
          user: { 
            id: decoded.id, 
            email: decoded.email,
            name: decoded.name,
            roles: decoded.roles || []
          },
          access_token: token
        };
      }
    }
    
    setTimeout(() => {
      callback('INITIAL_SESSION', session);
    }, 100);
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getUserRoles(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const roles = getUserRolesFromToken();
      return { data: roles, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Export role checking utilities
export { hasRole, isAdmin, isAuditor, getUserRolesFromToken };

// Reports/Projects API
export const reportsApi = {
  async getAll(): Promise<ApiResponse<ProjectWithVulnerabilities[]>> {
    try {
      const data = await apiRequest('/reports');
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/reports/${id}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(report: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify(report),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/reports/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getVulnerabilityCountsForReport(reportId: string): Promise<VulnerabilityCount> {
    try {
      const data = await apiRequest(`/reports/${reportId}/vulnerability-counts`);
      return data.data;
    } catch (error) {
      return { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    }
  },
  
  async duplicateProject(projectId: string, newTitle: string, newVersion: string, type: 'duplicate' | 'retest'): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/reports/${projectId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ newTitle, newVersion, type }),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async exportDatabase(): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/export`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      return { data: blob, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async importDatabase(data: any): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Import database error:', error);
      return { success: false, error: error.message };
    }
  }
};

// Vulnerabilities API
export const vulnerabilitiesApi = {
  async getByReportId(reportId: string): Promise<ApiResponse<any[]>> {
    try {
      const data = await apiRequest(`/vulnerabilities/report/${reportId}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/vulnerabilities/${id}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(vulnerability: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/vulnerabilities', {
        method: 'POST',
        body: JSON.stringify(vulnerability),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/vulnerabilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/vulnerabilities/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// VulnDB API
export const vulnDbApi = {
  async search(searchTerm: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const data = await apiRequest(`/vulndb/search?search_term=${encodeURIComponent(searchTerm)}&limit=${limit}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const data = await apiRequest('/vulndb');
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/vulndb/${id}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(vulnDb: any): Promise<ApiResponse<any>> {
    try {
      const payload = {
        title: vulnDb.title,
        description: vulnDb.background,
        severity: vulnDb.severity || 'medium',
        impact: vulnDb.details,
        recommendation: vulnDb.remediation,
        references: vulnDb.ref_links || [],
        vulnerability_id: vulnDb.vulnerability_id,
        cvss_score: vulnDb.cvss_score
      };

      const data = await apiRequest('/vulndb', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const payload = {
        title: updates.title,
        description: updates.background,
        severity: updates.severity || 'medium',
        impact: updates.details,
        recommendation: updates.remediation,
        references: updates.ref_links || [],
        vulnerability_id: updates.vulnerability_id,
        cvss_score: updates.cvss_score
      };

      const data = await apiRequest(`/vulndb/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/vulndb/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async exportVulnDB(): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${API_BASE_URL}/vulndb/export`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      return { data: blob, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async importVulnDB(jsonData: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest('/vulndb/import', {
        method: 'POST',
        body: jsonData,
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Users API
export const usersApi = {
  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const data = await apiRequest('/users');
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/users/${id}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(user: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/users/admin', {
        method: 'POST',
        body: JSON.stringify(user),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async update(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/users/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async updateRole(userId: string, role: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async createAdmin(user: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/users/admin', {
        method: 'POST',
        body: JSON.stringify(user),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async exportDatabase(): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/export`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      return { data: blob, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },
  
  async importDatabase(jsonData: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest('/reports/import', {
        method: 'POST',
        body: jsonData,
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Settings API
export const settingsApi = {
  async getDatabaseSettings(): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/settings/database');
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async updateDatabaseSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/settings/database', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async testDatabaseConnection(settings: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/settings/database/test', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async getDatabaseStatus(): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/settings/database/status');
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

// Edge Functions API (alias for users API for compatibility)
export const edgeFunctionsApi = {
  async createAdminUser(user: any): Promise<ApiResponse<any>> {
    return usersApi.createAdmin(user);
  }
};

// Attachments API
export const attachmentsApi = {
  async getByVulnerabilityId(vulnerabilityId: string): Promise<ApiResponse<any[]>> {
    try {
      const data = await apiRequest(`/attachments/${vulnerabilityId}`);
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async create(attachment: any): Promise<ApiResponse<any>> {
    try {
      const data = await apiRequest('/attachments', {
        method: 'POST',
        body: JSON.stringify(attachment),
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await apiRequest(`/attachments/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }
};

function getAuthToken() {
  return getToken();
}
