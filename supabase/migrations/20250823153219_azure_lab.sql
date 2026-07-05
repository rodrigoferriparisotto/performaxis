/*
  # Adicionar campo tipo_recepcao_id aos registros de recepção

  1. Alterações na tabela
    - Adicionar campo `tipo_recepcao_id` (uuid, opcional)
    - Adicionar foreign key para `tipos_recepcao`
    - Adicionar índice para performance

  2. Segurança
    - Manter RLS existente
    - Não alterar políticas de segurança
*/

-- Adicionar campo tipo_recepcao_id à tabela registros_recepcao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_recepcao' AND column_name = 'tipo_recepcao_id'
  ) THEN
    ALTER TABLE registros_recepcao ADD COLUMN tipo_recepcao_id uuid;
  END IF;
END $$;

-- Adicionar foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_recepcao_tipo_recepcao_id_fkey'
  ) THEN
    ALTER TABLE registros_recepcao 
    ADD CONSTRAINT registros_recepcao_tipo_recepcao_id_fkey 
    FOREIGN KEY (tipo_recepcao_id) REFERENCES tipos_recepcao(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar índice para performance se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_registros_recepcao_tipo'
  ) THEN
    CREATE INDEX idx_registros_recepcao_tipo ON registros_recepcao(tipo_recepcao_id);
  END IF;
END $$;