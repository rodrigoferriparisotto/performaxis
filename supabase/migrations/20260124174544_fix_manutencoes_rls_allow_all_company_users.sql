/*
  # Corrigir Política RLS de Manutenções para Visualização Compartilhada

  ## Contexto
  A tabela `manutencoes` precisa de tratamento especial: TODOS os usuários da empresa devem
  poder visualizar TODAS as manutenções para evitar solicitações duplicadas, independentemente
  de quem criou ou está executando a manutenção.

  ## Alterações

  ### 1. Política de Visualização (SELECT)
  - Remove a política restritiva atual que limita visualização apenas ao criador/executor
  - Cria nova política que permite visualização de todas as manutenções da mesma empresa
  - Qualquer usuário autenticado e ativo da empresa pode ver todas as manutenções

  ### 2. Políticas Mantidas
  - INSERT: usuários podem criar manutenções
  - UPDATE: apenas admin, manutencao, ou o próprio usuário pode editar
  - DELETE: apenas admin, manutencao, gestor ou o próprio usuário pode excluir

  ## Benefícios
  - Evita duplicação de solicitações de manutenção
  - Melhora visibilidade e coordenação entre equipes
  - Mantém segurança: usuários só veem manutenções da própria empresa
  - Preserva restrições de edição/exclusão

  ## Observações
  - Esta é uma exceção intencional à política restritiva aplicada às outras tabelas de histórico
  - Manutenções devem ser visíveis para coordenação operacional
*/

-- ============================================================================
-- Drop existing restrictive SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own records or all if admin/gestor" ON manutencoes;

-- ============================================================================
-- Create new shared visibility SELECT policy
-- ============================================================================

-- Todos os usuários autenticados da mesma empresa podem visualizar todas as manutenções
CREATE POLICY "All company users can view all manutencoes"
  ON manutencoes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.empresa_id = manutencoes.empresa_id
        AND u.active = true
    )
    OR is_super_admin()
  );
