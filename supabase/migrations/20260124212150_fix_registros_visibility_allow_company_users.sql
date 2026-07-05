/*
  # Permitir Visualização Compartilhada de Registros entre Usuários da Mesma Empresa

  ## Problema
  - Recepcionistas não conseguem ver programações criadas por outros recepcionistas
  - Camareiras não veem programações feitas para elas por recepcionistas
  - Outros perfis operacionais têm o mesmo problema de visibilidade
  - Isso prejudica a coordenação operacional e causa duplicação de trabalho

  ## Solução
  - Substituir políticas restritivas de SELECT que limitam visualização apenas ao criador/executor
  - Criar novas políticas que permitem TODOS os usuários da mesma empresa visualizarem TODOS os registros
  - Mantém restrições de edição e exclusão para segurança dos dados
  - Melhora coordenação operacional e transparência entre equipes

  ## Tabelas Afetadas
  - registros_camararia
  - registros_recepcao
  - registros_revisao
  - registros_areas_comuns
  - registros_gestao
  - registros_atividades_diarias
  - registros_atividades_extras
  - registros_cozinha
  - registros_vendas

  ## Segurança
  - Usuários ainda só podem VER registros da própria empresa (multi-tenancy mantido)
  - Edição e exclusão continuam restritas ao criador/executor ou admin/gestor
  - Super admins mantêm acesso total
*/

-- =========================================================================
-- REGISTROS CAMARARIA
-- =========================================================================

-- Remover política restritiva de visualização
DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_camararia;

-- Criar nova política que permite todos da empresa visualizarem
CREATE POLICY "Company users can view all registros_camararia"
  ON registros_camararia
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS RECEPCAO
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_recepcao;

CREATE POLICY "Company users can view all registros_recepcao"
  ON registros_recepcao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS REVISAO
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_revisao;

CREATE POLICY "Company users can view all registros_revisao"
  ON registros_revisao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS AREAS COMUNS
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_areas_comuns;

CREATE POLICY "Company users can view all registros_areas_comuns"
  ON registros_areas_comuns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS GESTAO
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_gestao;

CREATE POLICY "Company users can view all registros_gestao"
  ON registros_gestao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS ATIVIDADES DIARIAS
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_atividades_diarias;

CREATE POLICY "Company users can view all registros_atividades_diarias"
  ON registros_atividades_diarias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_atividades_diarias.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS ATIVIDADES EXTRAS
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_atividades_extras;

CREATE POLICY "Company users can view all registros_atividades_extras"
  ON registros_atividades_extras
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS COZINHA
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_cozinha;

CREATE POLICY "Company users can view all registros_cozinha"
  ON registros_cozinha
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_cozinha.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );

-- =========================================================================
-- REGISTROS VENDAS
-- =========================================================================

DROP POLICY IF EXISTS "Users can view created or executed records" ON registros_vendas;

CREATE POLICY "Company users can view all registros_vendas"
  ON registros_vendas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.empresa_id = registros_vendas.empresa_id
        AND usuarios.active = true
    )
    OR is_super_admin()
  );
