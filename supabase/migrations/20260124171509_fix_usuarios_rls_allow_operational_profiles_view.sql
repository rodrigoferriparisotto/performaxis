/*
  # Permitir perfis operacionais visualizarem dados básicos de usuários

  1. Problema
    - Perfis operacionais (camararia, recepcao, cozinha, etc.) não podem ver dados de outros usuários
    - Isso causa "Usuário não encontrado" em registros programados e históricos
    - JOINs com a tabela usuarios retornam NULL devido ao bloqueio RLS

  2. Solução
    - Modificar política SELECT para permitir todos os perfis ativos verem usuários da mesma empresa
    - Manter isolamento multi-tenancy (apenas mesma empresa_id)
    - Usar função SECURITY DEFINER existente para evitar recursão
    - Não alterar permissões de INSERT/UPDATE/DELETE (continuam restritas a admin/gestor)

  3. Mudanças
    - Drop da política SELECT atual (usuarios_select_policy_v2)
    - Criar nova política SELECT mais permissiva
    - Permitir qualquer usuário ativo ver outros usuários da mesma empresa
    - Manter proteção: próprios dados + mesma empresa + super-admin

  4. Segurança
    - Multi-tenancy mantido (empresa_id)
    - Apenas leitura para perfis operacionais
    - Sem recursão (usa get_current_user_empresa_and_profile)
    - Usuários inativos não têm acesso
*/

-- ============================================================================
-- Drop política SELECT atual
-- ============================================================================

DROP POLICY IF EXISTS "usuarios_select_policy_v2" ON public.usuarios;

-- ============================================================================
-- Criar nova política SELECT permitindo perfis operacionais
-- ============================================================================

CREATE POLICY "usuarios_select_policy_v3"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    -- Próprios dados (sempre permitido)
    id = auth.uid()
    OR
    -- Super-admin vê todos (usa auth.email(), sem recursão)
    public.is_super_admin()
    OR
    -- Qualquer usuário ativo pode ver outros usuários da mesma empresa
    -- Isso permite que perfis operacionais vejam quem criou/programou registros
    (
      EXISTS (
        SELECT 1 FROM public.get_current_user_empresa_and_profile() AS user_info
        WHERE user_info.active = true
          AND user_info.empresa_id = usuarios.empresa_id
      )
    )
  );

-- ============================================================================
-- Resultado: Perfis operacionais agora podem ver dados de usuários da mesma empresa
-- ============================================================================
