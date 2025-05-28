
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
      reports: {
        Row: {
          id: string
          title: string
          created_at: string
          updated_at: string
          start_date: string
          end_date: string
          preparer: string
          reviewer: string
          preparer_email: string
          reviewer_email: string
          scope: Json
          status: string
          version: string
          version_history: string
          created_by: string
        }
      }
    }
  }
}
