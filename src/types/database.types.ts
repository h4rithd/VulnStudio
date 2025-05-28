
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          vulnerability_id: string
          name: string
          label: string
          data: string
          content_type: string
          created_at: string | null
          created_by: string
        }
        Insert: {
          id?: string
          vulnerability_id: string
          name: string
          label?: string
          data: string
          content_type: string
          created_at?: string | null
          created_by: string
        }
        Update: {
          id?: string
          vulnerability_id?: string
          name?: string
          label?: string
          data?: string
          content_type?: string
          created_at?: string | null
          created_by?: string
        }
      }
      reports: {
        Row: {
          id: string
          title: string
          created_at: string | null
          updated_at: string | null
          start_date: string
          end_date: string
          preparer: string
          reviewer: string
          preparer_email: string | null
          reviewer_email: string | null
          scope: Json
          status: 'draft' | 'review' | 'completed' | 'archived'
          version: string | null
          version_history: string | null
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          created_at?: string | null
          updated_at?: string | null
          start_date: string
          end_date: string
          preparer: string
          reviewer: string
          preparer_email?: string | null
          reviewer_email?: string | null
          scope: Json
          status?: 'draft' | 'review' | 'completed' | 'archived'
          version?: string | null
          version_history?: string | null
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          created_at?: string | null
          updated_at?: string | null
          start_date?: string
          end_date?: string
          preparer?: string
          reviewer?: string
          preparer_email?: string | null
          reviewer_email?: string | null
          scope?: Json
          status?: 'draft' | 'review' | 'completed' | 'archived'
          version?: string | null
          version_history?: string | null
          created_by?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          username: string | null
          first_login: boolean | null
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          username?: string | null
          first_login?: boolean | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          username?: string | null
          first_login?: boolean | null
        }
      }
      vulndb: {
        Row: {
          id: string
          title: string
          background: string
          details: string
          remediation: string
          ref_links: Json | null
          created_at: string | null
          updated_at: string | null
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          background: string
          details: string
          remediation: string
          ref_links?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          background?: string
          details?: string
          remediation?: string
          ref_links?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string
        }
      }
      vulnerabilities: {
        Row: {
          id: string
          title: string
          severity: string
          cvss_score: number
          cvss_vector: string
          background: string
          details: string
          remediation: string
          ref_links: Json | null
          affected_versions: Json | null
          report_id: string
          vulnerability_id: string | null
          display_order: number | null
          current_status: boolean | null
          request_response: Json | null
          poc_images: Json | null
          retest_date: string | null
          retest_result: string | null
          retest_images: Json | null
          created_at: string | null
          updated_at: string | null
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          severity: string
          cvss_score: number
          cvss_vector: string
          background: string
          details: string
          remediation: string
          ref_links?: Json | null
          affected_versions?: Json | null
          report_id: string
          vulnerability_id?: string | null
          display_order?: number | null
          current_status?: boolean | null
          request_response?: Json | null
          poc_images?: Json | null
          retest_date?: string | null
          retest_result?: string | null
          retest_images?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          severity?: string
          cvss_score?: number
          cvss_vector?: string
          background?: string
          details?: string
          remediation?: string
          ref_links?: Json | null
          affected_versions?: Json | null
          report_id?: string
          vulnerability_id?: string | null
          display_order?: number | null
          current_status?: boolean | null
          request_response?: Json | null
          poc_images?: Json | null
          retest_date?: string | null
          retest_result?: string | null
          retest_images?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
