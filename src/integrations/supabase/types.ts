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
      attachments: {
        Row: {
          content_type: string
          created_at: string | null
          created_by: string
          data: string
          id: string
          label: string
          name: string
          vulnerability_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          created_by: string
          data: string
          id?: string
          label?: string
          name: string
          vulnerability_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          created_by?: string
          data?: string
          id?: string
          label?: string
          name?: string
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          created_by: string
          end_date: string
          id: string
          preparer: string
          reviewer: string
          scope: Json
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
          version: string | null
          version_history: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_date: string
          id?: string
          preparer: string
          reviewer: string
          scope?: Json
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
          version?: string | null
          version_history?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_date?: string
          id?: string
          preparer?: string
          reviewer?: string
          scope?: Json
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          version?: string | null
          version_history?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string | null
          username?: string
        }
        Relationships: []
      }
      vulndb: {
        Row: {
          background: string
          created_at: string | null
          created_by: string
          details: string
          id: string
          ref_links: Json | null
          remediation: string
          title: string
          updated_at: string | null
        }
        Insert: {
          background: string
          created_at?: string | null
          created_by: string
          details: string
          id?: string
          ref_links?: Json | null
          remediation: string
          title: string
          updated_at?: string | null
        }
        Update: {
          background?: string
          created_at?: string | null
          created_by?: string
          details?: string
          id?: string
          ref_links?: Json | null
          remediation?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vulndb_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vulndb_backup: {
        Row: {
          background: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          details: string | null
          id: string | null
          ref_links: Json | null
          remediation: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          background?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: string | null
          id?: string | null
          ref_links?: Json | null
          remediation?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          background?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: string | null
          id?: string | null
          ref_links?: Json | null
          remediation?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vulnerabilities: {
        Row: {
          affected_versions: Json | null
          background: string
          created_at: string | null
          created_by: string
          current_status: boolean | null
          cvss_score: number
          cvss_vector: string
          details: string
          display_order: number | null
          id: string
          poc_images: Json | null
          ref_links: Json | null
          remediation: string
          report_id: string
          request_response: Json | null
          retest_date: string | null
          retest_images: Json | null
          retest_result: string | null
          severity: string
          title: string
          updated_at: string | null
          vulnerability_id: string | null
        }
        Insert: {
          affected_versions?: Json | null
          background: string
          created_at?: string | null
          created_by: string
          current_status?: boolean | null
          cvss_score: number
          cvss_vector: string
          details: string
          display_order?: number | null
          id?: string
          poc_images?: Json | null
          ref_links?: Json | null
          remediation: string
          report_id: string
          request_response?: Json | null
          retest_date?: string | null
          retest_images?: Json | null
          retest_result?: string | null
          severity: string
          title: string
          updated_at?: string | null
          vulnerability_id?: string | null
        }
        Update: {
          affected_versions?: Json | null
          background?: string
          created_at?: string | null
          created_by?: string
          current_status?: boolean | null
          cvss_score?: number
          cvss_vector?: string
          details?: string
          display_order?: number | null
          id?: string
          poc_images?: Json | null
          ref_links?: Json | null
          remediation?: string
          report_id?: string
          request_response?: Json | null
          retest_date?: string | null
          retest_images?: Json | null
          retest_result?: string | null
          severity?: string
          title?: string
          updated_at?: string | null
          vulnerability_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
