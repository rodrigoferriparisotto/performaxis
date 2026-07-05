/*
  # Fix RLS Policies to Resolve 403 Error on Company Creation

  ## Problem Identified
  
  The current RLS policy for `empresas` table uses a single policy with `FOR ALL` that checks:
  - `usuarios.profile = 'admin' OR usuarios.empresa_id = empresas.id`
  
  **Why this fails on INSERT:**
  - When admin creates a new company, `empresas.id` is the ID of the company being created
  - Admin user typically doesn't have `empresa_id` equal to this new ID
  - The condition `usuarios.empresa_id = empresas.id` returns FALSE during INSERT
  - Even though user is admin, the INSERT is blocked by RLS
  
  Similarly, the `perfis_empresa` table has the same issue when the trigger tries to
  create profiles for the new company.

  ## Solution
  
  1. **empresas table**: Split the single policy into separate policies for each operation
     - SELECT: Admins see all, others see only their company
     - INSERT: Only admins can create (no empresa_id check needed)
     - UPDATE: Admins update all, gestores update their own company
     - DELETE: Only admins can delete
  
  2. **perfis_empresa table**: Split policies to allow admin INSERTs
     - SELECT: Users see their company's profiles
     - INSERT: Admins can insert for any company, gestores for their own
     - UPDATE: Admins update all, gestores update their company's profiles
     - DELETE: Admins delete all, gestores delete their company's profiles

  ## Changes Made
  
  1. Drop existing broad policies on both tables
  2. Create specific policies for each operation (SELECT, INSERT, UPDATE, DELETE)
  3. Ensure admin can always perform operations without empresa_id constraints
  4. Maintain multi-tenant isolation for non-admin users

  ## Security Notes
  
  - Admin users can create/read/update/delete any company
  - Gestor users can only access their own company data
  - Other users can only read their company data
  - Multi-tenant isolation is maintained through empresa_id checks on SELECT/UPDATE
*/

-- ============================================================================
-- PART 1: Fix empresas table RLS policies
-- ============================================================================

DO $$ BEGIN
  -- Drop the existing broad policy
  DROP POLICY IF EXISTS "Admins: Full access to empresas" ON public.empresas;

  -- CREATE POLICY: SELECT - Admins see all companies, others see only their company
  CREATE POLICY "empresas_select_policy"
    ON public.empresas
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR usuarios.empresa_id = empresas.id
        )
      )
    );

  -- CREATE POLICY: INSERT - Only admins can create new companies
  CREATE POLICY "empresas_insert_policy"
    ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'admin'::user_profile_enum
      )
    );

  -- CREATE POLICY: UPDATE - Admins update all, gestores can update their own company
  CREATE POLICY "empresas_update_policy"
    ON public.empresas
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = empresas.id
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = empresas.id
          )
        )
      )
    );

  -- CREATE POLICY: DELETE - Only admins can delete companies
  CREATE POLICY "empresas_delete_policy"
    ON public.empresas
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.profile = 'admin'::user_profile_enum
      )
    );

END $$;

-- ============================================================================
-- PART 2: Fix perfis_empresa table RLS policies
-- ============================================================================

DO $$ BEGIN
  -- Drop existing broad policies
  DROP POLICY IF EXISTS "Users can read their company profiles" ON public.perfis_empresa;
  DROP POLICY IF EXISTS "Admins and gestores can modify company profiles" ON public.perfis_empresa;

  -- CREATE POLICY: SELECT - Users can read their company's profiles
  CREATE POLICY "perfis_empresa_select_policy"
    ON public.perfis_empresa
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR usuarios.empresa_id = perfis_empresa.empresa_id
        )
      )
    );

  -- CREATE POLICY: INSERT - Admins can insert for any company, gestores for their own
  -- This is critical to allow the trigger to work when admin creates a company
  CREATE POLICY "perfis_empresa_insert_policy"
    ON public.perfis_empresa
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = perfis_empresa.empresa_id
          )
        )
      )
    );

  -- CREATE POLICY: UPDATE - Admins update all, gestores update their company's profiles
  CREATE POLICY "perfis_empresa_update_policy"
    ON public.perfis_empresa
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = perfis_empresa.empresa_id
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = perfis_empresa.empresa_id
          )
        )
      )
    );

  -- CREATE POLICY: DELETE - Admins delete all, gestores delete their company's profiles
  CREATE POLICY "perfis_empresa_delete_policy"
    ON public.perfis_empresa
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND (
          usuarios.profile = 'admin'::user_profile_enum
          OR (
            usuarios.profile = 'gestor'::user_profile_enum
            AND usuarios.empresa_id = perfis_empresa.empresa_id
          )
        )
      )
    );

END $$;

-- ============================================================================
-- PART 3: Add helpful comments to policies
-- ============================================================================

COMMENT ON POLICY "empresas_select_policy" ON public.empresas IS 
'Allows admins to view all companies, other users can only view their own company';

COMMENT ON POLICY "empresas_insert_policy" ON public.empresas IS 
'Only admin users can create new companies. This policy does not check empresa_id to avoid 403 errors during creation.';

COMMENT ON POLICY "empresas_update_policy" ON public.empresas IS 
'Admins can update any company, gestores can update only their own company';

COMMENT ON POLICY "empresas_delete_policy" ON public.empresas IS 
'Only admin users can delete companies';

COMMENT ON POLICY "perfis_empresa_select_policy" ON public.perfis_empresa IS 
'Allows users to view their company profiles, admins can view all';

COMMENT ON POLICY "perfis_empresa_insert_policy" ON public.perfis_empresa IS 
'Allows admins to create profiles for any company (needed for trigger when creating company), gestores can create for their own';

COMMENT ON POLICY "perfis_empresa_update_policy" ON public.perfis_empresa IS 
'Admins can update any profile, gestores can update their company profiles';

COMMENT ON POLICY "perfis_empresa_delete_policy" ON public.perfis_empresa IS 
'Admins can delete any profile, gestores can delete their company profiles';
