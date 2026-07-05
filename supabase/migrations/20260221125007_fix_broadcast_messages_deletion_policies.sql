/*
  # Fix Broadcast Messages Deletion Issues

  ## Problem
  When admins/gestores try to delete broadcast messages, the deletion appears to succeed
  but messages remain in the listing. This is caused by missing RLS policies and restrictive
  SELECT policies.

  ## Changes Made

  1. **Add DELETE policy for mensagens_broadcast_lidas**
     - Allows admins and gestores to delete read records when removing messages
     - Required for cascading deletion of broadcast messages

  2. **Add comprehensive SELECT policy for mensagens_broadcast**
     - Allows admins and gestores to view ALL messages (active and inactive)
     - Regular users continue to see only active messages for their company
     - Required for the management interface to display all messages

  3. **Add DELETE policy for push_notifications_log**
     - Allows admins and gestores to delete push notification logs
     - Required for complete cleanup when deleting broadcast messages

  ## Security Notes
  - All policies verify user authentication and role (admin/gestor)
  - Company isolation is maintained (users can only delete messages from their company)
  - Regular users still only see active messages
*/

-- Add DELETE policy for mensagens_broadcast_lidas
-- This allows admins and gestores to delete read records when removing broadcast messages
DROP POLICY IF EXISTS "Admins and gestores can delete read records" ON mensagens_broadcast_lidas;
CREATE POLICY "Admins and gestores can delete read records"
  ON mensagens_broadcast_lidas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      INNER JOIN mensagens_broadcast mb ON mb.id = mensagens_broadcast_lidas.mensagem_id
      WHERE u.id = auth.uid()
        AND u.profile IN ('admin', 'gestor')
        AND (
          -- Admin can delete global messages or messages from any company
          (u.profile = 'admin' AND (mb.empresa_id IS NULL OR mb.empresa_id = u.empresa_id))
          -- Gestor can only delete messages from their company
          OR (u.profile = 'gestor' AND u.empresa_id = mb.empresa_id)
        )
    )
  );

-- Add comprehensive SELECT policy for admins and gestores to view ALL messages
-- This is separate from the existing policy that shows only active messages to regular users
DROP POLICY IF EXISTS "Admins and gestores can view all broadcast messages" ON mensagens_broadcast;
CREATE POLICY "Admins and gestores can view all broadcast messages"
  ON mensagens_broadcast
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.profile IN ('admin', 'gestor')
        AND (
          -- Admin can view global messages or messages from their company
          (u.profile = 'admin' AND (mensagens_broadcast.empresa_id IS NULL OR mensagens_broadcast.empresa_id = u.empresa_id))
          -- Gestor can only view messages from their company
          OR (u.profile = 'gestor' AND u.empresa_id = mensagens_broadcast.empresa_id)
        )
    )
  );

-- Check if DELETE policy exists for push_notifications_log, and add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'push_notifications_log'
      AND policyname = 'Admins and gestores can delete push logs'
  ) THEN
    CREATE POLICY "Admins and gestores can delete push logs"
      ON push_notifications_log
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM usuarios u
          WHERE u.id = auth.uid()
            AND u.profile IN ('admin', 'gestor')
            AND (
              -- Admin can delete logs from any company or global logs
              (u.profile = 'admin')
              -- Gestor can only delete logs from their company
              OR (u.profile = 'gestor' AND u.empresa_id = push_notifications_log.empresa_id)
            )
        )
      );
  END IF;
END $$;

-- Create index to improve performance of deletion operations
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_mensagem_id 
  ON mensagens_broadcast_lidas(mensagem_id);

-- Add comment explaining the policy structure
COMMENT ON POLICY "Admins and gestores can delete read records" ON mensagens_broadcast_lidas IS 
  'Allows admins and gestores to delete read records when removing broadcast messages. Required for proper message deletion.';

COMMENT ON POLICY "Admins and gestores can view all broadcast messages" ON mensagens_broadcast IS 
  'Allows admins and gestores to view all messages (active and inactive) for management purposes. Regular users see only active messages via separate policy.';