-- Migration: Fix RLS policies to avoid querying profiles inside USING/WITH CHECK
-- Replaces checks that used: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- with JWT-claim-based role checks using current_setting('jwt.claims.role', true).
-- Run this migration against your database (or paste the ALTER statements into the SQL editor in Supabase).

-- Profiles
ALTER POLICY "Admins can view all profiles" ON profiles
  USING ((current_setting('jwt.claims.role', true) = 'admin'));

-- Clients
ALTER POLICY "Coaches can view their clients" ON clients
  USING (coach_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'admin');

-- Exercises
ALTER POLICY "Admins can manage exercises" ON exercises
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Programs
ALTER POLICY "Users can view assigned programs" ON programs
  USING (owner_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'admin');

ALTER POLICY "Admins can manage programs" ON programs
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Program days
ALTER POLICY "Users can view program days" ON program_days
  USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_id AND (
        p.owner_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'admin'
      )
    )
  );

ALTER POLICY "Admins can manage program days" ON program_days
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Program exercises
ALTER POLICY "Users can view program exercises" ON program_exercises
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON pd.program_id = p.id
      WHERE pd.id = day_id AND (
        p.owner_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'admin'
      )
    )
  );

ALTER POLICY "Admins can manage program exercises" ON program_exercises
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Workouts
ALTER POLICY "Admins can view all workouts" ON workouts
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Workout sets
ALTER POLICY "Admins can view all workout sets" ON workout_sets
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Nutrition logs
ALTER POLICY "Admins can view all nutrition logs" ON nutrition_logs
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Water logs
ALTER POLICY "Admins can view all water logs" ON water_logs
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Videos
ALTER POLICY "Authenticated users can view videos" ON videos
  USING (is_public = true OR current_setting('jwt.claims.role', true) = 'admin');

ALTER POLICY "Admins can manage videos" ON videos
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Documents
ALTER POLICY "Authenticated users can view documents" ON documents
  USING (is_public = true OR current_setting('jwt.claims.role', true) = 'admin');

ALTER POLICY "Admins can manage documents" ON documents
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Notifications
ALTER POLICY "Admins can create notifications" ON notifications
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin');

-- Payments
ALTER POLICY "Admins can view all payments" ON payments
  USING (current_setting('jwt.claims.role', true) = 'admin');

-- Notes:
-- 1) These ALTER statements assume your Auth system sets a JWT claim named 'role'. If not, adapt the claim path or implement a stable function to check admin membership.
-- 2) After applying, test your API requests. If you still get 500s about recursion, remove/adjust any remaining policies that reference 'profiles' in USING/WITH CHECK.


