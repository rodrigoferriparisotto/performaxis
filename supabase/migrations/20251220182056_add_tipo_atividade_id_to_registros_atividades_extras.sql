/*
  # Adicionar campo tipo_atividade_id à tabela registros_atividades_extras

  ## Resumo
  Esta migração adiciona suporte para vincular registros de atividades extras
  com tipos específicos de extras, permitindo que usuários escolham o tipo
  antes de iniciar um registro.

  ## Mudanças

  ### 1. Adicionar Campo
  - Adiciona coluna `tipo_atividade_id` à tabela `registros_atividades_extras`
  - Campo é UUID e nullable (opcional para compatibilidade com registros antigos)
  - Foreign key para tabela `tipos_extras`

  ### 2. Índice
  - Cria índice em `tipo_atividade_id` para otimizar queries de filtro

  ## Compatibilidade
  - Registros existentes permanecerão com tipo_atividade_id NULL
  - Sistema continua funcionando normalmente para registros antigos
  - Novos registros podem (mas não são obrigados a) incluir o tipo

  ## Segurança
  - Não são necessárias mudanças em RLS
  - As policies existentes continuam válidas
*/

-- Adicionar campo tipo_atividade_id à tabela registros_atividades_extras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_atividades_extras' 
    AND column_name = 'tipo_atividade_id'
  ) THEN
    ALTER TABLE registros_atividades_extras 
    ADD COLUMN tipo_atividade_id UUID;
  END IF;
END $$;

-- Criar foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_registros_atividades_extras_tipo'
  ) THEN
    ALTER TABLE registros_atividades_extras
    ADD CONSTRAINT fk_registros_atividades_extras_tipo
    FOREIGN KEY (tipo_atividade_id)
    REFERENCES tipos_extras(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice para otimizar queries por tipo
CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_tipo_atividade
ON registros_atividades_extras(tipo_atividade_id);