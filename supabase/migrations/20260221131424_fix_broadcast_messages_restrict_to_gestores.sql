/*
  # Restrict Broadcast Messages to Company Managers Only

  1. Changes
    - Add NOT NULL constraint to empresa_id column in mensagens_broadcast table
    - Fix RLS policies to properly handle empresa_id validation
    - Restrict INSERT policy to only allow gestores with valid empresa_id
    - Fix DELETE and UPDATE policies to work correctly with empresa_id checks
    - Add check constraint to prevent NULL empresa_id values

  2. Security
    - Ensures all broadcast messages are tied to a specific company
    - Prevents super admins from creating global messages
    - Maintains proper multi-tenancy isolation
    - Fixes NULL comparison issues in RLS policies

  3. Notes
    - This migration assumes all existing messages with NULL empresa_id have been deleted
    - Gestor profile is the only profile allowed to create broadcast messages
    - Each gestor can only send messages to their own company
*/

-- Step 1: Add NOT NULL constraint to empresa_id (after cleanup)
-- This will fail if there are any NULL values remaining
DO $$
BEGIN
  -- First check if there are any NULL empresa_id values
  IF EXISTS (SELECT 1 FROM mensagens_broadcast WHERE empresa_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot add NOT NULL constraint: There are still messages with NULL empresa_id. Please delete them first.';
  END IF;

  -- Add the NOT NULL constraint
  ALTER TABLE mensagens_broadcast 
    ALTER COLUMN empresa_id SET NOT NULL;
  
  RAISE NOTICE 'Successfully added NOT NULL constraint to empresa_id';
END $$;

-- Step 2: Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Gestores can create messages for their company" ON mensagens_broadcast;
DROP POLICY IF EXISTS "Users can update own company messages" ON mensagens_broadcast;
DROP POLICY IF EXISTS "Users can delete own company messages" ON mensagens_broadcast;

-- Step 3: Create new restrictive INSERT policy
-- Only gestores with valid empresa_id can insert messages for their own company
CREATE POLICY "Only gestores can create broadcast messages for their company"
  ON mensagens_broadcast
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'
        AND usuarios.empresa_id IS NOT NULL
        AND usuarios.empresa_id = empresa_id
    )
  );

-- Step 4: Create new UPDATE policy
-- Only gestores can update messages from their own company
CREATE POLICY "Only gestores can update their company messages"
  ON mensagens_broadcast
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'
        AND usuarios.empresa_id IS NOT NULL
        AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'
        AND usuarios.empresa_id IS NOT NULL
        AND usuarios.empresa_id = empresa_id
    )
  );

-- Step 5: Create new DELETE policy
-- Only gestores can delete messages from their own company
CREATE POLICY "Only gestores can delete their company messages"
  ON mensagens_broadcast
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'
        AND usuarios.empresa_id IS NOT NULL
        AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  );

-- Step 6: Add check constraint as an additional safety layer
ALTER TABLE mensagens_broadcast
  DROP CONSTRAINT IF EXISTS mensagens_broadcast_empresa_id_not_null_check;

ALTER TABLE mensagens_broadcast
  ADD CONSTRAINT mensagens_broadcast_empresa_id_not_null_check
  CHECK (empresa_id IS NOT NULL);

-- Step 7: Create index for better performance on empresa_id lookups
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_empresa_id 
  ON mensagens_broadcast(empresa_id);

-- Step 8: Create index for author lookups
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_autor_id 
  ON mensagens_broadcast(autor_id);
