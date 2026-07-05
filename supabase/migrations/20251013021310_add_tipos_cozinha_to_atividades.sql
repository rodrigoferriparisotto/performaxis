/*
  # Adicionar campo tipos_cozinha à tabela atividades

  1. Alterações na Tabela
    - Adicionar coluna `tipos_cozinha` (jsonb array) na tabela `atividades`
    - Campo opcional para armazenar IDs dos tipos de cozinha vinculados

  2. Funcionalidade
    - Permite vincular atividades de cozinha a tipos específicos
    - Facilita filtragem e organização das atividades
    - Mantém flexibilidade para atividades gerais (sem tipo específico)

  3. Índices
    - Criar índice GIN para melhor performance nas consultas jsonb
*/

-- Adicionar coluna tipos_cozinha à tabela atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_cozinha'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_cozinha jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_cozinha 
ON atividades USING gin (tipos_cozinha);

-- Comentário na coluna
COMMENT ON COLUMN atividades.tipos_cozinha IS 'Array de IDs dos tipos de cozinha vinculados à atividade';