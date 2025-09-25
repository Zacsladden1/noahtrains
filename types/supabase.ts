export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'client' | 'coach';
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'client' | 'coach';
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'client' | 'coach';
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          instructions: string | null;
          video_url: string | null;
          image_url: string | null;
          muscle_groups: string[] | null;
          equipment: string[] | null;
          categories: string[] | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          instructions?: string | null;
          video_url?: string | null;
          image_url?: string | null;
          muscle_groups?: string[] | null;
          equipment?: string[] | null;
          categories?: string[] | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          instructions?: string | null;
          video_url?: string | null;
          image_url?: string | null;
          muscle_groups?: string[] | null;
          equipment?: string[] | null;
          categories?: string[] | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          program_id: string | null;
          day_id: string | null;
          name: string | null;
          status: 'planned' | 'in_progress' | 'completed';
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id?: string | null;
          day_id?: string | null;
          name?: string | null;
          status?: 'planned' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_id?: string | null;
          day_id?: string | null;
          name?: string | null;
          status?: 'planned' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string | null;
          set_index: number | null;
          reps: number | null;
          weight_kg: number | null;
          rir: number | null;
          tempo: string | null;
          notes: string | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id?: string | null;
          set_index?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          rir?: number | null;
          tempo?: string | null;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string | null;
          set_index?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          rir?: number | null;
          tempo?: string | null;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
        };
      };
      nutrition_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          meal: string | null;
          food_name: string;
          brand: string | null;
          barcode: string | null;
          serving_qty: number | null;
          serving_unit: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          sugar_g: number | null;
          sodium_mg: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          meal?: string | null;
          food_name: string;
          brand?: string | null;
          barcode?: string | null;
          serving_qty?: number | null;
          serving_unit?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          meal?: string | null;
          food_name?: string;
          brand?: string | null;
          barcode?: string | null;
          serving_qty?: number | null;
          serving_unit?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          created_at?: string;
        };
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          ml: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          ml: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          ml?: number;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          tags: string[] | null;
          storage_path: string;
          thumbnail_path: string | null;
          duration_seconds: number | null;
          is_public: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string | null;
          tags?: string[] | null;
          storage_path: string;
          thumbnail_path?: string | null;
          duration_seconds?: number | null;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          tags?: string[] | null;
          storage_path?: string;
          thumbnail_path?: string | null;
          duration_seconds?: number | null;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          tags: string[] | null;
          storage_path: string;
          file_type: string | null;
          file_size: number | null;
          is_public: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string | null;
          tags?: string[] | null;
          storage_path: string;
          file_type?: string | null;
          file_size?: number | null;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          tags?: string[] | null;
          storage_path?: string;
          file_type?: string | null;
          file_size?: number | null;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      nutrition_targets: {
        Row: {
          user_id: string;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          water_ml: number | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          water_ml?: number | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          water_ml?: number | null;
          updated_at?: string;
        };
      };
    };
  };
};

export type UserRole = 'admin' | 'client' | 'coach';
export type WorkoutStatus = 'planned' | 'in_progress' | 'completed';

// Utility types for common data structures
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type NutritionLog = Database['public']['Tables']['nutrition_logs']['Row'];
export type WaterLog = Database['public']['Tables']['water_logs']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Video = Database['public']['Tables']['videos']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type NutritionTargets = Database['public']['Tables']['nutrition_targets']['Row'];