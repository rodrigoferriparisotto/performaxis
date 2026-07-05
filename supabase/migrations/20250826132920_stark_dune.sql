/*
  # Adicionar coluna ativo na tabela empresas

  1. Modificações
    - Adicionar coluna `ativo` na tabela `empresas`
    - Definir valor padrão como `true`
    - Atualizar empresas existentes para ativo = true

  2. Funcionalidade
    - Permite inativar empresas em vez de excluí-las quando há dados vinculados
    - Mantém histórico e integridade dos dados
*/

-- Adicionar coluna ativo na tabela empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.empresas ADD COLUMN ativo boolean DEFAULT true;
    
    -- Atualizar empresas existentes para ativo = true
    UPDATE public.empresas SET ativo = true WHERE ativo IS NULL;
    
    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas(ativo);
    
    RAISE NOTICE 'Coluna ativo adicionada à tabela empresas com sucesso';
  ELSE
    RAISE NOTICE 'Coluna ativo já existe na tabela empresas';
  END IF;
END $$;