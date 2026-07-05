/*
  # Habilitar Realtime para Todas as Tabelas do Dashboard

  1. Configurações
    - Habilitar REPLICA IDENTITY FULL em todas as tabelas de registros
    - Garantir que o realtime funcione para todas as operações (INSERT, UPDATE, DELETE)

  2. Tabelas Afetadas
    - registros_recepcao
    - registros_camararia
    - registros_revisao
    - registros_areas_comuns
    - registros_gestao
    - registros_cozinha
    - registros_vendas
    - registros_atividades_diarias
    - registros_atividades_extras
    - manutencoes

  3. Propósito
    - Permitir que o Dashboard Ao Vivo receba atualizações em tempo real
    - Eliminar necessidade de refresh manual
    - Melhorar experiência do usuário com updates instantâneos
*/

-- Habilitar REPLICA IDENTITY FULL para todas as tabelas de registros
ALTER TABLE registros_recepcao REPLICA IDENTITY FULL;
ALTER TABLE registros_camararia REPLICA IDENTITY FULL;
ALTER TABLE registros_revisao REPLICA IDENTITY FULL;
ALTER TABLE registros_areas_comuns REPLICA IDENTITY FULL;
ALTER TABLE registros_gestao REPLICA IDENTITY FULL;
ALTER TABLE registros_cozinha REPLICA IDENTITY FULL;
ALTER TABLE registros_vendas REPLICA IDENTITY FULL;
ALTER TABLE registros_atividades_diarias REPLICA IDENTITY FULL;
ALTER TABLE registros_atividades_extras REPLICA IDENTITY FULL;
ALTER TABLE manutencoes REPLICA IDENTITY FULL;

-- Comentários explicativos
COMMENT ON TABLE registros_recepcao IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_camararia IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_revisao IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_areas_comuns IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_gestao IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_cozinha IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_vendas IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_atividades_diarias IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE registros_atividades_extras IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
COMMENT ON TABLE manutencoes IS 'Tabela configurada para realtime - Dashboard Ao Vivo';
