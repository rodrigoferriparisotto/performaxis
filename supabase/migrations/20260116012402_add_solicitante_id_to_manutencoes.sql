/*
  # Adicionar Solicitante às Manutenções

  1. Alterações
    - Adiciona coluna `solicitante_id` à tabela `manutencoes`
      - Tipo: uuid (referência à tabela usuarios)
      - Permite identificar quem criou a solicitação de manutenção
      - Permite NULL para dados legados (manutenções antigas sem solicitante registrado)
    
  2. Observações
    - A coluna é opcional para preservar dados existentes
    - Novas manutenções devem sempre incluir o solicitante_id
    - Mantém separação entre quem solicitou e quem está executando
*/

-- Adicionar coluna solicitante_id à tabela manutencoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manutencoes' AND column_name = 'solicitante_id'
  ) THEN
    ALTER TABLE manutencoes ADD COLUMN solicitante_id uuid REFERENCES usuarios(id) ON DELETE SET NULL;
    
    -- Criar índice para melhorar performance de consultas
    CREATE INDEX IF NOT EXISTS idx_manutencoes_solicitante_id ON manutencoes(solicitante_id);
  END IF;
END $$;
