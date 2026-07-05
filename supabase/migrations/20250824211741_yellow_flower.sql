/*
  # Adicionar coluna tipos_atividades à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_atividades` (jsonb) à tabela `atividades`
    - Definir valor padrão como array vazio
    - Adicionar índice GIN para performance em consultas JSONB

  2. Índices
    - Criar índice GIN na coluna `tipos_atividades` para consultas eficientes
*/

-- Adicionar coluna tipos_atividades à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_atividades'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_atividades jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice GIN para performance em consultas JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'atividades' AND indexname = 'idx_atividades_tipos_atividades'
  ) THEN
    CREATE INDEX idx_atividades_tipos_atividades ON atividades USING gin (tipos_atividades);
  END IF;
END $$;