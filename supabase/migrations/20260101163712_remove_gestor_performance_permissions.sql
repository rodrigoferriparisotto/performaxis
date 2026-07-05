/*
  # Remove permissões de performance do perfil gestor

  1. Mudanças
    - Remove as permissões 'configuracao_metas', 'recalcular_performance' e 'monitoramento_performance' do perfil gestor
    - Atualiza a tabela perfis_sistema_permissoes

  2. Segurança
    - Apenas atualiza as permissões existentes sem impactar outros perfis
*/

-- Remover as três permissões do array de permissões do perfil gestor
UPDATE perfis_sistema_permissoes
SET
  permissoes = array_remove(array_remove(array_remove(permissoes, 'configuracao_metas'), 'recalcular_performance'), 'monitoramento_performance'),
  updated_at = now()
WHERE profile = 'gestor';
