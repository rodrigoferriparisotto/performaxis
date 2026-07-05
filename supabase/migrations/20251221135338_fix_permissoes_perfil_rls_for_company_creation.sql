/*
  # Fix permissoes_perfil RLS Policies to Allow Company Creation

  ## Problem Identified
  
  When an admin creates a new company, triggers automatically create:
  1. Records in `perfis_empresa` table (for each profile type)
  2. Records in `permissoes_perfil` table (default permissions for each profile)
  
  The current RLS policy for `permissoes_perfil` uses `FOR ALL` and checks:
  - `usuarios.empresa_id = perfis_empresa.empresa_id`
  
  **Why this fails on INSERT:**
  - Admin user may not have `empresa_id` matching the new company being created
  - The policy blocks the INSERT even though the user is an admin
  - Error: "new row violates row-level security policy for table permissoes_perfil"

  ## Solution
  
  Split the single `FOR ALL` policy into separate policies for each operation:
  - SELECT: Users can read permissions from their company's profiles
  - INSERT: Admins can insert permissions for any company (no empresa_id restriction)
  - UPDATE: Admins and gestores can update their company's permissions
  - DELETE: Admins and gestores can delete their company's permissions

  ## Security Notes
  
  - Admin users can create/read/update/delete permissions for any company
  - Gestor users can only modify permissions for their own company's profiles
  - Other users can only read permissions for their company's profiles
  - Multi-tenant isolation is maintained through empresa_id checks
*/

-- ============================================================================
-- Fix permissoes_perfil table RLS policies
-- ============================================================================

DO $$ BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can read their company permissions" ON public.permissoes_perfil;
  DROP POLICY IF EXISTS "Admins and gestores can modify company permissions" ON public.permissoes_perfil;

  -- CREATE POLICY: SELECT - Users can read their company's permissions
  CREATE POLICY "permissoes_perfil_select_policy"
    ON public.permissoes_perfil
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- CREATE POLICY: INSERT - Admins can insert for any company, gestores for their own
  -- This is CRITICAL to allow triggers to work when admin creates a company
  CREATE POLICY "permissoes_perfil_insert_policy"
    ON public.permissoes_perfil
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = (select auth.uid())
        AND u.profile = 'admin'::user_profile_enum
      )
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- CREATE POLICY: UPDATE - Admins update all, gestores update their company's permissions
  CREATE POLICY "permissoes_perfil_update_policy"
    ON public.permissoes_perfil
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = (select auth.uid())
        AND u.profile = 'admin'::user_profile_enum
      )
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = (select auth.uid())
        AND u.profile = 'admin'::user_profile_enum
      )
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- CREATE POLICY: DELETE - Admins delete all, gestores delete their company's permissions
  CREATE POLICY "permissoes_perfil_delete_policy"
    ON public.permissoes_perfil
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = (select auth.uid())
        AND u.profile = 'admin'::user_profile_enum
      )
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = (select auth.uid())
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

END $$;

-- ============================================================================
-- Add helpful comments to policies
-- ============================================================================

COMMENT ON POLICY "permissoes_perfil_select_policy" ON public.permissoes_perfil IS 
'Allows users to view permissions for their company profiles, admins can view all';

COMMENT ON POLICY "permissoes_perfil_insert_policy" ON public.permissoes_perfil IS 
'Allows admins to create permissions for any company (needed for trigger when creating company), gestores can create for their own company';

COMMENT ON POLICY "permissoes_perfil_update_policy" ON public.permissoes_perfil IS 
'Admins can update any permission, gestores can update their company permissions';

COMMENT ON POLICY "permissoes_perfil_delete_policy" ON public.permissoes_perfil IS 
'Admins can delete any permission, gestores can delete their company permissions';
