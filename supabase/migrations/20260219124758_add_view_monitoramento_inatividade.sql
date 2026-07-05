/*
  # View de Monitoramento de Verificação de Inatividade
  
  1. Nova View
    - `view_monitoramento_inatividade`
      - Facilita consulta de status atual do sistema de verificação de inatividade
      - Mostra usuários com marcações, configurações, tokens e última verificação
  
  2. Segurança
    - View não precisa de RLS pois acessa apenas estruturas já protegidas
*/

-- Criar view para monitoramento simplificado
CREATE OR REPLACE VIEW view_monitoramento_inatividade AS
SELECT 
  u.id as usuario_id,
  u.name as nome_usuario,
  u.empresa_id,
  e.nome as nome_empresa,
  um.ultima_marcacao_em,
  EXTRACT(EPOCH FROM (now() - um.ultima_marcacao_em))/60 as minutos_inativo,
  CASE 
    WHEN um.ultima_marcacao_em IS NULL THEN 'Sem marcação'
    WHEN EXTRACT(EPOCH FROM (now() - um.ultima_marcacao_em))/60 >= 120 THEN 'Crítico (>2h)'
    WHEN EXTRACT(EPOCH FROM (now() - um.ultima_marcacao_em))/60 >= 60 THEN 'Alto (>1h)'
    WHEN EXTRACT(EPOCH FROM (now() - um.ultima_marcacao_em))/60 >= 30 THEN 'Médio (>30min)'
    ELSE 'Normal'
  END as nivel_inatividade,
  c.ativo as notificacoes_ativas,
  c.ativar_lembretes_inatividade,
  COUNT(pt.id) as total_tokens_ativos,
  u.active as usuario_ativo
FROM usuarios u
LEFT JOIN ultima_marcacao_usuario um ON um.usuario_id = u.id
LEFT JOIN configuracoes_lembretes_usuario c ON c.usuario_id = u.id
LEFT JOIN push_tokens pt ON pt.usuario_id = u.id AND pt.is_active = true
LEFT JOIN empresas e ON e.id = u.empresa_id
WHERE u.active = true
GROUP BY u.id, u.name, u.empresa_id, e.nome, um.ultima_marcacao_em, c.ativo, c.ativar_lembretes_inatividade, u.active;

-- Adicionar comentário
COMMENT ON VIEW view_monitoramento_inatividade IS 'View para monitorar status de inatividade dos usuários e configuração de alertas';
