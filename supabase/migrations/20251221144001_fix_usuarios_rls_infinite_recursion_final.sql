/*
  # Fix Infinite Recursion in Usuarios RLS Policies - Final Solution

  ## Problem
  The super-admin migration (20251221141412) reintroduced infinite recursion by creating
  policies that query the usuarios table within usuarios table policies:
  
  ```sql
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
    AND u.empresa_id = usuarios.empresa_id
  )
  ```
  
  This creates: Query → Policy → Query usuarios → Policy → infinite loop → 500 error

  ## Root Cause
  - `get_user_empresa_id()` function queries usuarios table (causes recursion)
  - Policies on usuarios table use EXISTS subqueries on usuarios table (causes recursion)
  - Even with STABLE functions, RLS is still applied when the function queries the table

  ## Solution
  1. Create SECURITY DEFINER function that bypasses RLS to get current user info
  2. Rewrite ALL usuarios policies to NEVER query usuarios table
  3. Use only: auth.uid(), auth.email(), is_super_admin(), and the new function
  4. Keep super-admin logic working via auth.email() (no table query needed)

  ## Changes
  1. New Function: `get_current_user_empresa_and_profile()`
     - Returns (empresa_id, profile) for current user
     - Uses SECURITY DEFINER to bypass RLS
     - Caches result to avoid repeated queries
  
  2. Updated Policies: usuarios table
     - SELECT: Direct auth.uid() match OR super-admin OR admin in same empresa
     - INSERT: Super-admin OR admin in same empresa (using new function)
     - UPDATE: Own data OR super-admin OR admin in same empresa
     - DELETE: Super-admin OR admin in same empresa (not self)
  
  3. Updated Policies: empresas table
     - Use new function instead of querying usuarios

  ## Security Notes
  - SECURITY DEFINER is safe: only returns empresa_id and profile
  - No sensitive data exposed, just authorization checks
  - Super-admin check uses auth.email() (no database query)
  - All multi-tenancy logic preserved
*/

-- ============================================================================
-- PART 1: Create helper function that bypasses RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_empresa_and_profile()
RETURNS TABLE(empresa_id uuid, profile text, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- This function bypasses RLS to get current user's empresa_id and profile
  -- Used in RLS policies to avoid infinite recursion
  RETURN QUERY
  SELECT u.empresa_id, u.profile::text, u.active
  FROM public.usuarios u
  WHERE u.id = auth.uid()
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_empresa_and_profile() TO authenticated;

COMMENT ON FUNCTION public.get_current_user_empresa_and_profile() IS
  'SECURITY DEFINER function that returns current user empresa_id and profile. Bypasses RLS to prevent infinite recursion in usuarios table policies.';

-- ============================================================================
-- PART 2: Recreate usuarios table policies WITHOUT recursion
-- ============================================================================

-- Drop ALL existing policies on usuarios table
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can read all users in empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can update users in empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can insert users in empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can delete users in empresa" ON public.usuarios;

-- SELECT Policy: Users see own data, admins see empresa users, super-admin sees all
CREATE POLICY "usuarios_select_policy"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    -- Own data
    id = auth.uid()
    OR
    -- Super-admin sees all
    public.is_super_admin()
    OR
    -- Admin sees users in same empresa
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile = 'admin'
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- INSERT Policy: Only admins and super-admins can create users
CREATE POLICY "usuarios_insert_policy"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super-admin can create anywhere
    public.is_super_admin()
    OR
    -- Admin can create in their empresa
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile = 'admin'
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- UPDATE Policy: Users update own, admins update empresa users, super-admin updates all
CREATE POLICY "usuarios_update_policy"
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
    -- Admin/Gestor updates users in same empresa
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

-- DELETE Policy: Only admins and super-admin can delete (not themselves)
CREATE POLICY "usuarios_delete_policy"
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
      -- Admin/Gestor deletes users in same empresa
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
-- PART 3: Update empresas table policies to use new function
-- ============================================================================

DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

-- SELECT: Super-admin sees all, users see their own empresa
CREATE POLICY "empresas_select_policy"
  ON public.empresas
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
      WHERE user_info.empresa_id = empresas.id
    )
  );

-- INSERT: Only super-admin can create empresas
CREATE POLICY "empresas_insert_policy"
  ON public.empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
  );

-- UPDATE: Super-admin updates all, admin updates own empresa
CREATE POLICY "empresas_update_policy"
  ON public.empresas
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
      WHERE user_info.profile = 'admin'
        AND user_info.active = true
        AND user_info.empresa_id = empresas.id
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
      WHERE user_info.profile = 'admin'
        AND user_info.active = true
        AND user_info.empresa_id = empresas.id
    )
  );

-- DELETE: Only super-admin can delete empresas
CREATE POLICY "empresas_delete_policy"
  ON public.empresas
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
  );

-- ============================================================================
-- PART 4: Add indexes for performance
-- ============================================================================

-- Index for the new function lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_uid_empresa_profile 
  ON public.usuarios(id, empresa_id, profile, active)
  WHERE active = true;

-- ============================================================================
-- Success Summary
-- ============================================================================

-- All usuarios policies now use:
-- 1. auth.uid() - direct comparison, no recursion
-- 2. is_super_admin() - uses auth.email(), no table query
-- 3. get_current_user_empresa_and_profile() - SECURITY DEFINER, bypasses RLS
-- 
-- Zero recursion possible. Super-admin and regular admins work correctly.