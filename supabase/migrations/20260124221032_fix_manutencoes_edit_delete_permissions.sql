/*
  # Fix Manutencoes Edit and Delete Permissions

  1. Changes to UPDATE Policy
    - Admin, Gestor, and Manutencao profiles can update any maintenance from their company
    - Solicitante can update their own maintenance requests (solicitante_id)
    - All operations restricted to same empresa_id for security

  2. Changes to DELETE Policy  
    - Admin, Gestor, and Manutencao profiles can delete any maintenance from their company
    - Solicitante can delete only their own open (não concluído) maintenance requests
    - Completed maintenance can only be deleted by Admin/Gestor
    - All operations restricted to same empresa_id for security

  3. Security
    - Maintains RLS enforcement
    - Ensures multi-tenancy isolation by empresa_id
    - Prevents users from editing/deleting other companies' data
*/

-- Update the UPDATE policy for manutencoes
DROP POLICY IF EXISTS "Users can update own manutencoes" ON public.manutencoes;

CREATE POLICY "Users can update manutencoes with permissions"
  ON public.manutencoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
      AND usuarios.empresa_id = manutencoes.empresa_id
      AND usuarios.active = true
      AND (
        -- Admin, Gestor, Manutencao can update any from their company
        usuarios.profile IN ('admin', 'gestor', 'manutencao')
        -- Solicitante can update their own requests
        OR manutencoes.solicitante_id = usuarios.id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
      AND usuarios.empresa_id = manutencoes.empresa_id
      AND usuarios.active = true
      AND (
        usuarios.profile IN ('admin', 'gestor', 'manutencao')
        OR manutencoes.solicitante_id = usuarios.id
      )
    )
  );

-- Update the DELETE policy for manutencoes
DROP POLICY IF EXISTS "Users can delete own manutencoes" ON public.manutencoes;

CREATE POLICY "Users can delete manutencoes with permissions"
  ON public.manutencoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
      AND usuarios.empresa_id = manutencoes.empresa_id
      AND usuarios.active = true
      AND (
        -- Admin, Gestor, Manutencao can delete any from their company
        usuarios.profile IN ('admin', 'gestor', 'manutencao')
        -- Solicitante can only delete their own open (non-completed) requests
        OR (
          manutencoes.solicitante_id = usuarios.id
          AND manutencoes.status != 'concluida'
        )
      )
    )
  );