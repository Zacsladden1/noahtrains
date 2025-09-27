CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  message text,
  stack text,
  url text,
  user_agent text,
  type text
);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert client error logs" ON client_error_logs;
CREATE POLICY "Admins can insert client error logs"
  ON client_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
