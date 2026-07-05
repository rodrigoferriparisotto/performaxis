/*
  # Fix mensagens_broadcast_lidas NULL Handling in DELETE Policy

  ## Problem
  The DELETE policy for mensagens_broadcast_lidas has the same NULL comparison issue.
  When trying to delete read records for global messages (empresa_id IS NULL), 
  the condition fails because NULL = NULL evaluates to NULL in SQL.

  ## Solution
  Rewrite the DELETE policy to explicitly handle NULL cases for super admins.

  ## Changes
  1. Drop and recreate DELETE policy with explicit NULL handling
*/

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins and gestores can delete read records" ON mensagens_broadcast_lidas;

-- Create new DELETE policy with proper NULL handling
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
        AND (
          -- Super admin (empresa_id IS NULL) can delete read records for global messages
          (u.profile = 'admin' 
           AND u.empresa_id IS NULL 
           AND mb.empresa_id IS NULL)
          -- Company admin can delete read records for their company's messages
          OR (u.profile = 'admin' 
              AND u.empresa_id IS NOT NULL 
              AND u.empresa_id = mb.empresa_id)
          -- Gestor can delete read records for their company's messages
          OR (u.profile = 'gestor' 
              AND u.empresa_id IS NOT NULL
              AND u.empresa_id = mb.empresa_id)
        )
    )
  );

-- Add comment explaining the NULL handling
COMMENT ON POLICY "Admins and gestores can delete read records" ON mensagens_broadcast_lidas IS 
  'Allows admins and gestores to delete read records. Uses explicit NULL handling to support super admins deleting global message read records.';
