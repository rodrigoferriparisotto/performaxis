/*
  # Adicionar campo tipos_recepcao à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_recepcao` (jsonb array) na tabela `atividades`
    - Campo opcional para armazenar IDs dos tipos de recepção vinculados

  2. Funcionalidade
    - Permite vincular atividades de recepção a tipos específicos
    - Facilita filtragem e organização das atividades
    - Mantém flexibilidade para atividades gerais (sem tipo específico)
*/

-- Adicionar coluna tipos_recepcao à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_recepcao'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_recepcao jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_recepcao 
ON atividades USING gin (tipos_recepcao);

-- Comentário na coluna
COMMENT ON COLUMN atividades.tipos_recepcao IS 'Array de IDs dos tipos de recepção vinculados à atividade';