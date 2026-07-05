/*
  # Fix RLS Permissions for Gestor Profile on Cadastros Tables

  ## Summary
  This migration fixes RLS policies across multiple configuration/cadastros tables
  to ensure that users with 'gestor' profile can properly manage cadastros (configuration
  tables) that are essential for system administration.

  ## Problem
  Several tables in the "Cadastros" section had overly restrictive RLS policies that
  prevented 'gestor' users from:
  - Creating and updating configuration records (tipos, suites, etc.)
  - Managing users and company settings
  - Accessing configuration tables needed for daily operations

  The 'gestor' profile is designed to be a management role with broad access to
  configuration and administration features, second only to 'admin'.

  ## Tables Fixed

  ### 1. suites
  - **Before**: Only 'admin' had full access
  - **After**: Both 'admin' and 'gestor' have full access

  ### 2. usuarios
  - **Before**: Only 'admin' had full access
  - **After**: Both 'admin' and 'gestor' can manage users in their company

  ### 3. tipos_recepcao
  - **Before**: Only SELECT policy existed for all users; no INSERT/UPDATE/DELETE for non-admins
  - **After**: 'gestor' and 'admin' can INSERT, UPDATE, DELETE tipos de recepção

  ### 4. servicos_camararia
  - **Before**: Only 'admin' and 'camararia' profiles
  - **After**: Added 'gestor' to allowed profiles

  ### 5. itens_camararia
  - **Before**: Only 'admin' and 'camararia' profiles
  - **After**: Added 'gestor' to allowed profiles

  ### 6. fotos_camararia
  - **Before**: Only 'admin' and 'camararia' profiles
  - **After**: Added 'gestor' to allowed profiles

  ### 7. fotos_cozinha
  - **Before**: Only 'admin' and 'cozinha' profiles
  - **After**: Added 'gestor' to allowed profiles

  ### 8. atividades (configuration table)
  - **Before**: Only 'admin' had full access
  - **After**: Both 'admin' and 'gestor' have full access

  ## Security
  - All policies maintain proper authentication checks
  - All policies maintain empresa_id (multi-tenant) security
  - Admin access is preserved on all tables
  - SELECT policies remain open to all authenticated users for reporting
  - Gestor can only access data from their own company
*/

-- ============================================================================
-- SECTION 1: Fix suites Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins: Full access to suites" ON public.suites;

-- Create new policy with gestor profile added
CREATE POLICY "Admins and gestores: Full access to suites"
  ON public.suites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = suites.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = suites.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 2: Fix usuarios Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;

-- Create new policy with gestor profile added
CREATE POLICY "Admins and gestores: Full access to usuarios"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND u.empresa_id = usuarios.empresa_id
        AND u.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND u.empresa_id = usuarios.empresa_id
        AND u.active = true
    )
  );

-- ============================================================================
-- SECTION 3: Fix tipos_recepcao Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read tipos_recepcao" ON public.tipos_recepcao;
DROP POLICY IF EXISTS "Admins podem modificar tipos de recepção" ON public.tipos_recepcao;
DROP POLICY IF EXISTS "Usuários de recepção podem modificar tipos de recepção" ON public.tipos_recepcao;

-- Create SELECT policy (all authenticated users from same company)
CREATE POLICY "Users can read tipos_recepcao from own company"
  ON public.tipos_recepcao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
        AND usuarios.active = true
    )
  );

-- Create INSERT policy (admin, gestor, recepcao)
CREATE POLICY "Admins, gestores and recepcao can insert tipos_recepcao"
  ON public.tipos_recepcao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'recepcao'::user_profile_enum])
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
        AND usuarios.active = true
    )
  );

-- Create UPDATE policy (admin, gestor, recepcao)
CREATE POLICY "Admins, gestores and recepcao can update tipos_recepcao"
  ON public.tipos_recepcao
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'recepcao'::user_profile_enum])
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'recepcao'::user_profile_enum])
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
        AND usuarios.active = true
    )
  );

-- Create DELETE policy (admin and gestor only)
CREATE POLICY "Admins and gestores can delete tipos_recepcao"
  ON public.tipos_recepcao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = tipos_recepcao.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 4: Fix servicos_camararia Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins e camararia podem modificar serviços de camararia" ON public.servicos_camararia;

-- Create new policy with gestor profile added
CREATE POLICY "Admins, gestores e camararia podem modificar serviços"
  ON public.servicos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = servicos_camararia.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = servicos_camararia.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 5: Fix itens_camararia Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins e camararia podem modificar itens de camararia" ON public.itens_camararia;

-- Create new policy with gestor profile added
CREATE POLICY "Admins, gestores e camararia podem modificar itens"
  ON public.itens_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = itens_camararia.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = itens_camararia.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 6: Fix fotos_camararia Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia de sua em" ON public.fotos_camararia;

-- Create new policy with gestor profile added
CREATE POLICY "Admins, gestores e camararia podem modificar fotos camararia"
  ON public.fotos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = fotos_camararia.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'camararia'::user_profile_enum])
        AND usuarios.empresa_id = fotos_camararia.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 7: Fix fotos_cozinha Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins e cozinha podem modificar fotos de cozinha de sua empres" ON public.fotos_cozinha;

-- Create new policy with gestor profile added
CREATE POLICY "Admins, gestores e cozinha podem modificar fotos cozinha"
  ON public.fotos_cozinha
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.empresa_id = fotos_cozinha.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.empresa_id = fotos_cozinha.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 8: Fix atividades (configuration table) Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins: Full access to atividades" ON public.atividades;

-- Create new policy with gestor profile added
CREATE POLICY "Admins and gestores: Full access to atividades"
  ON public.atividades
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = atividades.empresa_id
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = atividades.empresa_id
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- End of Migration
-- ============================================================================