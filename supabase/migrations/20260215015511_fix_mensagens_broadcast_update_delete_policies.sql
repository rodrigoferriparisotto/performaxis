/*
  # Fix mensagens_broadcast UPDATE and DELETE policies

  ## Problem
  The UPDATE and DELETE policies also reference `mensagens_broadcast.empresa_id` incorrectly,
  which can cause similar permission issues.
  
  ## Solution
  - Drop and recreate UPDATE policy with correct table reference in USING clause
  - Drop and recreate DELETE policy with correct table reference in USING clause
  
  ## Changes
  1. Drop existing UPDATE policy
  2. Create new corrected UPDATE policy
  3. Drop existing DELETE policy
  4. Create new corrected DELETE policy
*/

-- Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Admins and gestores can update broadcast messages" ON mensagens_broadcast;

-- Create corrected UPDATE policy
CREATE POLICY "Admins and gestores can update broadcast messages"
  ON mensagens_broadcast
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND (
        -- For system-wide messages, user must be admin
        (mensagens_broadcast.empresa_id IS NULL AND usuarios.profile = 'admin')
        -- For company messages, empresa_id must match user's company
        OR usuarios.empresa_id = mensagens_broadcast.empresa_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND (
        -- For system-wide messages, user must be admin
        (empresa_id IS NULL AND usuarios.profile = 'admin')
        -- For company messages, empresa_id must match user's company
        OR usuarios.empresa_id = empresa_id
      )
    )
  );

-- Drop the problematic DELETE policy
DROP POLICY IF EXISTS "Admins and gestores can delete broadcast messages" ON mensagens_broadcast;

-- Create corrected DELETE policy
CREATE POLICY "Admins and gestores can delete broadcast messages"
  ON mensagens_broadcast
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND (
        -- For system-wide messages, user must be admin
        (mensagens_broadcast.empresa_id IS NULL AND usuarios.profile = 'admin')
        -- For company messages, empresa_id must match user's company
        OR usuarios.empresa_id = mensagens_broadcast.empresa_id
      )
    )
  );