/*
  # Fix Usuarios SELECT Policy to Include Gestor Profile

  ## Problem
  The usuarios SELECT policy only allows 'admin' profile to view all users in their empresa.
  Gestor profile can UPDATE and DELETE users but cannot SELECT (view) them, creating an
  inconsistency where gestores only see themselves in the user list.

  ## Solution
  Update the SELECT policy to include 'gestor' profile alongside 'admin', making it
  consistent with UPDATE and DELETE policies that already include both profiles.

  ## Changes
  1. Drop existing usuarios_select_policy
  2. Recreate with 'gestor' included in the profile check
  3. Maintain all other conditions (own data, super-admin, empresa_id match)

  ## Security Notes
  - Gestores can already UPDATE and DELETE users in their empresa
  - This change only adds SELECT permission, creating consistency
  - Multi-tenancy is preserved (empresa_id filtering)
  - Users still only see own data or empresa data if admin/gestor
*/

-- ============================================================================
-- Fix SELECT Policy: Include Gestor Profile
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

-- Recreate SELECT policy with gestor included
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
    -- Admin AND Gestor see users in same empresa
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.profile IN ('admin', 'gestor')
          AND user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================

-- Now all usuarios policies are consistent:
-- SELECT: own data OR super-admin OR (admin/gestor in same empresa)
-- INSERT: super-admin OR (admin in same empresa)
-- UPDATE: own data OR super-admin OR (admin/gestor in same empresa)
-- DELETE: not self AND (super-admin OR admin/gestor in same empresa)
