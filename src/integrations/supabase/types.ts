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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      communities: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_groups: {
        Row: {
          allowed_message_roles: string[] | null
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allowed_message_roles?: string[] | null
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allowed_message_roles?: string[] | null
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_groups_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          name: string
          order_index: number
          updated_at: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          name: string
          order_index?: number
          updated_at?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          name?: string
          order_index?: number
          updated_at?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          checkout_url: string | null
          community_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          community_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          community_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups: {
        Row: {
          created_at: string
          event_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "conversation_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          google_calendar_invited: boolean
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          google_calendar_invited?: boolean
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          google_calendar_invited?: boolean
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          actual_study_notes: string | null
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id: string | null
          id: string
          social_media_link: string | null
          study_status: string | null
          study_topic: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          actual_study_notes?: string | null
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          event_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id?: string | null
          id?: string
          social_media_link?: string | null
          study_status?: string | null
          study_topic?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          actual_study_notes?: string | null
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id?: string | null
          id?: string
          social_media_link?: string | null
          study_status?: string | null
          study_topic?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "conversation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_schedules: {
        Row: {
          confirmed_by: string | null
          created_at: string
          id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_configuration: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          item_key: string
          item_type: string
          label: string | null
          order_index: number
          parent_key: string | null
          route: string | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          item_key: string
          item_type: string
          label?: string | null
          order_index: number
          parent_key?: string | null
          route?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          item_key?: string
          item_type?: string
          label?: string | null
          order_index?: number
          parent_key?: string | null
          route?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      message_read_status: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          community_id: string
          content: string
          created_at: string
          group_id: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "conversation_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: string | null
          created_at: string
          description: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          description: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          community_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          community_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          community_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_default_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_default_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "conversation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_default_groups_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          last_active_at: string | null
          monitoring_day_of_week: number | null
          monitoring_frequency: string | null
          monitoring_time: string | null
          name: string
          phone: string | null
          study_days: number[] | null
          study_goals: string[] | null
          study_schedule: Json | null
          updated_at: string
          weekly_submissions_limit: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id: string
          last_active_at?: string | null
          monitoring_day_of_week?: number | null
          monitoring_frequency?: string | null
          monitoring_time?: string | null
          name: string
          phone?: string | null
          study_days?: number[] | null
          study_goals?: string[] | null
          study_schedule?: Json | null
          updated_at?: string
          weekly_submissions_limit?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_active_at?: string | null
          monitoring_day_of_week?: number | null
          monitoring_frequency?: string | null
          monitoring_time?: string | null
          name?: string
          phone?: string | null
          study_days?: number[] | null
          study_goals?: string[] | null
          study_schedule?: Json | null
          updated_at?: string
          weekly_submissions_limit?: number | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          bpm: number | null
          community_id: string
          created_at: string
          effective_key: string | null
          extra_notes: string | null
          grade: number | null
          harmonic_field: string | null
          id: string
          melodic_reference: string | null
          recording_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          song_name: string | null
          status: string
          student_id: string
          task_name: string
          teacher_comments: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          bpm?: number | null
          community_id: string
          created_at?: string
          effective_key?: string | null
          extra_notes?: string | null
          grade?: number | null
          harmonic_field?: string | null
          id?: string
          melodic_reference?: string | null
          recording_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          song_name?: string | null
          status?: string
          student_id: string
          task_name: string
          teacher_comments?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          bpm?: number | null
          community_id?: string
          created_at?: string
          effective_key?: string | null
          extra_notes?: string | null
          grade?: number | null
          harmonic_field?: string | null
          id?: string
          melodic_reference?: string | null
          recording_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          song_name?: string | null
          status?: string
          student_id?: string
          task_name?: string
          teacher_comments?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_frequency: string | null
          checkout_url: string | null
          created_at: string
          description: string | null
          id: string
          monitoring_frequency: string | null
          monthly_corrections_limit: number | null
          monthly_monitorings_limit: number | null
          name: string
          price: number
          updated_at: string
          weekly_corrections_limit: number | null
        }
        Insert: {
          billing_frequency?: string | null
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          monitoring_frequency?: string | null
          monthly_corrections_limit?: number | null
          monthly_monitorings_limit?: number | null
          name: string
          price: number
          updated_at?: string
          weekly_corrections_limit?: number | null
        }
        Update: {
          billing_frequency?: string | null
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          monitoring_frequency?: string | null
          monthly_corrections_limit?: number | null
          monthly_monitorings_limit?: number | null
          name?: string
          price?: number
          updated_at?: string
          weekly_corrections_limit?: number | null
        }
        Relationships: []
      }
      user_course_access: {
        Row: {
          course_id: string
          created_at: string
          end_date: string
          granted_by: string
          id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          end_date: string
          granted_by: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          end_date?: string
          granted_by?: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_menu_order: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          order_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          order_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          order_index?: number
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          created_at: string
          custom_price: number | null
          due_day: number | null
          end_date: string
          id: string
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          due_day?: number | null
          end_date: string
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          due_day?: number | null
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      format_name: { Args: { name_text: string }; Returns: string }
      get_unread_count: {
        Args: { _group_id: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin" | "guest" | "visitor"
      event_type:
        | "interview"
        | "mentoring"
        | "group_study"
        | "live"
        | "individual_study"
      payment_status: "pending" | "confirmed" | "overdue" | "cancelled"
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
      app_role: ["student", "teacher", "admin", "guest", "visitor"],
      event_type: [
        "interview",
        "mentoring",
        "group_study",
        "live",
        "individual_study",
      ],
      payment_status: ["pending", "confirmed", "overdue", "cancelled"],
    },
  },
} as const
