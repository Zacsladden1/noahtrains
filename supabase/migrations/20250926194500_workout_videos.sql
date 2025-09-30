-- Link workouts to library videos (e.g., form videos)

CREATE TABLE IF NOT EXISTS workout_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  kind text DEFAULT 'form', -- future-proof for other kinds (demo, warmup, etc.)
  created_at timestamptz DEFAULT now(),
  UNIQUE(workout_id, video_id, kind)
);

ALTER TABLE workout_videos ENABLE ROW LEVEL SECURITY;

-- Allow users to view videos for their own workouts
DROP POLICY IF EXISTS "Users can view own workout_videos" ON workout_videos;
CREATE POLICY "Users can view own workout_videos"
  ON workout_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

-- Allow users to manage their own workout video links
DROP POLICY IF EXISTS "Users can manage own workout_videos" ON workout_videos;
CREATE POLICY "Users can manage own workout_videos"
  ON workout_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

-- Admins can view/manage all
DROP POLICY IF EXISTS "Admins can manage workout_videos" ON workout_videos;
CREATE POLICY "Admins can manage workout_videos"
  ON workout_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_workout_videos_workout ON workout_videos(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_videos_video ON workout_videos(video_id);


