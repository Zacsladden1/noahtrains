-- Enable coach access to profiles, threads, and messages

-- PROFILES: coaches can view client profiles (and everyone still sees own profile)
DROP POLICY IF EXISTS "Coaches can view client profiles" ON profiles;
CREATE POLICY "Coaches can view client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    (
      role = 'client' AND
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin')
      )
    )
  );

-- MESSAGE THREADS: coach and client can view/create their threads
ALTER TABLE IF EXISTS message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach and client can view threads" ON message_threads;
CREATE POLICY "Coach and client can view threads"
  ON message_threads FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR client_id = auth.uid());

DROP POLICY IF EXISTS "Coach and client can create threads" ON message_threads;
CREATE POLICY "Coach and client can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid() OR client_id = auth.uid());

-- MESSAGES: coach and client can view/insert within their threads
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach and client can view messages" ON messages;
CREATE POLICY "Coach and client can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = thread_id AND (mt.coach_id = auth.uid() OR mt.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coach and client can send messages" ON messages;
CREATE POLICY "Coach and client can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = thread_id AND (mt.coach_id = auth.uid() OR mt.client_id = auth.uid())
    )
  );
