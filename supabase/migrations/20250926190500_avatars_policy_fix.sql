-- Fix avatars bucket policies using correct POSITION() argument order

-- Recreate manage policy
DROP POLICY IF EXISTS "Users can manage own avatars" ON storage.objects;
CREATE POLICY "Users can manage own avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      position((auth.uid() || '/') in name) = 1
    )
  )
  WITH CHECK (
    bucket_id = 'avatars' AND (
      position((auth.uid() || '/') in name) = 1
    )
  );

-- Ensure view policy remains
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
