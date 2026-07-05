/*
  # Support for Super-Admin (Multi-tenant Admin)
  
  ## Changes Made
  
  1. **Set Admin User as Super-Admin**
     - Updates consultoria@rodrigoparisotto.com.br to have empresa_id = NULL
     - This allows the admin to manage multiple companies
  
  2. **Helper Function**
     - Creates `is_super_admin()` function to check if current user is a super-admin
     - Super-admin is defined as: profile = 'admin' AND empresa_id IS NULL
  
  3. **Updated RLS Policies**
     - Updates `usuarios` table policies to support super-admin
     - Super-admin can view and manage all users across all companies
     - Regular admins and other users remain restricted to their company
  
  ## Security Notes
  
  - Super-admin (empresa_id NULL) has access to all companies
  - Regular admin (empresa_id NOT NULL) is restricted to their company
  - Multi-tenant isolation maintained for non-super-admin users
  - This enables the sequential flow: Create Gestor → Create Company → Link Gestor
*/

-- ============================================================================
-- PART 1: Update admin user to be super-admin
-- ============================================================================

-- Set the consultoria@rodrigoparisotto.com.br user to have empresa_id = NULL
UPDATE public.usuarios
SET empresa_id = NULL, updated_at = now()
WHERE login = 'consultoria@rodrigoparisotto.com.br'
AND profile = 'admin'::user_profile_enum;

-- ============================================================================
-- PART 2: Create helper function to check for super-admin
-- ============================================================================

-- Function to check if the current user is a super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = auth.uid()
    AND profile = 'admin'::user_profile_enum
    AND empresa_id IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 
'Returns true if the current user is a super-admin (admin with empresa_id NULL), which allows managing multiple companies';

-- ============================================================================
-- PART 3: Update usuarios table RLS policies for super-admin support
-- ============================================================================

DO $$ BEGIN
  -- Drop existing usuarios policies
  DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
  DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
  DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
  DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;

  -- SELECT: Super-admin sees all, regular users see their company users
  CREATE POLICY "usuarios_select_policy"
    ON public.usuarios
    FOR SELECT
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND u.empresa_id = usuarios.empresa_id
      )
    );

  -- INSERT: Super-admin can create users for any company, others cannot create users
  CREATE POLICY "usuarios_insert_policy"
    ON public.usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND u.profile = 'admin'::user_profile_enum
        AND u.empresa_id = usuarios.empresa_id
      )
    );

  -- UPDATE: Super-admin updates all, regular admin/gestor updates their company users
  CREATE POLICY "usuarios_update_policy"
    ON public.usuarios
    FOR UPDATE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND u.empresa_id = usuarios.empresa_id
        AND u.profile IN ('admin'::user_profile_enum, 'gestor'::user_profile_enum)
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND u.empresa_id = usuarios.empresa_id
        AND u.profile IN ('admin'::user_profile_enum, 'gestor'::user_profile_enum)
      )
    );

  -- DELETE: Super-admin deletes all, regular admin/gestor deletes their company users
  CREATE POLICY "usuarios_delete_policy"
    ON public.usuarios
    FOR DELETE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
        AND u.empresa_id = usuarios.empresa_id
        AND u.profile IN ('admin'::user_profile_enum, 'gestor'::user_profile_enum)
      )
    );

END $$;

-- ============================================================================
-- PART 4: Update empresas table policies for super-admin
-- ============================================================================

DO $$ BEGIN
  -- Drop existing empresas policies
  DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
  DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
  DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
  DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

  -- SELECT: Super-admin sees all companies, others see only their company
  CREATE POLICY "empresas_select_policy"
    ON public.empresas
    FOR SELECT
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = empresas.id
      )
    );

  -- INSERT: Only super-admin can create new companies
  CREATE POLICY "empresas_insert_policy"
    ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_super_admin()
    );

  -- UPDATE: Super-admin updates all, gestores update their own company
  CREATE POLICY "empresas_update_policy"
    ON public.empresas
    FOR UPDATE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = empresas.id
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = empresas.id
      )
    );

  -- DELETE: Only super-admin can delete companies
  CREATE POLICY "empresas_delete_policy"
    ON public.empresas
    FOR DELETE
    TO authenticated
    USING (
      public.is_super_admin()
    );

END $$;

-- ============================================================================
-- PART 5: Update perfis_empresa table policies for super-admin
-- ============================================================================

