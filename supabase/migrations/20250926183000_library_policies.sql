-- Ensure `videos` bucket exists and is public
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'videos') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
  ELSE
    UPDATE storage.buckets SET public = true WHERE id = 'videos';
  END IF;
END $$;

-- Storage policies for videos bucket
-- Allow read/listing of videos bucket
DROP POLICY IF EXISTS "read videos objects" ON storage.objects;
CREATE POLICY "read videos objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos');

-- Allow coach/admin to upload to videos bucket
DROP POLICY IF EXISTS "coach admin upload videos" ON storage.objects;
CREATE POLICY "coach admin upload videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

-- Allow coach/admin to update objects in videos bucket
DROP POLICY IF EXISTS "coach admin update videos" ON storage.objects;
CREATE POLICY "coach admin update videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'videos' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  )
  WITH CHECK (
    bucket_id = 'videos' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

-- Allow coach/admin to delete objects in videos bucket
DROP POLICY IF EXISTS "coach admin delete videos" ON storage.objects;
CREATE POLICY "coach admin delete videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

-- Application table policies for videos/documents management by coach/admin
DROP POLICY IF EXISTS "Coaches manage videos" ON videos;
CREATE POLICY "Coaches manage videos"
  ON videos FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

DROP POLICY IF EXISTS "Coaches manage documents" ON documents;
CREATE POLICY "Coaches manage documents"
  ON documents FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );


