-- Allow users to delete their own messages and related attachments

-- Messages delete policy
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- Attachments delete policy when the underlying message belongs to the user
DROP POLICY IF EXISTS "Users can delete attachments of own messages" ON attachments;
CREATE POLICY "Users can delete attachments of own messages"
  ON attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = attachments.message_id AND m.sender_id = auth.uid()
    )
  );


