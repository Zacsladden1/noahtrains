/*
# Noahhtrains Fitness App Database Schema

## Overview
Complete database schema for the Noahhtrains fitness tracking platform with role-based access control.

## Tables Created
1. **profiles** - User profiles with role management
2. **clients** - Client-coach relationships
3. **exercises** - Exercise database with video references
4. **programs** - Workout programs and templates
5. **program_days** - Daily workout structure
6. **program_exercises** - Exercise assignments within programs
7. **workouts** - Individual workout sessions
8. **workout_sets** - Set-by-set logging
9. **nutrition_logs** - Food intake tracking
10. **water_logs** - Hydration tracking
11. **messages** - Chat system
12. **message_threads** - Conversation management
13. **attachments** - Media file references
14. **videos** - Video library
15. **documents** - Document library
16. **notifications** - In-app notifications
17. **payments** - Stripe payment tracking

## Security
- Row Level Security (RLS) enabled on all tables
- Role-based access policies
- Secure client-coach data separation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'client', 'coach');
CREATE TYPE workout_status AS ENUM ('planned', 'in_progress', 'completed');
CREATE TYPE payment_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete');
CREATE TYPE notification_type AS ENUM ('message', 'workout_assigned', 'payment_reminder', 'announcement');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'client',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admin policy: avoid querying the same table inside the USING clause to prevent
-- recursive evaluation. Prefer checking a JWT claim or a dedicated function.
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    -- If your Auth provider adds a 'role' claim to the JWT, check it here.
    -- Adjust the claim path/name if your setup differs.
    (current_setting('jwt.claims.role', true) = 'admin')
  );

-- Clients table (coach-client relationships)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  goals jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, coach_id)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own relationship"
  ON clients FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Coaches can view their clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  instructions text,
  video_url text,
  image_url text,
  muscle_groups text[],
  equipment text[],
  categories text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage exercises"
  ON exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_template boolean DEFAULT true,
  owner_id uuid REFERENCES profiles(id),
  duration_weeks integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assigned programs"
  ON programs FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage programs"
  ON programs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Program days table
CREATE TABLE IF NOT EXISTS program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  day_index integer NOT NULL,
  title text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view program days"
  ON program_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM programs p 
      WHERE p.id = program_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Admins can manage program days"
  ON program_days FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Program exercises table
CREATE TABLE IF NOT EXISTS program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid REFERENCES program_days(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  order_index integer,
  sets integer,
  reps text, -- Can be "8-12" or "AMRAP" etc
  weight_kg numeric,
  rir integer, -- Reps in reserve
  tempo text,
  rest_seconds integer,
  notes text,
  superset_group text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view program exercises"
  ON program_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON pd.program_id = p.id
      WHERE pd.id = day_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Admins can manage program exercises"
  ON program_exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id),
  day_id uuid REFERENCES program_days(id),
  name text,
  status workout_status DEFAULT 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own workouts"
  ON workouts FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Workout sets table
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  set_index integer,
  reps integer,
  weight_kg numeric,
  rir integer,
  tempo text,
  notes text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout sets"
  ON workout_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own workout sets"
  ON workout_sets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all workout sets"
  ON workout_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Nutrition logs table
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  meal text, -- breakfast, lunch, dinner, snacks
  food_name text NOT NULL,
  brand text,
  barcode text,
  serving_qty numeric DEFAULT 1,
  serving_unit text DEFAULT 'serving',
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nutrition logs"
  ON nutrition_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all nutrition logs"
  ON nutrition_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Water logs table
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  ml integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own water logs"
  ON water_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all water logs"
  ON water_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Message threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, coach_id)
);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads"
  ON message_threads FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR coach_id = auth.uid());

CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid() OR coach_id = auth.uid());

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  body text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own threads"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_threads mt 
      WHERE mt.id = thread_id AND (mt.client_id = auth.uid() OR mt.coach_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in own threads"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM message_threads mt 
      WHERE mt.id = thread_id AND (mt.client_id = auth.uid() OR mt.coach_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in own messages"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN message_threads mt ON m.thread_id = mt.id
      WHERE m.id = message_id AND (mt.client_id = auth.uid() OR mt.coach_id = auth.uid())
    )
  );

CREATE POLICY "Users can create attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN message_threads mt ON m.thread_id = mt.id
      WHERE m.id = message_id AND (mt.client_id = auth.uid() OR mt.coach_id = auth.uid())
    )
  );

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  tags text[],
  storage_path text NOT NULL,
  thumbnail_path text,
  duration_seconds integer,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view videos"
  ON videos FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage videos"
  ON videos FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  tags text[],
  storage_path text NOT NULL,
  file_type text,
  file_size integer,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type,
  title text NOT NULL,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status payment_status DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_invoice_status text,
  amount_due integer,
  currency text DEFAULT 'usd',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_created_at ON workouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications(user_id, created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();