/*
  # Conceder Permissões EXECUTE para Funções de Limpeza de Histórico

  1. Problema Identificado
    - As funções de limpeza de histórico foram criadas mas não receberam permissões EXECUTE
    - Usuários autenticados não conseguem executar as funções via RPC
    - Resultado: Botão "Buscar Registros" não retorna nenhum resultado

  2. Funções Afetadas
    - `consultar_registros_antigos` - Consulta quantidade de registros antigos por tabela
    - `executar_limpeza_historico` - Executa exclusão de registros antigos
    - `verificar_permissao_limpeza` - Verifica se usuário tem permissão

  3. Correção Aplicada
    - Conceder permissões EXECUTE para usuários autenticados (authenticated role)
    - Manter SECURITY DEFINER para garantir segurança (permissões checadas internamente)
    
  4. Segurança
    - As funções já possuem verificação interna de permissões (admin e gestor)
    - GRANT EXECUTE apenas permite chamar a função
    - A função em si valida se o usuário tem o perfil correto
*/

-- Conceder permissão EXECUTE nas funções de limpeza de histórico para usuários autenticados
GRANT EXECUTE ON FUNCTION consultar_registros_antigos(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION executar_limpeza_historico(uuid, uuid, integer, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_permissao_limpeza(uuid) TO authenticated;
