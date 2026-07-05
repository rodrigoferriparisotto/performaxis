/*
  # Fix mensagens_broadcast INSERT Policy NULL Handling

  ## Problem
  The INSERT policy "Admins and gestores can create broadcast messages" has NULL 
  comparison issues. The condition `u.empresa_id = mensagens_broadcast.empresa_id` 
  fails when both are NULL.

  ## Solution
  Rewrite the INSERT policy to explicitly handle NULL cases for super admins.

  ## Changes
  1. Drop and recreate INSERT policy with explicit NULL handling
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins and gestores can create broadcast messages" ON mensagens_broadcast;

-- Create new INSERT policy with proper NULL handling
CREATE POLICY "Admins and gestores can create broadcast messages"
  ON mensagens_broadcast
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = auth.uid()
        AND (
          -- Super admin (empresa_id IS NULL) can create global messages
          (u.profile = 'admin' 
           AND u.empresa_id IS NULL 
           AND mensagens_broadcast.empresa_id IS NULL)
          -- Company admin can create messages for their company
          OR (u.profile = 'admin' 
              AND u.empresa_id IS NOT NULL 
              AND u.empresa_id = mensagens_broadcast.empresa_id)
          -- Gestor can create messages for their company
          OR (u.profile = 'gestor' 
              AND u.empresa_id IS NOT NULL
              AND u.empresa_id = mensagens_broadcast.empresa_id)
        )
    )
  );

-- Add comment explaining the NULL handling
COMMENT ON POLICY "Admins and gestores can create broadcast messages" ON mensagens_broadcast IS 
  'Allows admins and gestores to create broadcast messages. Uses explicit NULL handling to support super admins creating global messages.';
