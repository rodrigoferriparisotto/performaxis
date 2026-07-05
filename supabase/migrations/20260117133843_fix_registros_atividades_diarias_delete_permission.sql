/*
  # Fix DELETE Permissions for registros_atividades_diarias

  ## Problem
  Admin and Gestor users cannot delete records from the history page because RLS policies 
  are checking if auth.uid() matches the usuario_id of the record, which fails when an 
  admin tries to delete another user's record.

  ## Changes
  1. Drop existing problematic DELETE policy
  2. Create new DELETE policy that allows:
     - Users to delete their own records
     - Admin and Gestor profiles to delete any records from their company
  
  ## Security
  - Policy ensures users can only delete records within their own company (multi-tenancy)
  - Requires authentication
  - Validates active user status
*/

-- Drop the old DELETE policy that's too restrictive
DROP POLICY IF EXISTS "Users can delete own registros_atividades_diarias" ON registros_atividades_diarias;

-- Create new DELETE policy with proper admin/gestor permissions
CREATE POLICY "Allow delete for own records or admin/gestor"
  ON registros_atividades_diarias
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own records
    usuario_id = auth.uid()
    OR
    -- Admin or Gestor can delete any record from their company
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile IN ('admin', 'gestor')
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
    )
  );
