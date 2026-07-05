/*
  # Adicionar campo usuario_executor_id para rastreamento de execução

  1. Mudanças
    - Adiciona coluna `usuario_executor_id` em todas as tabelas de registros
    - `usuario_id`: mantém quem criou/programou o registro
    - `usuario_executor_id`: armazena quem efetivamente iniciou/executou o trabalho
    
  2. Tabelas Afetadas
    - registros_camararia
    - registros_cozinha
    - registros_recepcao
    - registros_gestao
    - registros_vendas
    - registros_areas_comuns
    - registros_atividades_diarias
    - registros_atividades_extras
    - registros_revisao
    
  3. Notas
    - Campo é nullable para compatibilidade com registros existentes
    - Registros antigos terão usuario_executor_id NULL
    - Para novos registros, será preenchido automaticamente
    - Para registros programados, captura quem iniciou a execução
*/

-- Adicionar campo usuario_executor_id em registros_camararia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_camararia' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_camararia ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_camararia_usuario_executor ON registros_camararia(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_cozinha
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_cozinha' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_cozinha ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_cozinha_usuario_executor ON registros_cozinha(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_recepcao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_recepcao' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_recepcao ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_recepcao_usuario_executor ON registros_recepcao(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_gestao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_gestao' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_gestao ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_gestao_usuario_executor ON registros_gestao(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_vendas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_vendas' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_vendas ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_vendas_usuario_executor ON registros_vendas(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_areas_comuns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_areas_comuns' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_areas_comuns ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_areas_comuns_usuario_executor ON registros_areas_comuns(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_atividades_diarias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_atividades_diarias' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_atividades_diarias ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_atividades_diarias_usuario_executor ON registros_atividades_diarias(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_atividades_extras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_atividades_extras' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_atividades_extras ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_usuario_executor ON registros_atividades_extras(usuario_executor_id);
  END IF;
END $$;

-- Adicionar campo usuario_executor_id em registros_revisao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_revisao' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE registros_revisao ADD COLUMN usuario_executor_id UUID REFERENCES usuarios(id);
    CREATE INDEX IF NOT EXISTS idx_registros_revisao_usuario_executor ON registros_revisao(usuario_executor_id);
  END IF;
END $$;