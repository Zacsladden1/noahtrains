ALTER TABLE IF EXISTS message_threads
  ADD COLUMN IF NOT EXISTS last_viewed_by_coach_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_by_client_at timestamptz;
