/*
  # Fix mensagens_broadcast INSERT policy to allow admins/gestores to create messages

  ## Problem
  The current INSERT policy references `mensagens_broadcast.empresa_id` in the WITH CHECK clause,
  which causes a 403 error because you cannot reference the table name in this context.
  
  ## Solution
  - Drop the problematic INSERT policy
  - Create a new INSERT policy that correctly references the column being inserted
  - Allow admins/gestores to create messages for their own company
  - Allow super admins to create system-wide messages (empresa_id NULL)
  
  ## Changes
  1. Drop existing "Admins and gestores can create broadcast messages" policy
  2. Create new corrected INSERT policy with proper column reference
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Admins and gestores can create broadcast messages" ON mensagens_broadcast;

-- Create corrected INSERT policy
CREATE POLICY "Admins and gestores can create broadcast messages"
  ON mensagens_broadcast
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be authenticated and be admin or gestor
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND (
        -- For system-wide messages (empresa_id IS NULL), user must be admin
        (empresa_id IS NULL AND usuarios.profile = 'admin')
        -- For company messages, empresa_id must match user's company
        OR usuarios.empresa_id = empresa_id
      )
    )
  );