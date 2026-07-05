/*
  # Create Global System Profile Permissions Table

  ## Summary
  Creates a centralized table to store profile permissions globally, managed only by Admin.
  This replaces the old approach of per-company profile permissions.

  ## Changes Made

  1. **New Table: perfis_sistema_permissoes**
     - Stores global permissions for each system profile
     - Managed centrally by Admin only
     - Applied to all companies uniformly

  2. **Fields**
     - `id` (uuid, primary key) - Unique identifier
     - `profile` (text, unique) - Profile name matching user_profile_enum
     - `permissoes` (text array) - List of allowed modules
     - `created_at` (timestamp) - Creation timestamp
     - `updated_at` (timestamp) - Last update timestamp

  3. **Security - RLS Policies**
     - SELECT: All authenticated users can read (needed for permission checks)
     - INSERT: Only Admin can create new profile permissions
     - UPDATE: Only Admin can modify profile permissions
     - DELETE: Only Admin can delete profile permissions

  4. **Initial Data**
     - Populates table with default permissions for all 11 system profiles
     - Based on current hardcoded permission structure

  ## Security Notes
  - Only Admin users (profile = 'admin' AND empresa_id IS NULL) can modify
  - All users can read to check their permissions
  - Permissions are global and apply to all companies
  - Changes are immediately reflected system-wide
*/

-- ============================================================================
-- PART 1: Create perfis_sistema_permissoes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.perfis_sistema_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile text UNIQUE NOT NULL,
  permissoes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure permissoes is not empty
  CONSTRAINT permissoes_not_empty CHECK (array_length(permissoes, 1) > 0)
);

-- Add index for faster lookups by profile
CREATE INDEX IF NOT EXISTS idx_perfis_sistema_permissoes_profile
  ON public.perfis_sistema_permissoes(profile);

-- Add comment
COMMENT ON TABLE public.perfis_sistema_permissoes IS
'Stores global permissions for each system profile. Managed by Admin only and applies to all companies.';

-- ============================================================================
-- PART 2: Enable RLS on perfis_sistema_permissoes
-- ============================================================================

ALTER TABLE public.perfis_sistema_permissoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create RLS policies for perfis_sistema_permissoes
-- ============================================================================

-- SELECT: All authenticated users can read permissions (needed for permission checks)
CREATE POLICY "perfis_sistema_permissoes_select_policy"
  ON public.perfis_sistema_permissoes
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only super-admin can create new profile permissions
CREATE POLICY "perfis_sistema_permissoes_insert_policy"
  ON public.perfis_sistema_permissoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
  );

-- UPDATE: Only super-admin can modify profile permissions
CREATE POLICY "perfis_sistema_permissoes_update_policy"
  ON public.perfis_sistema_permissoes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- DELETE: Only super-admin can delete profile permissions
CREATE POLICY "perfis_sistema_permissoes_delete_policy"
  ON public.perfis_sistema_permissoes
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
  );

-- Add comments to policies
COMMENT ON POLICY "perfis_sistema_permissoes_select_policy" ON public.perfis_sistema_permissoes IS
'All authenticated users can read profile permissions for permission checks';

COMMENT ON POLICY "perfis_sistema_permissoes_insert_policy" ON public.perfis_sistema_permissoes IS
'Only super-admin can create new profile permissions';

COMMENT ON POLICY "perfis_sistema_permissoes_update_policy" ON public.perfis_sistema_permissoes IS
'Only super-admin can modify profile permissions';

COMMENT ON POLICY "perfis_sistema_permissoes_delete_policy" ON public.perfis_sistema_permissoes IS
'Only super-admin can delete profile permissions';

-- ============================================================================
-- PART 4: Insert default profile permissions
-- ============================================================================

-- Insert default permissions for all 11 system profiles
INSERT INTO public.perfis_sistema_permissoes (profile, permissoes) VALUES
  -- Admin: Full access to everything
  ('admin', ARRAY[
    'usuarios', 'suites', 'empresa', 'recepcao', 'camararia', 'revisao',
    'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao',
    'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros', 'perfis'
  ]),

  -- Gestor: Access to all modules except empresa and perfis
  ('gestor', ARRAY[
    'usuarios', 'suites', 'recepcao', 'camararia', 'revisao',
    'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao',
    'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros'
  ]),

  -- Recepcao: Access to reception, revision, and maintenance
  ('recepcao', ARRAY[
    'recepcao', 'revisao', 'manutencao'
  ]),

  -- Camararia: Access to housekeeping, revision, common areas, extras, and maintenance
  ('camararia', ARRAY[
    'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao'
  ]),

  -- Revisao: Access to housekeeping, revision, common areas, and maintenance
  ('revisao', ARRAY[
    'camararia', 'revisao', 'areas_comuns', 'manutencao'
  ]),

  -- Areas Comuns: Access to housekeeping, revision, common areas, extras, and maintenance
  ('areas_comuns', ARRAY[
    'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao'
  ]),

  -- Manutencao: Access to housekeeping, revision, common areas, daily activities, and maintenance
  ('manutencao', ARRAY[
    'camararia', 'revisao', 'areas_comuns', 'atividades_diarias', 'manutencao'
  ]),

  -- Atividades Extras: Access to extra activities and maintenance
  ('atividades_extras', ARRAY[
    'atividades_extras', 'manutencao'
  ]),

  -- Atividades Diarias: Access to daily activities, extras, and maintenance
  ('atividades_diarias', ARRAY[
    'atividades_diarias', 'atividades_extras', 'manutencao'
  ]),

  -- Cozinha: Access to kitchen and maintenance
  ('cozinha', ARRAY[
    'cozinha', 'manutencao'
  ]),

  -- Vendas: Access to sales and maintenance
  ('vendas', ARRAY[
    'vendas', 'manutencao'
  ])
ON CONFLICT (profile) DO NOTHING;

-- ============================================================================
-- PART 5: Create function to update updated_at timestamp
-- ============================================================================

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_perfis_sistema_permissoes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_perfis_sistema_permissoes_updated_at_trigger
  ON public.perfis_sistema_permissoes;

CREATE TRIGGER update_perfis_sistema_permissoes_updated_at_trigger
  BEFORE UPDATE ON public.perfis_sistema_permissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_perfis_sistema_permissoes_updated_at();

COMMENT ON FUNCTION public.update_perfis_sistema_permissoes_updated_at() IS
'Automatically updates the updated_at timestamp when a profile permission is modified';
