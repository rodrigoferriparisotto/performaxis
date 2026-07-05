/*
  # Allow Regular Admins to Modify Profile Permissions

  ## Summary
  Updates RLS policies on perfis_sistema_permissoes to allow regular admins
  (not just super-admins) to modify profile permissions. This aligns with the
  UX expectation that admins can manage profile permissions through the Perfis page.

  ## Changes Made

  1. **Updated RLS Policies**
     - INSERT: Allow any admin (profile = 'admin') to create profile permissions
     - UPDATE: Allow any admin (profile = 'admin') to modify profile permissions
     - DELETE: Allow any admin (profile = 'admin') to delete profile permissions
     - SELECT: Remains unchanged (all authenticated users can read)

  ## Security Notes
  - Regular admins (empresa_id NOT NULL) can now modify profile permissions
  - Super-admins (empresa_id IS NULL) retain full access
  - Profile permissions apply globally across all companies
  - Read access remains available to all authenticated users for permission checks
*/

-- ============================================================================
-- Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "perfis_sistema_permissoes_insert_policy" ON public.perfis_sistema_permissoes;
DROP POLICY IF EXISTS "perfis_sistema_permissoes_update_policy" ON public.perfis_sistema_permissoes;
DROP POLICY IF EXISTS "perfis_sistema_permissoes_delete_policy" ON public.perfis_sistema_permissoes;

-- ============================================================================
-- Create new policies allowing any admin to modify
-- ============================================================================

-- INSERT: Any admin can create new profile permissions
CREATE POLICY "perfis_sistema_permissoes_insert_policy"
  ON public.perfis_sistema_permissoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'::user_profile_enum
    )
  );

-- UPDATE: Any admin can modify profile permissions
CREATE POLICY "perfis_sistema_permissoes_update_policy"
  ON public.perfis_sistema_permissoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'::user_profile_enum
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'::user_profile_enum
    )
  );

-- DELETE: Any admin can delete profile permissions
CREATE POLICY "perfis_sistema_permissoes_delete_policy"
  ON public.perfis_sistema_permissoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'::user_profile_enum
    )
  );

-- ============================================================================
-- Update policy comments
-- ============================================================================

COMMENT ON POLICY "perfis_sistema_permissoes_insert_policy" ON public.perfis_sistema_permissoes IS
'Any admin can create new profile permissions';

COMMENT ON POLICY "perfis_sistema_permissoes_update_policy" ON public.perfis_sistema_permissoes IS
'Any admin can modify profile permissions';

COMMENT ON POLICY "perfis_sistema_permissoes_delete_policy" ON public.perfis_sistema_permissoes IS
'Any admin can delete profile permissions';
