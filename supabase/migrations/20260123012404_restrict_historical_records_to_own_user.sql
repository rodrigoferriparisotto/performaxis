/*
  # Restrict Historical Records Access to Own User

  ## Overview
  This migration restricts access to historical records so that regular users can only view their own records,
  while administrators and managers (gestor) maintain full access to all records within their company.

  ## Changes

  ### 1. Tables Affected
  - registros_recepcao
  - registros_camararia
  - registros_revisao
  - registros_areas_comuns
  - registros_gestao
  - registros_atividades_diarias
  - registros_atividades_extras
  - registros_cozinha
  - registros_vendas
  - manutencoes
  - cancelamentos

  ### 2. New SELECT Policy Logic
  For each table, users can view records when:
  - The record belongs to them (usuario_id = auth.uid())
  - OR they are admin or gestor from the same company
  - OR they are super_admin (global access)

  ### 3. Security Benefits
  - Improved privacy: users only see their own activity records
  - Maintains management oversight: admin and gestor can view all company records
  - Multi-tenancy security: company isolation is preserved
  - Super admin retains global access for system management

  ## Important Notes
  - This maintains backward compatibility for admin and gestor roles
  - Dashboard and reporting features remain functional for managers
  - Regular users gain privacy protection
  - All policies use safe RLS functions to avoid infinite recursion
*/

-- ============================================================================
-- Drop existing overly permissive SELECT policies
-- ============================================================================

-- registros_recepcao
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de recepção" ON registros_recepcao;
DROP POLICY IF EXISTS "Users can read registros_recepcao from company" ON registros_recepcao;

-- registros_camararia
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de camararia" ON registros_camararia;
DROP POLICY IF EXISTS "Users can read registros_camararia from company" ON registros_camararia;

-- registros_revisao
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de revisão" ON registros_revisao;
DROP POLICY IF EXISTS "Users can read registros_revisao from company" ON registros_revisao;

-- registros_areas_comuns
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de áreas comuns" ON registros_areas_comuns;
DROP POLICY IF EXISTS "Users can read registros_areas_comuns from company" ON registros_areas_comuns;

-- registros_gestao
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de gestão" ON registros_gestao;
DROP POLICY IF EXISTS "Users can read registros_gestao from company" ON registros_gestao;

-- registros_atividades_diarias
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de atividades diári" ON registros_atividades_diarias;
DROP POLICY IF EXISTS "Users can read registros_atividades_diarias from company" ON registros_atividades_diarias;

-- registros_atividades_extras
DROP POLICY IF EXISTS "Usuários autenticados podem ler registros de atividades extras" ON registros_atividades_extras;
DROP POLICY IF EXISTS "Users can read registros_atividades_extras from company" ON registros_atividades_extras;

-- registros_cozinha
DROP POLICY IF EXISTS "Users can read own cozinha records" ON registros_cozinha;
DROP POLICY IF EXISTS "Users can read registros_cozinha from company" ON registros_cozinha;
DROP POLICY IF EXISTS "Usuários podem visualizar registros da sua empresa" ON registros_cozinha;

-- registros_vendas
DROP POLICY IF EXISTS "Users can read own vendas records" ON registros_vendas;
DROP POLICY IF EXISTS "Users can view registros_vendas from own company" ON registros_vendas;

-- manutencoes
DROP POLICY IF EXISTS "Usuários autenticados podem ler manutenções" ON manutencoes;
DROP POLICY IF EXISTS "Users can read manutencoes from company" ON manutencoes;

-- cancelamentos
DROP POLICY IF EXISTS "Usuários autenticados podem ler cancelamentos" ON cancelamentos;
DROP POLICY IF EXISTS "Users can read cancelamentos from company" ON cancelamentos;

-- ============================================================================
-- Create new restricted SELECT policies
-- ============================================================================

-- registros_recepcao
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_recepcao
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_recepcao.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_camararia
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_camararia
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_camararia.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_revisao
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_revisao
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_revisao.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_areas_comuns
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_areas_comuns
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_areas_comuns.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_gestao
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_gestao
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_gestao.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_atividades_diarias
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_atividades_diarias
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_atividades_diarias.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_atividades_extras
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_atividades_extras
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_atividades_extras.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_cozinha
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_cozinha
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_cozinha.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- registros_vendas
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON registros_vendas
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = registros_vendas.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- manutencoes
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON manutencoes
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR solicitante_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = manutencoes.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );

-- cancelamentos
CREATE POLICY "Users can view own records or all if admin/gestor"
  ON cancelamentos
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_super_admin()
    OR (
      SELECT COALESCE(
        (u.profile IN ('admin', 'gestor') AND u.empresa_id = cancelamentos.empresa_id),
        false
      )
      FROM usuarios u
      WHERE u.id = auth.uid() AND u.active = true
    )
  );
