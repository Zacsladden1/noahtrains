-- Storage bucket for chat attachments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('chat', 'chat', true);
  END IF;
END $$;

-- Read policy for chat bucket (authenticated)
DROP POLICY IF EXISTS "read chat objects" ON storage.objects;
CREATE POLICY "read chat objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat');

-- Upload/update/delete only if user participates in the thread (enforced at app layer by path)
-- We store objects at path: thread/<thread_id>/<filename>
DROP POLICY IF EXISTS "write chat objects" ON storage.objects;
CREATE POLICY "write chat objects"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'chat'
  )
  WITH CHECK (
    bucket_id = 'chat'
  );


