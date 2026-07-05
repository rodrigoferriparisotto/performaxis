/*
  # Adicionar coluna ativo para empresas

  1. Alterações na Tabela
    - Adicionar coluna `ativo` na tabela `empresas`
    - Valor padrão `true` para empresas existentes
    - Índice para melhor performance

  2. Segurança
    - Manter políticas RLS existentes
    - Não há mudanças nas permissões
*/

-- Adicionar coluna ativo na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.empresas ADD COLUMN ativo boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Criar índice para a coluna ativo
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas USING btree (ativo);

-- Atualizar empresas existentes para ativo = true (caso não tenha valor)
UPDATE public.empresas SET ativo = true WHERE ativo IS NULL;