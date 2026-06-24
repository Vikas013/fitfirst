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
      workouts: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          duration: number
          calories_burned: number
          notes: string | null
          logged_at: string
          canonical_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          activity_type: string
          duration: number
          calories_burned: number
          notes?: string | null
          logged_at?: string
          canonical_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          duration?: number
          calories_burned?: number
          notes?: string | null
          logged_at?: string
          canonical_id?: string | null
        }
      }
      daily_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          steps: number
          steps_goal: number
          calories_goal: number
          active_minutes: number
          active_minutes_goal: number
          water_intake: number
          water_goal: number
        }
        Insert: {
          id?: string
          user_id?: string
          date?: string
          steps?: number
          steps_goal?: number
          calories_goal?: number
          active_minutes?: number
          active_minutes_goal?: number
          water_intake?: number
          water_goal?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          steps?: number
          steps_goal?: number
          calories_goal?: number
          active_minutes?: number
          active_minutes_goal?: number
          water_intake?: number
          water_goal?: number
        }
      }
      profiles: {
        Row: {
          id: string
          onboarded: boolean
          date_of_birth: string | null
          gender: string | null
          unit_system: string
          height: number | null
          weight: number | null
          activity_level: string | null
          primary_goal: string | null
          default_steps_goal: number
          default_calories_goal: number
          default_minutes_goal: number
          default_water_goal: number
          updated_at: string
        }
        Insert: {
          id: string
          onboarded?: boolean
          date_of_birth?: string | null
          gender?: string | null
          unit_system?: string
          height?: number | null
          weight?: number | null
          activity_level?: string | null
          primary_goal?: string | null
          default_steps_goal?: number
          default_calories_goal?: number
          default_minutes_goal?: number
          default_water_goal?: number
          updated_at?: string
        }
        Update: {
          id?: string
          onboarded?: boolean
          date_of_birth?: string | null
          gender?: string | null
          unit_system?: string
          height?: number | null
          weight?: number | null
          activity_level?: string | null
          primary_goal?: string | null
          default_steps_goal?: number
          default_calories_goal?: number
          default_minutes_goal?: number
          default_water_goal?: number
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          embedding: any | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          embedding?: any | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          embedding?: any | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_canonical_exercises: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
