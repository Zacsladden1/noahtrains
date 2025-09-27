-- Create 'avatars' storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload and manage their own avatar files
DROP POLICY IF EXISTS "Users can manage own avatars" ON storage.objects;
CREATE POLICY "Users can manage own avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      -- allow user to manage files under their user folder (name is the object path)
      (position(name in (auth.uid() || '/')) = 1)
    )
  )
  WITH CHECK (
    bucket_id = 'avatars' AND (
      (position(name in (auth.uid() || '/')) = 1)
    )
  );

-- Allow all authenticated users to view avatars
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
