/*
  # Fix Usuarios Table RLS - Remove Infinite Recursion for Gestor Profile

  ## Problem
  The migration 20251221184547 re-introduced infinite recursion by creating a policy
  that queries the usuarios table within the usuarios table policy check:
  
  ```sql
  CREATE POLICY "Admins and gestores: Full access to usuarios"
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u  -- ← Causes infinite recursion!
        WHERE u.id = auth.uid()
  ```
  
  This causes: Query usuarios → Check policy → Query usuarios → Check policy → ∞ loop

  ## Solution
  Use the existing `get_current_user_empresa_and_profile()` SECURITY DEFINER function
  that bypasses RLS and prevents recursion. This function was created in migration
  20251221144001 specifically to solve this problem.

  ## Changes
  1. Drop the problematic "Admins and gestores: Full access to usuarios" policy
  2. Recreate proper policies that allow gestor profile full access WITHOUT recursion
  3. Keep all other table policies intact (they don't cause recursion)

  ## Security
  - Gestor profile gets full access to usuarios in their empresa (as intended)
  - Admin profile keeps full access
  - Super-admin keeps global access
  - Multi-tenancy (empresa_id) is enforced
  - No recursion possible
*/

-- ============================================================================
-- Drop the problematic policy that causes infinite recursion
-- ============================================================================

DROP POLICY IF EXISTS "Admins and gestores: Full access to usuarios" ON public.usuarios;

-- ============================================================================
-- Recreate correct policies for usuarios table
-- These use get_current_user_empresa_and_profile() to avoid recursion
-- ============================================================================

-- SELECT Policy: Users see own data, admins/gestores see empresa users, super-admin sees all
CREATE POLICY "usuarios_select_policy_v2"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    -- Own data (direct match, no recursion)
    id = auth.uid()
    OR
    -- Super-admin sees all (uses auth.email(), no table query)
    public.is_super_admin()
    OR
    -- Admin or Gestor sees users in same empresa (uses SECURITY DEFINER function, bypasses RLS)
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile IN ('admin', 'gestor')
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- INSERT Policy: Admins, gestores, and super-admins can create users
CREATE POLICY "usuarios_insert_policy_v2"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super-admin can create anywhere
    public.is_super_admin()
    OR
    -- Admin or Gestor can create in their empresa
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile IN ('admin', 'gestor')
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- UPDATE Policy: Users update own, admins/gestores update empresa users, super-admin updates all
CREATE POLICY "usuarios_update_policy_v2"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (
    -- Own data
    id = auth.uid()
    OR
    -- Super-admin updates all
    public.is_super_admin()
    OR
    -- Admin or Gestor updates users in same empresa
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile IN ('admin', 'gestor')
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the new values
    id = auth.uid()
    OR
    public.is_super_admin()
    OR
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile IN ('admin', 'gestor')
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- DELETE Policy: Only admins, gestores, and super-admin can delete (not themselves)
CREATE POLICY "usuarios_delete_policy_v2"
  ON public.usuarios
  FOR DELETE
  TO authenticated
  USING (
    -- Cannot delete yourself
    id != auth.uid()
    AND
    (
      -- Super-admin deletes all
      public.is_super_admin()
      OR
      -- Admin or Gestor deletes users in same empresa
      (
        EXISTS (
          SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
          WHERE user_info.profile IN ('admin', 'gestor')
            AND user_info.active = true
            AND user_info.empresa_id = usuarios.empresa_id
        )
      )
    )
  );

-- ============================================================================
-- Success: Gestor profile now has full access without infinite recursion
-- ============================================================================
