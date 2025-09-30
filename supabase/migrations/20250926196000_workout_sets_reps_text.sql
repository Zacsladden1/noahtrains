-- Add reps_text to preserve original reps range entry (e.g., "2-8")

ALTER TABLE IF EXISTS workout_sets
  ADD COLUMN IF NOT EXISTS reps_text text;