DO $$ BEGIN
  -- Drop existing perfis_empresa policies
  DROP POLICY IF EXISTS "perfis_empresa_select_policy" ON public.perfis_empresa;
  DROP POLICY IF EXISTS "perfis_empresa_insert_policy" ON public.perfis_empresa;
  DROP POLICY IF EXISTS "perfis_empresa_update_policy" ON public.perfis_empresa;
  DROP POLICY IF EXISTS "perfis_empresa_delete_policy" ON public.perfis_empresa;

  -- SELECT: Super-admin sees all, users see their company's profiles
  CREATE POLICY "perfis_empresa_select_policy"
    ON public.perfis_empresa
    FOR SELECT
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );

  -- INSERT: Super-admin can insert for any company, gestores for their own
  CREATE POLICY "perfis_empresa_insert_policy"
    ON public.perfis_empresa
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );

  -- UPDATE: Super-admin updates all, gestores update their company's profiles
  CREATE POLICY "perfis_empresa_update_policy"
    ON public.perfis_empresa
    FOR UPDATE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );

  -- DELETE: Super-admin deletes all, gestores delete their company's profiles
  CREATE POLICY "perfis_empresa_delete_policy"
    ON public.perfis_empresa
    FOR DELETE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'gestor'::user_profile_enum
        AND usuarios.empresa_id = perfis_empresa.empresa_id
      )
    );

END $$;

-- ============================================================================
-- PART 6: Update permissoes_perfil table policies for super-admin
-- ============================================================================

DO $$ BEGIN
  -- Drop existing permissoes_perfil policies
  DROP POLICY IF EXISTS "permissoes_perfil_select_policy" ON public.permissoes_perfil;
  DROP POLICY IF EXISTS "permissoes_perfil_insert_policy" ON public.permissoes_perfil;
  DROP POLICY IF EXISTS "permissoes_perfil_update_policy" ON public.permissoes_perfil;
  DROP POLICY IF EXISTS "permissoes_perfil_delete_policy" ON public.permissoes_perfil;

  -- SELECT: Super-admin sees all, users see their company permissions
  CREATE POLICY "permissoes_perfil_select_policy"
    ON public.permissoes_perfil
    FOR SELECT
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = auth.uid()
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- INSERT: Super-admin inserts for any company, gestores for their own
  CREATE POLICY "permissoes_perfil_insert_policy"
    ON public.permissoes_perfil
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = auth.uid()
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- UPDATE: Super-admin updates all, gestores update their company's permissions
  CREATE POLICY "permissoes_perfil_update_policy"
    ON public.permissoes_perfil
    FOR UPDATE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = auth.uid()
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = auth.uid()
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

  -- DELETE: Super-admin deletes all, gestores delete their company's permissions
  CREATE POLICY "permissoes_perfil_delete_policy"
    ON public.permissoes_perfil
    FOR DELETE
    TO authenticated
    USING (
      public.is_super_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.perfis_empresa pe ON pe.empresa_id = u.empresa_id
        WHERE u.id = auth.uid()
        AND u.profile = 'gestor'::user_profile_enum
        AND pe.id = permissoes_perfil.perfil_empresa_id
      )
    );

END $$;

-- ============================================================================
-- PART 7: Add helpful comments
-- ============================================================================

COMMENT ON POLICY "usuarios_select_policy" ON public.usuarios IS 
'Super-admin sees all users, regular users see only their company users';

COMMENT ON POLICY "usuarios_insert_policy" ON public.usuarios IS 
'Super-admin can create users for any company, regular admins for their company only';

COMMENT ON POLICY "usuarios_update_policy" ON public.usuarios IS 
'Super-admin updates all, regular admin/gestor updates their company users only';

COMMENT ON POLICY "usuarios_delete_policy" ON public.usuarios IS 
'Super-admin deletes all, regular admin/gestor deletes their company users only';

COMMENT ON POLICY "empresas_select_policy" ON public.empresas IS 
'Super-admin sees all companies, regular users see only their company';

COMMENT ON POLICY "empresas_insert_policy" ON public.empresas IS 
'Only super-admin can create new companies';

COMMENT ON POLICY "empresas_update_policy" ON public.empresas IS 
'Super-admin updates all companies, gestores update only their company';

COMMENT ON POLICY "empresas_delete_policy" ON public.empresas IS 
'Only super-admin can delete companies';
