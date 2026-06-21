export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          resource: string
          resource_id: string | null
          detail: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          resource: string
          resource_id?: string | null
          detail?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          resource?: string
          resource_id?: string | null
          detail?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      ai_chat_answer_cache: {
        Row: {
          answer_text: string
          created_at: string
          hit_count: number
          last_hit_at: string | null
          question_hash: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          hit_count?: number
          last_hit_at?: string | null
          question_hash: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          hit_count?: number
          last_hit_at?: string | null
          question_hash?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          credits: number
          id: string
          unlimited_credits: boolean
          unlimited_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          id?: string
          unlimited_credits?: boolean
          unlimited_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          id?: string
          unlimited_credits?: boolean
          unlimited_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      racecard_download_events: {
        Row: {
          created_at: string
          id: string
          racecard_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          racecard_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          racecard_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "racecard_download_events_racecard_id_fkey"
            columns: ["racecard_id"]
            isOneToOne: false
            referencedRelation: "racecards"
            referencedColumns: ["id"]
          },
        ]
      }
      racecard_downloads: {
        Row: {
          created_at: string
          id: string
          racecard_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          racecard_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          racecard_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "racecard_downloads_racecard_id_fkey"
            columns: ["racecard_id"]
            isOneToOne: false
            referencedRelation: "racecards"
            referencedColumns: ["id"]
          },
        ]
      }
      racecards: {
        Row: {
          created_at: string
          digitization_error: string | null
          digitization_status: string
          digitization_updated_at: string | null
          digitized_at: string | null
          file_name: string
          file_url: string
          id: string
          metadata: Json
          metadata_updated_at: string | null
          num_races: number | null
          race_date: string
          track_code: string
          track_name: string
          textract_job_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          digitization_error?: string | null
          digitization_status?: string
          digitization_updated_at?: string | null
          digitized_at?: string | null
          file_name: string
          file_url: string
          id?: string
          metadata?: Json
          metadata_updated_at?: string | null
          num_races?: number | null
          race_date: string
          track_code: string
          track_name: string
          textract_job_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          digitization_error?: string | null
          digitization_status?: string
          digitization_updated_at?: string | null
          digitized_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          metadata?: Json
          metadata_updated_at?: string | null
          num_races?: number | null
          race_date?: string
          track_code?: string
          track_name?: string
          textract_job_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      racecard_predictions: {
        Row: {
          algorithm: string
          created_at: string
          horse_name: string
          horse_number: string | null
          id: string
          ocr_confidence: number | null
          odds: string | null
          race_number: number
          racecard_id: string
          rank: number
          raw_text: string | null
          score: number | null
        }
        Insert: {
          algorithm: string
          created_at?: string
          horse_name: string
          horse_number?: string | null
          id?: string
          ocr_confidence?: number | null
          odds?: string | null
          race_number: number
          racecard_id: string
          rank: number
          raw_text?: string | null
          score?: number | null
        }
        Update: {
          algorithm?: string
          created_at?: string
          horse_name?: string
          horse_number?: string | null
          id?: string
          ocr_confidence?: number | null
          odds?: string | null
          race_number?: number
          racecard_id?: string
          rank?: number
          raw_text?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "racecard_predictions_racecard_id_fkey"
            columns: ["racecard_id"]
            isOneToOne: false
            referencedRelation: "racecards"
            referencedColumns: ["id"]
          },
        ]
      }
      racetrack_profiles: {
        Row: {
          display_name: string
          latitude: number | null
          longitude: number | null
          official_url: string | null
          timezone: string | null
          track_code: string
          updated_at: string
        }
        Insert: {
          display_name: string
          latitude?: number | null
          longitude?: number | null
          official_url?: string | null
          timezone?: string | null
          track_code: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          latitude?: number | null
          longitude?: number | null
          official_url?: string | null
          timezone?: string | null
          track_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          credits: number
          id: string
          package_name: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          unlimited_credits: boolean
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          id?: string
          package_name: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          unlimited_credits?: boolean
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          id?: string
          package_name?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          unlimited_credits?: boolean
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string
          category: string
          subject: string | null
          message: string
          user_id: string | null
          status: string
          admin_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          category: string
          subject?: string | null
          message: string
          user_id?: string | null
          status?: string
          admin_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          category?: string
          subject?: string | null
          message?: string
          user_id?: string | null
          status?: string
          admin_notes?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          delta: number
          balance_after: number
          entry_type: string
          ref_id: string | null
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          delta: number
          balance_after: number
          entry_type: string
          ref_id?: string | null
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          delta?: number
          balance_after?: number
          entry_type?: string
          ref_id?: string | null
          meta?: Json
          created_at?: string
        }
        Relationships: []
      }
      feedback_credit_offers: {
        Row: {
          id: string
          user_id: string
          email: string
          offer_token: string
          source: string
          sent_at: string | null
          responded_at: string | null
          credited_at: string | null
          response_message: string | null
          credit_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          offer_token?: string
          source?: string
          sent_at?: string | null
          responded_at?: string | null
          credited_at?: string | null
          response_message?: string | null
          credit_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          offer_token?: string
          source?: string
          sent_at?: string | null
          responded_at?: string | null
          credited_at?: string | null
          response_message?: string | null
          credit_amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          id: string
          slug: string
          html: string | null
          css: string | null
          created_at: string
          updated_at: string
          title: string | null
          published: boolean
          meta_description: string | null
        }
        Insert: {
          id?: string
          slug: string
          html?: string | null
          css?: string | null
          created_at?: string
          updated_at?: string
          title?: string | null
          published?: boolean
          meta_description?: string | null
        }
        Update: {
          id?: string
          slug?: string
          html?: string | null
          css?: string | null
          created_at?: string
          updated_at?: string
          title?: string | null
          published?: boolean
          meta_description?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          body: string
          updated_at: string
        }
        Insert: {
          key: string
          body: string
          updated_at?: string
        }
        Update: {
          key?: string
          body?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_analytics_events: {
        Row: {
          id: string
          created_at: string
          event_name: string
          visitor_id: string
          session_id: string
          user_id: string | null
          path: string | null
          page_title: string | null
          referrer: string | null
          referrer_host: string | null
          source: string
          medium: string
          campaign: string | null
          content: string | null
          term: string | null
          device_type: "desktop" | "tablet" | "mobile"
          is_new_visitor: boolean
          first_seen_at: string
          properties: Json
        }
        Insert: {
          id?: string
          created_at?: string
          event_name: string
          visitor_id: string
          session_id: string
          user_id?: string | null
          path?: string | null
          page_title?: string | null
          referrer?: string | null
          referrer_host?: string | null
          source?: string
          medium?: string
          campaign?: string | null
          content?: string | null
          term?: string | null
          device_type?: "desktop" | "tablet" | "mobile"
          is_new_visitor?: boolean
          first_seen_at?: string
          properties?: Json
        }
        Update: {
          id?: string
          created_at?: string
          event_name?: string
          visitor_id?: string
          session_id?: string
          user_id?: string | null
          path?: string | null
          page_title?: string | null
          referrer?: string | null
          referrer_host?: string | null
          source?: string
          medium?: string
          campaign?: string | null
          content?: string | null
          term?: string | null
          device_type?: "desktop" | "tablet" | "mobile"
          is_new_visitor?: boolean
          first_seen_at?: string
          properties?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      racecards_public: {
        Row: {
          id: string
          track_name: string
          track_code: string
          race_date: string
          num_races: number | null
          file_name: string
          uploaded_by: string | null
          created_at: string
          updated_at: string
          metadata: Json
          metadata_updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_transactions_before: {
        Args: { _cutoff: string }
        Returns: number
      }
      admin_add_credits: {
        Args: {
          _user_id: string
          _amount: number
        }
        Returns: number
      }
      admin_set_unlimited_credits: {
        Args: {
          _unlimited: boolean
          _user_id: string
        }
        Returns: null
      }
      claim_feedback_credit: {
        Args: {
          p_offer_token: string | null
          p_message: string
        }
        Returns: {
          already_claimed: boolean
          credited: boolean
          new_balance: number
        }[]
      }
      deduct_credit_if_sufficient: {
        Args: {
          p_racecard_id: string
          p_required_credits?: number
          p_user_id: string
        }
        Returns: {
          already_owned: boolean
          new_balance: number
          success: boolean
        }[]
      }
      grant_unlimited_credits_atomic: {
        Args: {
          p_meta?: Json
          p_ref_id: string | null
          p_user_id: string
        }
        Returns: null
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
