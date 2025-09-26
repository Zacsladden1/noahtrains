-- Allow coaches to create workouts and sets for their clients and view them

-- WORKOUTS: coaches can view and insert for their clients
DROP POLICY IF EXISTS "Coaches can view client workouts" ON workouts;
CREATE POLICY "Coaches can view client workouts"
  ON workouts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = workouts.user_id AND c.coach_id = auth.uid()
    ) OR
    (current_setting('jwt.claims.role', true) = 'admin')
  );

DROP POLICY IF EXISTS "Coaches can create client workouts" ON workouts;
CREATE POLICY "Coaches can create client workouts"
  ON workouts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = workouts.user_id AND c.coach_id = auth.uid()
    )
  );

-- WORKOUT SETS: coaches can view/insert for workouts that belong to their clients
DROP POLICY IF EXISTS "Coaches can view client workout sets" ON workout_sets;
CREATE POLICY "Coaches can view client workout sets"
  ON workout_sets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      JOIN clients c ON c.client_id = w.user_id
      WHERE w.id = workout_sets.workout_id AND (w.user_id = auth.uid() OR c.coach_id = auth.uid())
    ) OR (current_setting('jwt.claims.role', true) = 'admin')
  );

DROP POLICY IF EXISTS "Coaches can create client workout sets" ON workout_sets;
CREATE POLICY "Coaches can create client workout sets"
  ON workout_sets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts w
      JOIN clients c ON c.client_id = w.user_id
      WHERE w.id = workout_sets.workout_id AND (w.user_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );


