-- Link individual workout sets/exercises to library videos

CREATE TABLE IF NOT EXISTS workout_exercise_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_label text, -- label captured from set template (e.g., "Bench press")
  set_index integer,   -- optional: link to a specific set index, nullable for group-level
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  kind text DEFAULT 'form',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_exercise_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workout_exercise_videos" ON workout_exercise_videos;
CREATE POLICY "Users can view own workout_exercise_videos"
  ON workout_exercise_videos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own workout_exercise_videos" ON workout_exercise_videos;
CREATE POLICY "Users can manage own workout_exercise_videos"
  ON workout_exercise_videos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage workout_exercise_videos" ON workout_exercise_videos;
CREATE POLICY "Admins can manage workout_exercise_videos"
  ON workout_exercise_videos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_wev_workout ON workout_exercise_videos(workout_id);
CREATE INDEX IF NOT EXISTS idx_wev_video ON workout_exercise_videos(video_id);


