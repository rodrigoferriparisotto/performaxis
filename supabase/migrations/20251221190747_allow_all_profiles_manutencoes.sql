/*
  # Allow All Profiles to Manage Maintenance Records

  ## Summary
  This migration expands RLS policies on the manutencoes table to allow all authenticated
  user profiles to create, update, and delete maintenance records, not just admin, 
  manutencao, and cozinha profiles.

  ## Problem
  Users with 'camararia' and other profiles were receiving 403 Forbidden errors when trying
  to create maintenance records because the RLS policies were too restrictive.

  ## Solution
  Update INSERT, UPDATE, and DELETE policies to include all profile types:
  - admin
  - camararia  
  - manutencao
  - areas_comuns
  - recepcao
  - revisao
  - gestor
  - cozinha
  - vendas

  ## Security Notes
  - All policies require authenticated users
  - Users must be active (active = true)
  - SELECT policy remains unchanged (all authenticated users can read)
  - Company isolation is maintained via empresa_id checks
*/

-- ============================================================================
-- Update manutencoes INSERT Policy
-- ============================================================================

DROP POLICY IF EXISTS "Usuários de manutenção e cozinha podem inserir manutenções" ON manutencoes;

CREATE POLICY "All authenticated users can insert manutencoes"
  ON manutencoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'recepcao'::user_profile_enum,
          'revisao'::user_profile_enum,
          'gestor'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- Update manutencoes UPDATE Policy
-- ============================================================================

DROP POLICY IF EXISTS "Usuários de manutenção e cozinha podem atualizar manutenções" ON manutencoes;

CREATE POLICY "All authenticated users can update manutencoes"
  ON manutencoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'recepcao'::user_profile_enum,
          'revisao'::user_profile_enum,
          'gestor'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'recepcao'::user_profile_enum,
          'revisao'::user_profile_enum,
          'gestor'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- Update manutencoes DELETE Policy
-- ============================================================================

DROP POLICY IF EXISTS "Usuários de manutenção e cozinha podem deletar manutenções" ON manutencoes;

CREATE POLICY "All authenticated users can delete manutencoes"
  ON manutencoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'recepcao'::user_profile_enum,
          'revisao'::user_profile_enum,
          'gestor'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- End of Migration
-- ============================================================================
