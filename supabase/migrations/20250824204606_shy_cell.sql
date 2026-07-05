/*
  # Adicionar coluna tipo_gestao_id à tabela registros_gestao

  1. Modificações na tabela
    - `registros_gestao`
      - Adicionar coluna `tipo_gestao_id` (uuid, nullable)
      - Adicionar foreign key para `tipos_gestao`
      - Adicionar índice para performance

  2. Segurança
    - Manter políticas RLS existentes
*/

-- Adicionar coluna tipo_gestao_id à tabela registros_gestao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_gestao' AND column_name = 'tipo_gestao_id'
  ) THEN
    ALTER TABLE registros_gestao ADD COLUMN tipo_gestao_id uuid;
  END IF;
END $$;

-- Adicionar foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_gestao_tipo_gestao_id_fkey'
  ) THEN
    ALTER TABLE registros_gestao 
    ADD CONSTRAINT registros_gestao_tipo_gestao_id_fkey 
    FOREIGN KEY (tipo_gestao_id) REFERENCES tipos_gestao(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_registros_gestao_tipo_gestao 
ON registros_gestao USING btree (tipo_gestao_id);