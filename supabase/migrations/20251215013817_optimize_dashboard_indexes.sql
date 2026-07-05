/*
  # Otimização de Índices para Dashboard Ao Vivo

  ## Objetivo
  Adicionar índices compostos nas tabelas de registros para melhorar significativamente
  a performance das queries do Dashboard Ao Vivo.

  ## Índices Adicionados
  Para cada tabela de registros, criamos índices compostos em:
  - (status, data, usuario_id) - Para queries que filtram por status, data e usuário
  - (usuario_id, data, status) - Para queries de ranking de usuários

  ## Tabelas Otimizadas
  1. registros_recepcao
  2. registros_camararia
  3. registros_revisao
  4. registros_areas_comuns
  5. registros_gestao
  6. registros_cozinha
  7. registros_vendas
  8. registros_atividades_diarias
  9. registros_atividades_extras

  ## Impacto Esperado
  - Redução de 80-90% no tempo de query para registros ativos
  - Melhoria significativa em queries de histórico e ranking
  - Menor carga no banco de dados
*/

CREATE INDEX IF NOT EXISTS idx_recepcao_status_data_usuario 
  ON registros_recepcao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_recepcao_usuario_data_status 
  ON registros_recepcao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_camararia_status_data_usuario 
  ON registros_camararia(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_camararia_usuario_data_status 
  ON registros_camararia(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_revisao_status_data_usuario 
  ON registros_revisao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_revisao_usuario_data_status 
  ON registros_revisao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_areas_comuns_status_data_usuario 
  ON registros_areas_comuns(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_areas_comuns_usuario_data_status 
  ON registros_areas_comuns(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_gestao_status_data_usuario 
  ON registros_gestao(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_gestao_usuario_data_status 
  ON registros_gestao(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_cozinha_status_data_usuario 
  ON registros_cozinha(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_cozinha_usuario_data_status 
  ON registros_cozinha(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_vendas_status_data_usuario 
  ON registros_vendas(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_vendas_usuario_data_status 
  ON registros_vendas(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_atividades_diarias_status_data_usuario 
  ON registros_atividades_diarias(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_atividades_diarias_usuario_data_status 
  ON registros_atividades_diarias(usuario_id, data, status);

CREATE INDEX IF NOT EXISTS idx_atividades_extras_status_data_usuario 
  ON registros_atividades_extras(status, data, usuario_id);

CREATE INDEX IF NOT EXISTS idx_atividades_extras_usuario_data_status 
  ON registros_atividades_extras(usuario_id, data, status);