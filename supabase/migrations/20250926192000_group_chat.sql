-- Group chat tables
CREATE TABLE IF NOT EXISTS public.group_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_global boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group threads" ON public.group_threads;
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT TO authenticated
  USING (
    is_global = true OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.thread_id = group_threads.id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can manage group threads" ON public.group_threads;
CREATE POLICY "Coaches can manage group threads"
  ON public.group_threads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

-- Memberships
CREATE TABLE IF NOT EXISTS public.group_members (
  thread_id uuid REFERENCES public.group_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own membership" ON public.group_members;
CREATE POLICY "Users can view own membership"
  ON public.group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can manage memberships" ON public.group_members;
CREATE POLICY "Coaches can manage memberships"
  ON public.group_members FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('coach','admin'))
  );

-- Group messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.group_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
  ON public.group_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.thread_id = group_messages.thread_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.thread_id = group_messages.thread_id AND gm.user_id = auth.uid()
    )
  );

-- Create a single global community thread if none exists (idempotent)
INSERT INTO public.group_threads (name, is_global)
SELECT 'Community', true
WHERE NOT EXISTS (SELECT 1 FROM public.group_threads WHERE is_global = true);

