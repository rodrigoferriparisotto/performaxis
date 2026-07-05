/*
  # Adicionar Módulos de Performance aos Perfis

  ## Resumo
  Adiciona três novos módulos relacionados à gestão de performance aos perfis Admin e Gestor:
  - Configuração de Metas
  - Recalcular Performance
  - Monitoramento

  ## Alterações Realizadas

  1. **Atualização do Perfil Admin**
     - Adiciona permissões: `configuracao_metas`, `recalcular_performance`, `monitoramento_performance`
     - Mantém todas as permissões existentes

  2. **Atualização do Perfil Gestor**
     - Adiciona permissões: `configuracao_metas`, `recalcular_performance`, `monitoramento_performance`
     - Mantém todas as permissões existentes

  ## Segurança
  - As atualizações respeitam as políticas RLS existentes
  - Apenas super-admin pode executar estas alterações
  - Os novos módulos ficam imediatamente disponíveis para seleção na tela de perfis
*/

-- ============================================================================
-- Atualizar permissões do perfil Admin
-- ============================================================================

UPDATE public.perfis_sistema_permissoes
SET
  permissoes = array_append(
    array_append(
      array_append(
        permissoes,
        'configuracao_metas'
      ),
      'recalcular_performance'
    ),
    'monitoramento_performance'
  ),
  updated_at = now()
WHERE
  profile = 'admin'
  AND NOT ('configuracao_metas' = ANY(permissoes));

-- ============================================================================
-- Atualizar permissões do perfil Gestor
-- ============================================================================

UPDATE public.perfis_sistema_permissoes
SET
  permissoes = array_append(
    array_append(
      array_append(
        permissoes,
        'configuracao_metas'
      ),
      'recalcular_performance'
    ),
    'monitoramento_performance'
  ),
  updated_at = now()
WHERE
  profile = 'gestor'
  AND NOT ('configuracao_metas' = ANY(permissoes));
