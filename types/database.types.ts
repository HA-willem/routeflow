export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_proposals: {
        Row: {
          agent: Database["public"]["Enums"]["agent_name"]
          agent_run_id: string
          alternatives: string
          approval_status: Database["public"]["Enums"]["proposal_approval_status"]
          business_rules: Json
          company_id: string
          confidence: number
          created_at: string
          data_sources: Json
          decided_at: string | null
          decided_by: string | null
          expected_gain: string
          id: string
          impact: string
          impacted_employee_ids: string[]
          impacted_job_ids: string[]
          payload: Json | null
          reasoning: string
          scheduled_date: string
          severity: Database["public"]["Enums"]["proposal_severity"]
          summary: string
          title: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_name"]
          agent_run_id: string
          alternatives: string
          approval_status?: Database["public"]["Enums"]["proposal_approval_status"]
          business_rules?: Json
          company_id: string
          confidence: number
          created_at?: string
          data_sources?: Json
          decided_at?: string | null
          decided_by?: string | null
          expected_gain: string
          id?: string
          impact: string
          impacted_employee_ids?: string[]
          impacted_job_ids?: string[]
          payload?: Json | null
          reasoning: string
          scheduled_date: string
          severity?: Database["public"]["Enums"]["proposal_severity"]
          summary: string
          title: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_name"]
          agent_run_id?: string
          alternatives?: string
          approval_status?: Database["public"]["Enums"]["proposal_approval_status"]
          business_rules?: Json
          company_id?: string
          confidence?: number
          created_at?: string
          data_sources?: Json
          decided_at?: string | null
          decided_by?: string | null
          expected_gain?: string
          id?: string
          impact?: string
          impacted_employee_ids?: string[]
          impacted_job_ids?: string[]
          payload?: Json | null
          reasoning?: string
          scheduled_date?: string
          severity?: Database["public"]["Enums"]["proposal_severity"]
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_proposals_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent: Database["public"]["Enums"]["agent_name"]
          candidate_count: number
          company_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          result: Database["public"]["Enums"]["agent_run_result"] | null
          started_at: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_name"]
          candidate_count?: number
          company_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          result?: Database["public"]["Enums"]["agent_run_result"] | null
          started_at?: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_name"]
          candidate_count?: number
          company_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          result?: Database["public"]["Enums"]["agent_run_result"] | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          agent: Database["public"]["Enums"]["agent_name"]
          automation_level: Database["public"]["Enums"]["automation_level"]
          company_id: string
          confidence_threshold: number
          updated_at: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_name"]
          automation_level?: Database["public"]["Enums"]["automation_level"]
          company_id: string
          confidence_threshold?: number
          updated_at?: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_name"]
          automation_level?: Database["public"]["Enums"]["automation_level"]
          company_id?: string
          confidence_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          company_id: string
          created_at: string
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          feature: string
          id?: string
          input_tokens: number
          model: string
          output_tokens: number
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          id: string
          reason: string | null
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          id?: string
          reason?: string | null
          status: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          archived_at: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          config_json: Json
          created_at: string
          id: string
          industry: string | null
          instant_invoice_on_complete: boolean
          max_employees: number
          name: string
          slug: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          config_json?: Json
          created_at?: string
          id?: string
          industry?: string | null
          instant_invoice_on_complete?: boolean
          max_employees?: number
          name: string
          slug: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          config_json?: Json
          created_at?: string
          id?: string
          industry?: string | null
          instant_invoice_on_complete?: boolean
          max_employees?: number
          name?: string
          slug?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      correction_log: {
        Row: {
          company_id: string
          correction_type: Database["public"]["Enums"]["correction_type"]
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          company_id: string
          correction_type: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          company_id?: string
          correction_type?: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "correction_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          billing_preference: Database["public"]["Enums"]["billing_preference"]
          company_id: string
          created_at: string
          email: string | null
          email_opt_in: boolean
          id: string
          kvk_number: string | null
          name: string
          notes: string | null
          payment_terms_days: number
          phone: string | null
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
          vat_number: string | null
          whatsapp_number: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          archived_at?: string | null
          billing_preference?: Database["public"]["Enums"]["billing_preference"]
          company_id: string
          created_at?: string
          email?: string | null
          email_opt_in?: boolean
          id?: string
          kvk_number?: string | null
          name: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          type: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          vat_number?: string | null
          whatsapp_number?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          archived_at?: string | null
          billing_preference?: Database["public"]["Enums"]["billing_preference"]
          company_id?: string
          created_at?: string
          email?: string | null
          email_opt_in?: boolean
          id?: string
          kvk_number?: string | null
          name?: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          vat_number?: string | null
          whatsapp_number?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      distance_cache: {
        Row: {
          cached_at: string
          distance_meters: number
          drive_time_seconds: number
          from_object_id: string
          profile: string
          provider: string
          to_object_id: string
        }
        Insert: {
          cached_at?: string
          distance_meters: number
          drive_time_seconds: number
          from_object_id: string
          profile?: string
          provider: string
          to_object_id: string
        }
        Update: {
          cached_at?: string
          distance_meters?: number
          drive_time_seconds?: number
          from_object_id?: string
          profile?: string
          provider?: string
          to_object_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          company_id: string
          context: string | null
          created_at: string
          description: string
          id: string
          linked_proposal_id: string | null
          status: Database["public"]["Enums"]["feature_request_status"]
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          context?: string | null
          created_at?: string
          description: string
          id?: string
          linked_proposal_id?: string | null
          status?: Database["public"]["Enums"]["feature_request_status"]
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          context?: string | null
          created_at?: string
          description?: string
          id?: string
          linked_proposal_id?: string | null
          status?: Database["public"]["Enums"]["feature_request_status"]
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_linked_proposal_id_fkey"
            columns: ["linked_proposal_id"]
            isOneToOne: false
            referencedRelation: "platform_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          error_count: number
          error_log: Json
          finished_at: string | null
          id: string
          status: Database["public"]["Enums"]["import_job_status"]
          success_count: number
          total_rows: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          error_count?: number
          error_log?: Json
          finished_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["import_job_status"]
          success_count?: number
          total_rows?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          error_count?: number
          error_log?: Json
          finished_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["import_job_status"]
          success_count?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          employee_id: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          employee_id: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          company_id: string
          description: string
          id: string
          invoice_id: string
          job_id: string | null
          quantity: number
          sequence: number
          service_id: string | null
          total_amount_cents: number
          unit_price_cents: number
          vat_amount_cents: number
          vat_rate: number
        }
        Insert: {
          company_id: string
          description: string
          id?: string
          invoice_id: string
          job_id?: string | null
          quantity?: number
          sequence?: number
          service_id?: string | null
          total_amount_cents: number
          unit_price_cents: number
          vat_amount_cents: number
          vat_rate: number
        }
        Update: {
          company_id?: string
          description?: string
          id?: string
          invoice_id?: string
          job_id?: string | null
          quantity?: number
          sequence?: number
          service_id?: string | null
          total_amount_cents?: number
          unit_price_cents?: number
          vat_amount_cents?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_number_counters: {
        Row: {
          company_id: string
          last_seq: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          last_seq?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          last_seq?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          parent_invoice_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount_cents: number
          total_tax_cents: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          customer_id: string
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          parent_invoice_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount_cents?: number
          total_tax_cents?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          parent_invoice_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount_cents?: number
          total_tax_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parent_invoice_id_fkey"
            columns: ["parent_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          company_id: string
          created_at: string
          id: string
          job_id: string
          storage_path: string
          taken_at: string
          type: Database["public"]["Enums"]["job_photo_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          job_id: string
          storage_path: string
          taken_at?: string
          type: Database["public"]["Enums"]["job_photo_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string
          storage_path?: string
          taken_at?: string
          type?: Database["public"]["Enums"]["job_photo_type"]
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_duration_minutes: number | null
          arrival_time: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          distance_from_prev_m: number | null
          drive_time_from_prev_sec: number | null
          estimated_duration_minutes: number
          id: string
          locked: boolean
          locked_reason: string | null
          locked_until: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          route_id: string | null
          scheduled_date: string
          sequence: number | null
          service_agreement_id: string
          service_end: string | null
          service_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          arrival_time?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          distance_from_prev_m?: number | null
          drive_time_from_prev_sec?: number | null
          estimated_duration_minutes: number
          id?: string
          locked?: boolean
          locked_reason?: string | null
          locked_until?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          route_id?: string | null
          scheduled_date: string
          sequence?: number | null
          service_agreement_id: string
          service_end?: string | null
          service_start?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          arrival_time?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          distance_from_prev_m?: number | null
          drive_time_from_prev_sec?: number | null
          estimated_duration_minutes?: number
          id?: string
          locked?: boolean
          locked_reason?: string | null
          locked_until?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          route_id?: string | null
          scheduled_date?: string
          sequence?: number | null
          service_agreement_id?: string
          service_end?: string | null
          service_start?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_agreement_id_fkey"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      objects: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          archived_at: string | null
          city: string
          company_id: string
          country_code: string
          created_at: string
          customer_id: string
          id: string
          location: unknown
          location_status: Database["public"]["Enums"]["object_location_status"]
          postal_code: string
          type: Database["public"]["Enums"]["object_type"]
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          archived_at?: string | null
          city: string
          company_id: string
          country_code?: string
          created_at?: string
          customer_id: string
          id?: string
          location?: unknown
          location_status?: Database["public"]["Enums"]["object_location_status"]
          postal_code: string
          type: Database["public"]["Enums"]["object_type"]
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          archived_at?: string | null
          city?: string
          company_id?: string
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          location?: unknown
          location_status?: Database["public"]["Enums"]["object_location_status"]
          postal_code?: string
          type?: Database["public"]["Enums"]["object_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_proposals: {
        Row: {
          alternatives_considered: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          linked_feature_request_ids: string[]
          pr_url: string | null
          risk_level: Database["public"]["Enums"]["proposal_risk_level"]
          status: Database["public"]["Enums"]["platform_proposal_status"]
          title: string
          trigger_summary: string
        }
        Insert: {
          alternatives_considered?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          linked_feature_request_ids?: string[]
          pr_url?: string | null
          risk_level?: Database["public"]["Enums"]["proposal_risk_level"]
          status?: Database["public"]["Enums"]["platform_proposal_status"]
          title: string
          trigger_summary: string
        }
        Update: {
          alternatives_considered?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          linked_feature_request_ids?: string[]
          pr_url?: string | null
          risk_level?: Database["public"]["Enums"]["proposal_risk_level"]
          status?: Database["public"]["Enums"]["platform_proposal_status"]
          title?: string
          trigger_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricings: {
        Row: {
          amount_cents: number | null
          billing_period: Database["public"]["Enums"]["billing_period"]
          billing_timing: Database["public"]["Enums"]["billing_timing"] | null
          company_id: string
          created_at: string
          hourly_rate_cents: number | null
          id: string
          included_jobs_per_period: number | null
          overage_amount_cents: number | null
          punch_card_remaining: number | null
          punch_card_total: number | null
          type: Database["public"]["Enums"]["pricing_type"]
          updated_at: string
          vat_rate: number
        }
        Insert: {
          amount_cents?: number | null
          billing_period?: Database["public"]["Enums"]["billing_period"]
          billing_timing?: Database["public"]["Enums"]["billing_timing"] | null
          company_id: string
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          included_jobs_per_period?: number | null
          overage_amount_cents?: number | null
          punch_card_remaining?: number | null
          punch_card_total?: number | null
          type: Database["public"]["Enums"]["pricing_type"]
          updated_at?: string
          vat_rate: number
        }
        Update: {
          amount_cents?: number | null
          billing_period?: Database["public"]["Enums"]["billing_period"]
          billing_timing?: Database["public"]["Enums"]["billing_timing"] | null
          company_id?: string
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          included_jobs_per_period?: number | null
          overage_amount_cents?: number | null
          punch_card_remaining?: number | null
          punch_card_total?: number | null
          type?: Database["public"]["Enums"]["pricing_type"]
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          optimization_score: number | null
          route_date: string
          sequence_version: number
          total_distance_meters: number | null
          total_drive_time_minutes: number | null
          total_work_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          optimization_score?: number | null
          route_date: string
          sequence_version?: number
          total_distance_meters?: number | null
          total_drive_time_minutes?: number | null
          total_work_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          optimization_score?: number | null
          route_date?: string
          sequence_version?: number
          total_distance_meters?: number | null
          total_drive_time_minutes?: number | null
          total_work_time_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          call_ahead_required: boolean
          company_id: string
          created_at: string
          ended_at: string | null
          exclude_dates: string[] | null
          flexibility_window_days: number
          frequency_interval_days: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          id: string
          last_completed_job_id: string | null
          next_ideal_date: string | null
          object_id: string
          paused_until: string | null
          preferred_day: number | null
          preferred_daypart: Database["public"]["Enums"]["daypart"] | null
          pricing_id: string
          service_id: string
          status: Database["public"]["Enums"]["service_agreement_status"]
          updated_at: string
        }
        Insert: {
          call_ahead_required?: boolean
          company_id: string
          created_at?: string
          ended_at?: string | null
          exclude_dates?: string[] | null
          flexibility_window_days?: number
          frequency_interval_days?: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          id?: string
          last_completed_job_id?: string | null
          next_ideal_date?: string | null
          object_id: string
          paused_until?: string | null
          preferred_day?: number | null
          preferred_daypart?: Database["public"]["Enums"]["daypart"] | null
          pricing_id: string
          service_id: string
          status?: Database["public"]["Enums"]["service_agreement_status"]
          updated_at?: string
        }
        Update: {
          call_ahead_required?: boolean
          company_id?: string
          created_at?: string
          ended_at?: string | null
          exclude_dates?: string[] | null
          flexibility_window_days?: number
          frequency_interval_days?: number | null
          frequency_type?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          last_completed_job_id?: string | null
          next_ideal_date?: string | null
          object_id?: string
          paused_until?: string | null
          preferred_day?: number | null
          preferred_daypart?: Database["public"]["Enums"]["daypart"] | null
          pricing_id?: string
          service_id?: string
          status?: Database["public"]["Enums"]["service_agreement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_last_completed_job_id_fkey"
            columns: ["last_completed_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "pricings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          color_hex: string | null
          company_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_weather_sensitive: boolean
          name: string
          standard_duration_minutes: number
          standard_price_cents: number
          updated_at: string
          vat_rate: number
          weather_sensitivity_type:
            | Database["public"]["Enums"]["weather_sensitivity_type"]
            | null
        }
        Insert: {
          archived_at?: string | null
          color_hex?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_weather_sensitive?: boolean
          name: string
          standard_duration_minutes: number
          standard_price_cents: number
          updated_at?: string
          vat_rate?: number
          weather_sensitivity_type?:
            | Database["public"]["Enums"]["weather_sensitivity_type"]
            | null
        }
        Update: {
          archived_at?: string | null
          color_hex?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_weather_sensitive?: boolean
          name?: string
          standard_duration_minutes?: number
          standard_price_cents?: number
          updated_at?: string
          vat_rate?: number
          weather_sensitivity_type?:
            | Database["public"]["Enums"]["weather_sensitivity_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_invoice_periods: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          period_end: string
          period_start: string
          service_agreement_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          period_end: string
          period_start: string
          service_agreement_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          period_end?: string
          period_start?: string
          service_agreement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoice_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoice_periods_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoice_periods_service_agreement_id_fkey"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weerdata_cache: {
        Row: {
          area_key: string
          cached_at: string
          forecast_date: string
          id: string
          min_temp_celsius: number | null
          precipitation_mm_per_hour: number | null
          precipitation_probability: number | null
          provider: string
          wind_bft: number | null
        }
        Insert: {
          area_key: string
          cached_at?: string
          forecast_date: string
          id?: string
          min_temp_celsius?: number | null
          precipitation_mm_per_hour?: number | null
          precipitation_probability?: number | null
          provider: string
          wind_bft?: number | null
        }
        Update: {
          area_key?: string
          cached_at?: string
          forecast_date?: string
          id?: string
          min_temp_celsius?: number | null
          precipitation_mm_per_hour?: number | null
          precipitation_probability?: number | null
          provider?: string
          wind_bft?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_employee_invite: {
        Args: { p_token: string }
        Returns: {
          archived_at: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          config_json: Json
          created_at: string
          id: string
          industry: string | null
          instant_invoice_on_complete: boolean
          max_employees: number
          name: string
          slug: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      complete_job: {
        Args: { p_job_id: string; p_notes?: string }
        Returns: Json
      }
      create_credit_invoice: {
        Args: { p_invoice_id: string; p_lines: Json; p_note?: string }
        Returns: {
          company_id: string
          created_at: string
          currency: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          parent_invoice_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount_cents: number
          total_tax_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_company_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      decide_agent_proposal: {
        Args: {
          p_approval_status: Database["public"]["Enums"]["proposal_approval_status"]
          p_proposal_id: string
        }
        Returns: {
          agent: Database["public"]["Enums"]["agent_name"]
          agent_run_id: string
          alternatives: string
          approval_status: Database["public"]["Enums"]["proposal_approval_status"]
          business_rules: Json
          company_id: string
          confidence: number
          created_at: string
          data_sources: Json
          decided_at: string | null
          decided_by: string | null
          expected_gain: string
          id: string
          impact: string
          impacted_employee_ids: string[]
          impacted_job_ids: string[]
          payload: Json | null
          reasoning: string
          scheduled_date: string
          severity: Database["public"]["Enums"]["proposal_severity"]
          summary: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "agent_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_platform_proposal: {
        Args: {
          p_proposal_id: string
          p_status: Database["public"]["Enums"]["platform_proposal_status"]
        }
        Returns: {
          alternatives_considered: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          linked_feature_request_ids: string[]
          pr_url: string | null
          risk_level: Database["public"]["Enums"]["proposal_risk_level"]
          status: Database["public"]["Enums"]["platform_proposal_status"]
          title: string
          trigger_summary: string
        }
        SetofOptions: {
          from: "*"
          to: "platform_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_subscription_invoices: { Args: never; Returns: number }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_cron_job_status: {
        Args: never
        Returns: {
          job_name: string
          last_end_time: string
          last_return_message: string
          last_start_time: string
          last_status: string
        }[]
      }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          company_name: string
          email: string
          valid: boolean
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_platform_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_invoice_paid: {
        Args: { p_invoice_id: string }
        Returns: {
          company_id: string
          created_at: string
          currency: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          parent_invoice_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount_cents: number
          total_tax_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_job_not_home: {
        Args: { p_job_id: string; p_reason?: string }
        Returns: {
          actual_duration_minutes: number | null
          arrival_time: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          distance_from_prev_m: number | null
          drive_time_from_prev_sec: number | null
          estimated_duration_minutes: number
          id: string
          locked: boolean
          locked_reason: string | null
          locked_until: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          route_id: string | null
          scheduled_date: string
          sequence: number | null
          service_agreement_id: string
          service_end: string | null
          service_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_platform_proposal_merged: {
        Args: { p_proposal_id: string }
        Returns: {
          alternatives_considered: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          linked_feature_request_ids: string[]
          pr_url: string | null
          risk_level: Database["public"]["Enums"]["proposal_risk_level"]
          status: Database["public"]["Enums"]["platform_proposal_status"]
          title: string
          trigger_summary: string
        }
        SetofOptions: {
          from: "*"
          to: "platform_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_invoice_number: {
        Args: { p_company_code: string; p_year: number }
        Returns: string
      }
      onboard_company: {
        Args: { company_name: string; owner_full_name: string }
        Returns: {
          archived_at: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          config_json: Json
          created_at: string
          id: string
          industry: string | null
          instant_invoice_on_complete: boolean
          max_employees: number
          name: string
          slug: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pause_job: {
        Args: { p_job_id: string }
        Returns: {
          actual_duration_minutes: number | null
          arrival_time: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          distance_from_prev_m: number | null
          drive_time_from_prev_sec: number | null
          estimated_duration_minutes: number
          id: string
          locked: boolean
          locked_reason: string | null
          locked_until: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          route_id: string | null
          scheduled_date: string
          sequence: number | null
          service_agreement_id: string
          service_end: string | null
          service_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      resume_job: {
        Args: { p_job_id: string }
        Returns: {
          actual_duration_minutes: number | null
          arrival_time: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          distance_from_prev_m: number | null
          drive_time_from_prev_sec: number | null
          estimated_duration_minutes: number
          id: string
          locked: boolean
          locked_reason: string | null
          locked_until: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          route_id: string | null
          scheduled_date: string
          sequence: number | null
          service_agreement_id: string
          service_end: string | null
          service_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_nightly_agent_orchestrator: { Args: never; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_job: {
        Args: { p_job_id: string }
        Returns: {
          actual_duration_minutes: number | null
          arrival_time: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          distance_from_prev_m: number | null
          drive_time_from_prev_sec: number | null
          estimated_duration_minutes: number
          id: string
          locked: boolean
          locked_reason: string | null
          locked_until: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          route_id: string | null
          scheduled_date: string
          sequence: number | null
          service_agreement_id: string
          service_end: string | null
          service_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      agent_name:
        | "planning"
        | "replanning"
        | "weather"
        | "communication"
        | "invoice"
        | "capacity"
        | "revenue"
        | "optimization"
      agent_run_result: "success" | "failed" | "partial"
      automation_level: "proposal" | "semi_automatic" | "fully_automatic"
      availability_status: "available" | "sick" | "leave"
      billing_period: "per_job" | "weekly" | "monthly" | "quarterly"
      billing_preference: "email" | "whatsapp" | "post"
      billing_timing: "advance" | "arrears"
      company_type: "zzp" | "mkb"
      correction_type: "moved" | "rejected_proposal"
      customer_type: "person" | "business"
      daypart: "morning" | "afternoon"
      feature_request_status:
        | "nieuw"
        | "getrieerd"
        | "voorgesteld"
        | "afgewezen"
        | "gepland"
        | "gebouwd"
      frequency_type:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "once"
        | "custom"
      import_job_status: "running" | "completed" | "failed"
      invoice_status: "draft" | "sent" | "paid"
      job_photo_type: "before" | "after"
      job_status:
        | "proposed"
        | "planned"
        | "en_route"
        | "completed"
        | "invoiced"
        | "not_home"
        | "cancelled"
        | "rescheduling"
      object_location_status: "geocoded" | "manual" | "failed"
      object_type: "residence" | "commercial" | "complex" | "other"
      platform_proposal_status: "open" | "approved" | "rejected" | "merged"
      pricing_type: "per_job" | "hourly" | "subscription" | "punch_card"
      proposal_approval_status:
        | "proposed"
        | "approved"
        | "rejected"
        | "expired"
        | "auto_executed"
      proposal_risk_level: "normal" | "high_risk"
      proposal_severity: "info" | "attention" | "urgent"
      service_agreement_status: "active" | "paused" | "ended"
      subscription_tier: "starter" | "pro" | "enterprise"
      user_role: "owner" | "admin" | "planner" | "administration" | "employee"
      weather_sensitivity_type: "rain" | "frost" | "wind"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agent_name: [
        "planning",
        "replanning",
        "weather",
        "communication",
        "invoice",
        "capacity",
        "revenue",
        "optimization",
      ],
      agent_run_result: ["success", "failed", "partial"],
      automation_level: ["proposal", "semi_automatic", "fully_automatic"],
      availability_status: ["available", "sick", "leave"],
      billing_period: ["per_job", "weekly", "monthly", "quarterly"],
      billing_preference: ["email", "whatsapp", "post"],
      billing_timing: ["advance", "arrears"],
      company_type: ["zzp", "mkb"],
      correction_type: ["moved", "rejected_proposal"],
      customer_type: ["person", "business"],
      daypart: ["morning", "afternoon"],
      feature_request_status: [
        "nieuw",
        "getrieerd",
        "voorgesteld",
        "afgewezen",
        "gepland",
        "gebouwd",
      ],
      frequency_type: [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
        "once",
        "custom",
      ],
      import_job_status: ["running", "completed", "failed"],
      invoice_status: ["draft", "sent", "paid"],
      job_photo_type: ["before", "after"],
      job_status: [
        "proposed",
        "planned",
        "en_route",
        "completed",
        "invoiced",
        "not_home",
        "cancelled",
        "rescheduling",
      ],
      object_location_status: ["geocoded", "manual", "failed"],
      object_type: ["residence", "commercial", "complex", "other"],
      platform_proposal_status: ["open", "approved", "rejected", "merged"],
      pricing_type: ["per_job", "hourly", "subscription", "punch_card"],
      proposal_approval_status: [
        "proposed",
        "approved",
        "rejected",
        "expired",
        "auto_executed",
      ],
      proposal_risk_level: ["normal", "high_risk"],
      proposal_severity: ["info", "attention", "urgent"],
      service_agreement_status: ["active", "paused", "ended"],
      subscription_tier: ["starter", "pro", "enterprise"],
      user_role: ["owner", "admin", "planner", "administration", "employee"],
      weather_sensitivity_type: ["rain", "frost", "wind"],
    },
  },
} as const

