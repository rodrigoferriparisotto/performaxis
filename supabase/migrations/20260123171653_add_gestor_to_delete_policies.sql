/*
  # Adicionar Perfil Gestor às Políticas de DELETE de Históricos

  ## Descrição
  Esta migration adiciona o perfil 'gestor' às políticas de DELETE de todas as tabelas de registros/históricos,
  permitindo que gestores possam excluir registros da sua empresa.

  ## Alterações nas Políticas

  ### Tabelas Modificadas:
  1. **registros_camararia** - Políticas de DELETE atualizadas para incluir 'gestor'
  2. **registros_recepcao** - Políticas de DELETE atualizadas para incluir 'gestor'
  3. **registros_revisao** - Políticas de DELETE atualizadas para incluir 'gestor'
  4. **registros_areas_comuns** - Políticas de DELETE atualizadas para incluir 'gestor'
  5. **registros_atividades_extras** - Políticas de DELETE atualizadas para incluir 'gestor'
  6. **registros_gestao** - Políticas de DELETE mantêm 'gestor' (já tinha)
  7. **registros_cozinha** - Políticas de DELETE atualizadas para incluir 'gestor'
  8. **registros_vendas** - Políticas de DELETE atualizadas para incluir 'gestor'

  ## Regras de Segurança
  - Gestores só podem deletar registros da própria empresa
  - Mantém a validação de usuários ativos
  - Preserva as verificações existentes de auth.uid()

  ## Notas Importantes
  - Esta migration resolve o bug onde gestores viam mensagem de sucesso mas os registros não eram deletados
  - O problema era que as políticas RLS bloqueavam silenciosamente as operações DELETE
  - Agora gestores terão permissões adequadas para gerenciar históricos
*/

-- ============================================================================
-- REGISTROS_CAMARARIA: Adicionar gestor à política de DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own registros_camararia" ON registros_camararia;

CREATE POLICY "Users can delete own registros_camararia"
  ON registros_camararia
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'camararia'::user_profile_enum, 'revisao'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_camararia.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_RECEPCAO: Adicionar gestor à política de DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own registros_recepcao" ON registros_recepcao;

CREATE POLICY "Users can delete own registros_recepcao"
  ON registros_recepcao
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'recepcao'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_recepcao.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_REVISAO: Adicionar gestor à política de DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own registros_revisao" ON registros_revisao;

CREATE POLICY "Users can delete own registros_revisao"
  ON registros_revisao
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'revisao'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_revisao.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_AREAS_COMUNS: Adicionar gestor à política de DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own registros_areas_comuns" ON registros_areas_comuns;

CREATE POLICY "Users can delete own registros_areas_comuns"
  ON registros_areas_comuns
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_areas_comuns.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_ATIVIDADES_EXTRAS: Adicionar gestor à política de DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own registros_atividades_extras" ON registros_atividades_extras;

CREATE POLICY "Users can delete own registros_atividades_extras"
  ON registros_atividades_extras
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'areas_comuns'::user_profile_enum, 'camararia'::user_profile_enum, 'manutencao'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_atividades_extras.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_COZINHA: Adicionar gestor às políticas de DELETE
-- ============================================================================

-- Remove políticas duplicadas e cria uma única política consistente
DROP POLICY IF EXISTS "Users can delete own registros_cozinha" ON registros_cozinha;
DROP POLICY IF EXISTS "Administradores podem excluir registros" ON registros_cozinha;
DROP POLICY IF EXISTS "Cozinha users and admins can delete cozinha records" ON registros_cozinha;

CREATE POLICY "Users can delete own registros_cozinha"
  ON registros_cozinha
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'cozinha'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_cozinha.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_VENDAS: Adicionar gestor às políticas de DELETE
-- ============================================================================

-- Remove políticas duplicadas e cria uma única política consistente
DROP POLICY IF EXISTS "Admins can delete registros_vendas from own company" ON registros_vendas;
DROP POLICY IF EXISTS "Vendas users and admins can delete vendas records" ON registros_vendas;

CREATE POLICY "Users can delete own registros_vendas"
  ON registros_vendas
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'vendas'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_vendas.empresa_id
        AND usuarios.active = true
    ))
  );

-- ============================================================================
-- REGISTROS_GESTAO: Verificar e garantir que gestor está na política
-- ============================================================================

-- Esta tabela já deveria ter gestor, mas vamos garantir
DROP POLICY IF EXISTS "Users can delete own registros_gestao" ON registros_gestao;

CREATE POLICY "Users can delete own registros_gestao"
  ON registros_gestao
  FOR DELETE
  TO authenticated
  USING (
    (usuario_id = auth.uid()) 
    OR 
    (EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.profile = ANY(ARRAY['admin'::user_profile_enum, 'gestor'::user_profile_enum])
        AND usuarios.empresa_id = registros_gestao.empresa_id
        AND usuarios.active = true
    ))
  );
