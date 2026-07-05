/*
  # Fix RLS Policies for Cancelamentos Table

  ## Problem
  The "cancelamentos" table only has an admin-only policy, blocking all non-admin
  users from accessing the table. This causes 403 Forbidden errors when regular
  users try to view or create cancellation records.

  ## Solution
  Add the complete three-policy structure following the same pattern used in other
  tables (registros_atividades_diarias, registros_recepcao, etc.):

  1. READ policy - All authenticated users can view cancelamentos from their company
  2. USER policy (INSERT) - Users can create cancelamentos assigned to them
  3. USER policy (UPDATE) - Users can update their own cancelamentos
  4. Admin policy - Already exists, provides full access for admins

  ## Tables Fixed
  - cancelamentos

  ## Security Notes
  - Users can only view cancelamentos from their own company
  - Users can only create cancelamentos where usuario_id = auth.uid() or they are admin
  - Users can only modify their own cancelamentos (usuario_id = auth.uid()) or they are admin
  - Performance optimization maintained: (select auth.uid()) instead of auth.uid()
*/

-- ============================================================================
-- CANCELAMENTOS
-- ============================================================================

-- Add READ policy: All users can view cancelamentos from their company
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read cancelamentos from company" ON public.cancelamentos;
  CREATE POLICY "Users can read cancelamentos from company"
    ON public.cancelamentos
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy for INSERT: Users can create their own cancelamentos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own cancelamentos" ON public.cancelamentos;
  CREATE POLICY "Users can create own cancelamentos"
    ON public.cancelamentos
    FOR INSERT
    TO authenticated
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;

-- Add USER policy for UPDATE: Users can update their own cancelamentos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own cancelamentos" ON public.cancelamentos;
  CREATE POLICY "Users can update own cancelamentos"
    ON public.cancelamentos
    FOR UPDATE
    TO authenticated
    USING (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    )
    WITH CHECK (
      usuario_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = (select auth.uid())
        AND usuarios.profile = 'admin'
        AND usuarios.empresa_id = cancelamentos.empresa_id
        AND usuarios.active = true
      )
    );
END $$;
