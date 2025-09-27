-- Safety guards in case the previous migration hasn't run yet
CREATE TABLE IF NOT EXISTS public.group_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_global boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  thread_id uuid REFERENCES public.group_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- Ensure global community thread exists and enroll all profiles
DO $$
DECLARE tid uuid;
BEGIN
  SELECT id INTO tid FROM public.group_threads WHERE is_global = true LIMIT 1;
  IF tid IS NULL THEN
    INSERT INTO public.group_threads (name, is_global) VALUES ('Community', true) RETURNING id INTO tid;
  END IF;
  -- Insert memberships for all profiles not yet members
  INSERT INTO public.group_members (thread_id, user_id)
  SELECT tid, p.id FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.thread_id = tid AND gm.user_id = p.id
  );
END $$;

