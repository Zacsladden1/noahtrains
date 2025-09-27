-- Add onboarding and profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_weight_kg numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_weight_kg numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Create weight_logs for historical weights
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users manage own weight logs
DROP POLICY IF EXISTS "Users can manage own weight logs" ON weight_logs;
CREATE POLICY "Users can manage own weight logs"
  ON weight_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coaches can view client weight logs
DROP POLICY IF EXISTS "Coaches can view client weight logs" ON weight_logs;
CREATE POLICY "Coaches can view client weight logs"
  ON weight_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = weight_logs.user_id AND c.coach_id = auth.uid()
    )
  );
