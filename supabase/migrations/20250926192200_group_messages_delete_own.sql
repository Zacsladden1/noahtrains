-- Allow users to delete their own group messages
ALTER TABLE IF EXISTS public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can delete own group messages" ON public.group_messages;
CREATE POLICY "Members can delete own group messages"
  ON public.group_messages FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
  );


