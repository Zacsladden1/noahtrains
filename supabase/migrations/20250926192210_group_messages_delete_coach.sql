-- Allow coaches/admins to delete any community message
ALTER TABLE IF EXISTS public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can delete group messages" ON public.group_messages;
CREATE POLICY "Coaches can delete group messages"
  ON public.group_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('coach','admin')
    )
  );


