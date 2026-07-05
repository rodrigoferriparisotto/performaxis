/*
  # Fix mensagens_broadcast SELECT Policy NULL Handling

  ## Problem
  The SELECT policy "Admins and gestores can view all broadcast messages" has NULL 
  comparison issues. Super admins with empresa_id = NULL cannot view global messages
  with empresa_id = NULL because the condition uses = operator which fails with NULLs.

  ## Solution
  Rewrite the SELECT policy to explicitly handle NULL cases for super admins.

  ## Changes
  1. Drop and recreate SELECT policy with explicit NULL handling
*/

-- Drop existing SELECT policy for admins and gestores
DROP POLICY IF EXISTS "Admins and gestores can view all broadcast messages" ON mensagens_broadcast;

-- Create new SELECT policy with proper NULL handling
CREATE POLICY "Admins and gestores can view all broadcast messages"
  ON mensagens_broadcast
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = auth.uid()
        AND (
          -- Super admin (empresa_id IS NULL) can view global messages
          (u.profile = 'admin' 
           AND u.empresa_id IS NULL 
           AND mensagens_broadcast.empresa_id IS NULL)
          -- Company admin can view their company's messages
          OR (u.profile = 'admin' 
              AND u.empresa_id IS NOT NULL 
              AND u.empresa_id = mensagens_broadcast.empresa_id)
          -- Gestor can view their company's messages
          OR (u.profile = 'gestor' 
              AND u.empresa_id IS NOT NULL
              AND u.empresa_id = mensagens_broadcast.empresa_id)
        )
    )
  );

-- Add comment explaining the NULL handling
COMMENT ON POLICY "Admins and gestores can view all broadcast messages" ON mensagens_broadcast IS 
  'Allows admins and gestores to view all messages (active and inactive) for management. Uses explicit NULL handling to support super admins viewing global messages.';
