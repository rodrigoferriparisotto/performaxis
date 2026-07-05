/*
  # Fix Broadcast Messages NULL Handling in RLS Policies

  ## Problem
  The DELETE and UPDATE policies for mensagens_broadcast fail when both the user's empresa_id 
  and the message's empresa_id are NULL because SQL NULL = NULL evaluates to NULL (not TRUE).
  This prevents super admins from deleting global messages.

  ## Root Cause
  In SQL, NULL comparisons using = operator return NULL, not TRUE or FALSE.
  The condition `usuarios.empresa_id = mensagens_broadcast.empresa_id` fails when both are NULL.

  ## Solution
  Rewrite policies to explicitly handle NULL cases:
  - Super admins (empresa_id IS NULL) can manage global messages (empresa_id IS NULL)
  - Company admins can manage messages from their company
  - Gestores can manage messages from their company

  ## Changes
  1. Drop and recreate DELETE policy with explicit NULL handling
  2. Drop and recreate UPDATE policy with explicit NULL handling
*/

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins and gestores can delete broadcast messages" ON mensagens_broadcast;

-- Create new DELETE policy with proper NULL handling
CREATE POLICY "Admins and gestores can delete broadcast messages"
  ON mensagens_broadcast
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND (
        -- Super admin (empresa_id IS NULL) can delete global messages
        (usuarios.profile = 'admin' 
         AND usuarios.empresa_id IS NULL 
         AND mensagens_broadcast.empresa_id IS NULL)
        -- Company admin can delete their company's messages
        OR (usuarios.profile = 'admin' 
            AND usuarios.empresa_id IS NOT NULL 
            AND usuarios.empresa_id = mensagens_broadcast.empresa_id)
        -- Gestor can delete their company's messages
        OR (usuarios.profile = 'gestor' 
            AND usuarios.empresa_id IS NOT NULL
            AND usuarios.empresa_id = mensagens_broadcast.empresa_id)
      )
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Admins and gestores can update broadcast messages" ON mensagens_broadcast;

-- Create new UPDATE policy with proper NULL handling
CREATE POLICY "Admins and gestores can update broadcast messages"
  ON mensagens_broadcast
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND (
        -- Super admin (empresa_id IS NULL) can update global messages
        (usuarios.profile = 'admin' 
         AND usuarios.empresa_id IS NULL 
         AND mensagens_broadcast.empresa_id IS NULL)
        -- Company admin can update their company's messages
        OR (usuarios.profile = 'admin' 
            AND usuarios.empresa_id IS NOT NULL 
            AND usuarios.empresa_id = mensagens_broadcast.empresa_id)
        -- Gestor can update their company's messages
        OR (usuarios.profile = 'gestor' 
            AND usuarios.empresa_id IS NOT NULL
            AND usuarios.empresa_id = mensagens_broadcast.empresa_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND (
        -- Super admin (empresa_id IS NULL) can create/update global messages
        (usuarios.profile = 'admin' 
         AND usuarios.empresa_id IS NULL 
         AND empresa_id IS NULL)
        -- Company admin can create/update their company's messages
        OR (usuarios.profile = 'admin' 
            AND usuarios.empresa_id IS NOT NULL 
            AND usuarios.empresa_id = empresa_id)
        -- Gestor can create/update their company's messages
        OR (usuarios.profile = 'gestor' 
            AND usuarios.empresa_id IS NOT NULL
            AND usuarios.empresa_id = empresa_id)
      )
    )
  );
