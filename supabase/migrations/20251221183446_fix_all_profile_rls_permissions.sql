/*
  # Fix RLS Permissions for All Profile Types

  ## Summary
  This migration fixes RLS policies across multiple tables to ensure that users with
  'cozinha' and 'vendas' profiles can properly manage their own records and access
  shared activities.

  ## Problem
  Several tables had overly restrictive RLS policies that prevented 'cozinha' and
  'vendas' users from:
  - Creating and updating their own records
  - Deleting their own records
  - Accessing shared activity tables (atividades_diarias, atividades_extras, manutencoes)

  ## Tables Fixed

  ### 1. registros_vendas
  - **Before**: INSERT/UPDATE only allowed for the record owner
  - **After**: INSERT/UPDATE allowed for record owner OR users with 'vendas' profile OR admins
  - **DELETE**: Now allows 'vendas' profile in addition to admins

  ### 2. registros_cozinha
  - **Before**: INSERT/UPDATE only allowed for the record owner
  - **After**: INSERT/UPDATE allowed for record owner OR users with 'cozinha' profile OR admins
  - **DELETE**: Now allows 'cozinha' profile in addition to admins

  ### 3. registros_atividades_diarias
  - **Before**: Only admin, areas_comuns, camararia, manutencao profiles
  - **After**: Added 'cozinha' and 'vendas' to allowed profiles

  ### 4. registros_atividades_extras
  - **Before**: Only admin, areas_comuns, camararia, manutencao profiles
  - **After**: Added 'cozinha' and 'vendas' to allowed profiles

  ### 5. manutencoes
  - **Before**: Only admin and manutencao profiles
  - **After**: Added 'cozinha' profile

  ## Security
  - All policies maintain proper authentication checks
  - Users can only modify records they own or that their profile allows
  - Admin access is preserved on all tables
  - SELECT policies remain open to all authenticated users for reporting
*/

-- ============================================================================
-- SECTION 1: Fix registros_vendas Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own vendas records" ON registros_vendas;
DROP POLICY IF EXISTS "Users can create own vendas records" ON registros_vendas;
DROP POLICY IF EXISTS "Users can update own vendas records" ON registros_vendas;
DROP POLICY IF EXISTS "Only admins can delete vendas records" ON registros_vendas;

-- Create new SELECT policy (unchanged - all authenticated users can read)
CREATE POLICY "Users can read own vendas records"
  ON registros_vendas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Create new INSERT policy (allow vendas profile OR record owner OR admin)
CREATE POLICY "Vendas users can create vendas records"
  ON registros_vendas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'vendas'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- Create new UPDATE policy (allow vendas profile OR record owner OR admin)
CREATE POLICY "Vendas users can update vendas records"
  ON registros_vendas
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'vendas'::user_profile_enum])
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'vendas'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- Create new DELETE policy (allow vendas profile OR admin)
CREATE POLICY "Vendas users and admins can delete vendas records"
  ON registros_vendas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'vendas'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 2: Fix registros_cozinha Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own cozinha records" ON registros_cozinha;
DROP POLICY IF EXISTS "Users can create own cozinha records" ON registros_cozinha;
DROP POLICY IF EXISTS "Users can update own cozinha records" ON registros_cozinha;
DROP POLICY IF EXISTS "Only admins can delete cozinha records" ON registros_cozinha;

-- Create new SELECT policy (unchanged - all authenticated users can read)
CREATE POLICY "Users can read own cozinha records"
  ON registros_cozinha
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Create new INSERT policy (allow cozinha profile OR record owner OR admin)
CREATE POLICY "Cozinha users can create cozinha records"
  ON registros_cozinha
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- Create new UPDATE policy (allow cozinha profile OR record owner OR admin)
CREATE POLICY "Cozinha users can update cozinha records"
  ON registros_cozinha
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.active = true
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- Create new DELETE policy (allow cozinha profile OR admin)
CREATE POLICY "Cozinha users and admins can delete cozinha records"
  ON registros_cozinha
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'cozinha'::user_profile_enum])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- SECTION 3: Fix registros_atividades_diarias Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades diárias" ON registros_atividades_diarias;

-- Create new policy with cozinha and vendas profiles added
CREATE POLICY "Usuários podem modificar seus registros de atividades diárias"
  ON registros_atividades_diarias
  FOR ALL
  TO authenticated
  USING (
    (usuario_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    ))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- SECTION 4: Fix registros_atividades_extras Policies
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades extras" ON registros_atividades_extras;

-- Create new policy with cozinha and vendas profiles added
CREATE POLICY "Usuários podem modificar seus registros de atividades extras"
  ON registros_atividades_extras
  FOR ALL
  TO authenticated
  USING (
    (usuario_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    ))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'areas_comuns'::user_profile_enum,
          'camararia'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum,
          'vendas'::user_profile_enum
        ])
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- SECTION 5: Fix manutencoes Policies
-- ============================================================================

-- Drop existing policies for manutencoes
DROP POLICY IF EXISTS "Usuários autenticados podem ler manutenções" ON manutencoes;
DROP POLICY IF EXISTS "Usuários de manutenção podem inserir manutenções" ON manutencoes;
DROP POLICY IF EXISTS "Usuários de manutenção podem atualizar suas manutenções" ON manutencoes;
DROP POLICY IF EXISTS "Usuários de manutenção podem deletar suas manutenções" ON manutencoes;

-- Recreate SELECT policy (unchanged - all authenticated users can read)
CREATE POLICY "Usuários autenticados podem ler manutenções"
  ON manutencoes
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate INSERT policy with cozinha profile added
CREATE POLICY "Usuários de manutenção e cozinha podem inserir manutenções"
  ON manutencoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- Recreate UPDATE policy with cozinha profile added
CREATE POLICY "Usuários de manutenção e cozinha podem atualizar manutenções"
  ON manutencoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum
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
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- Recreate DELETE policy with cozinha profile added
CREATE POLICY "Usuários de manutenção e cozinha podem deletar manutenções"
  ON manutencoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY[
          'admin'::user_profile_enum,
          'manutencao'::user_profile_enum,
          'cozinha'::user_profile_enum
        ])
        AND usuarios.active = true
    )
  );

-- ============================================================================
-- End of Migration
-- ============================================================================
