-- Allow coaches to view their clients' nutrition and water logs, and manage client targets

-- NUTRITION LOGS: coaches can SELECT logs of their clients
DROP POLICY IF EXISTS "Coaches can view client nutrition logs" ON nutrition_logs;
CREATE POLICY "Coaches can view client nutrition logs"
  ON nutrition_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = nutrition_logs.user_id AND c.coach_id = auth.uid()
    )
  );

-- WATER LOGS: coaches can SELECT logs of their clients
DROP POLICY IF EXISTS "Coaches can view client water logs" ON water_logs;
CREATE POLICY "Coaches can view client water logs"
  ON water_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = water_logs.user_id AND c.coach_id = auth.uid()
    )
  );

-- NUTRITION TARGETS: coaches can view and upsert targets for their clients
DROP POLICY IF EXISTS "Coaches can view client targets" ON nutrition_targets;
CREATE POLICY "Coaches can view client targets"
  ON nutrition_targets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = nutrition_targets.user_id AND c.coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can manage client targets" ON nutrition_targets;
CREATE POLICY "Coaches can manage client targets"
  ON nutrition_targets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = nutrition_targets.user_id AND c.coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can update client targets" ON nutrition_targets;
CREATE POLICY "Coaches can update client targets"
  ON nutrition_targets FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = nutrition_targets.user_id AND c.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = nutrition_targets.user_id AND c.coach_id = auth.uid()
    )
  );


