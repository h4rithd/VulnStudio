export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string
          role: 'admin' | 'auditor'
          username: string
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          name: string
          role?: 'admin' | 'auditor'
          username: string
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string
          role?: 'admin' | 'auditor'
          username?: string
        }
      }
      reports: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          start_date: string
          end_date: string
          preparer: string
          reviewer: string
          scope: Json
          status: 'draft' | 'review' | 'completed' | 'archived'
          version: string
          version_history: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          start_date: string
          end_date: string
          preparer: string
          reviewer: string
          scope: Json
          status?: 'draft' | 'review' | 'completed' | 'archived'
          version?: string
          version_history?: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          start_date?: string
          end_date?: string
          preparer?: string
          reviewer?: string
          scope?: Json
          status?: 'draft' | 'review' | 'completed' | 'archived'
          version?: string
          version_history?: string
          created_by?: string
        }
      }
      vulnerabilities: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          report_id: string
          title: string
          description: string
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
          cvss_score: number
          cvss_vector: string
          affected_versions: Json
          background: string
          details: string
          remediation: string
          ref_links: Json
          request_response: Json
          created_by: string
          poc_images: Json
          display_order: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          report_id: string
          title: string
          description: string
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
          cvss_score: number
          cvss_vector: string
          affected_versions?: Json
          background: string
          details: string
          remediation: string
          ref_links?: Json
          request_response?: Json
          created_by: string
          poc_images?: Json
          display_order?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          report_id?: string
          title?: string
          description?: string
          severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
          cvss_score?: number
          cvss_vector?: string
          affected_versions?: Json
          background?: string
          details?: string
          remediation?: string
          ref_links?: Json
          request_response?: Json
          created_by?: string
          poc_images?: Json
          display_order?: number
        }
      }
      vulnDB: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          background: string
          details: string
          remediation: string
          ref_links: Json
          created_by: string
          category: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          background: string
          details: string
          remediation: string
          ref_links?: Json
          created_by: string
          category: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          background?: string
          details?: string
          remediation?: string
          ref_links?: Json
          created_by?: string
          category?: string
        }
      }
      attachments: {
        Row: {
          id: string
          created_at: string
          vulnerability_id: string
          name: string
          content_type: string
          data: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          vulnerability_id: string
          name: string
          content_type: string
          data: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          vulnerability_id?: string
          name?: string
          content_type?: string
          data?: string
          created_by?: string
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables']
export type Users = Tables['users']['Row']
export type Reports = Tables['reports']['Row']
export type Vulnerabilities = Tables['vulnerabilities']['Row']
export type VulnDB = Tables['vulnDB']['Row']
export type Attachments = Tables['attachments']['Row']
