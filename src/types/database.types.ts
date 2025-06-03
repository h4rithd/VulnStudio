
export interface Reports {
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
  status: 'draft' | 'review' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
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
  status: 'draft' | 'review' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
  vulnerabilities_count: VulnerabilityCount;
  isTemporary?: boolean;
  is_retest?: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  user_metadata?: any;
  created_at?: string;
  first_login?: boolean;
  role?: string;
}

export interface VulnDB {
  id: string;
  title: string;
  background: string;
  details: string;
  remediation: string;
  ref_links: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  cvss_score: number;
  cvss_vector: string;
  background: string;
  details: string;
  remediation: string;
  ref_links: any[];
  affected_versions: any[];
  report_id: string;
  vulnerability_id?: string;
  display_order?: number;
  current_status?: boolean;
  request_response?: any;
  poc_images?: any[];
  retest_date?: string;
  retest_result?: string;
  retest_images?: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
  report_title?: string;
}

// Alias for compatibility
export type Vulnerabilities = Vulnerability;

export interface Attachment {
  id: string;
  vulnerability_id: string;
  name: string;
  label: string;
  data: string;
  content_type: string;
  created_by: string;
  created_at: string;
}

export interface Item {
  value: string;
  label?: string;
}

export interface VulnerabilityCount {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

// Additional types for compatibility
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: Reports;
        Insert: Omit<Reports, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Reports, 'id' | 'created_at' | 'updated_at'>>;
      };
      vulnerabilities: {
        Row: Vulnerability;
        Insert: Omit<Vulnerability, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Vulnerability, 'id' | 'created_at' | 'updated_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      vulndb: {
        Row: VulnDB;
        Insert: Omit<VulnDB, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VulnDB, 'id' | 'created_at' | 'updated_at'>>;
      };
      attachments: {
        Row: Attachment;
        Insert: Omit<Attachment, 'id' | 'created_at'>;
        Update: Partial<Omit<Attachment, 'id' | 'created_at'>>;
      };
    };
  };
}
