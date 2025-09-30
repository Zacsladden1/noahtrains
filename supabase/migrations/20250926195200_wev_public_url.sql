-- Denormalize video data onto workout_exercise_videos for client-side access without joining videos

ALTER TABLE IF EXISTS workout_exercise_videos
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS video_title text;


