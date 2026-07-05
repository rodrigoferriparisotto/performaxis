/*
  # Adicionar campos contratuais e financeiros à tabela empresas

  1. Novos Campos
    - `inicio_contrato` (date) - Data de início do contrato
    - `duracao_contrato_meses` (integer) - Duração do contrato em meses
    - `final_contrato` (date) - Data final do contrato (calculada)
    - `valor_instalacao` (decimal) - Valor da instalação do sistema
    - `valor_mensalidade` (decimal) - Valor da mensalidade
    - `tipo_pagamento` (text) - Tipo de pagamento (mensal, trimestral, etc.)
    - `forma_pagamento` (text) - Forma de pagamento (PIX, boleto, cartão, etc.)
    - `valor_total` (decimal) - Valor total do contrato (calculado)
    - `valor_mensal` (decimal) - Valor mensal efetivo (calculado)

  2. Índices
    - Adicionar índices para consultas por datas de contrato

  3. Triggers
    - Trigger para calcular automaticamente campos derivados
*/

-- Adicionar novos campos à tabela empresas
DO $$
BEGIN
  -- Campos de contrato
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'inicio_contrato'
  ) THEN
    ALTER TABLE empresas ADD COLUMN inicio_contrato date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'duracao_contrato_meses'
  ) THEN
    ALTER TABLE empresas ADD COLUMN duracao_contrato_meses integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'final_contrato'
  ) THEN
    ALTER TABLE empresas ADD COLUMN final_contrato date;
  END IF;

  -- Campos financeiros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_instalacao'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_instalacao decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_mensalidade'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_mensalidade decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'tipo_pagamento'
  ) THEN
    ALTER TABLE empresas ADD COLUMN tipo_pagamento text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'forma_pagamento'
  ) THEN
    ALTER TABLE empresas ADD COLUMN forma_pagamento text;
  END IF;

  -- Campos calculados
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_total decimal(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'valor_mensal'
  ) THEN
    ALTER TABLE empresas ADD COLUMN valor_mensal decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Criar função para calcular campos derivados
CREATE OR REPLACE FUNCTION calculate_contract_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular data final do contrato
  IF NEW.inicio_contrato IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL THEN
    NEW.final_contrato := NEW.inicio_contrato + INTERVAL '1 month' * NEW.duracao_contrato_meses;
  END IF;

  -- Calcular valor total (instalação + mensalidades)
  IF NEW.valor_instalacao IS NOT NULL AND NEW.valor_mensalidade IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL THEN
    NEW.valor_total := NEW.valor_instalacao + (NEW.valor_mensalidade * NEW.duracao_contrato_meses);
  END IF;

  -- Calcular valor mensal efetivo (valor total / duração)
  IF NEW.valor_total IS NOT NULL AND NEW.duracao_contrato_meses IS NOT NULL AND NEW.duracao_contrato_meses > 0 THEN
    NEW.valor_mensal := NEW.valor_total / NEW.duracao_contrato_meses;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular campos automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_contract_fields ON empresas;
CREATE TRIGGER trigger_calculate_contract_fields
  BEFORE INSERT OR UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_contract_fields();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_inicio_contrato ON empresas(inicio_contrato);
CREATE INDEX IF NOT EXISTS idx_empresas_final_contrato ON empresas(final_contrato);
CREATE INDEX IF NOT EXISTS idx_empresas_tipo_pagamento ON empresas(tipo_pagamento);
CREATE INDEX IF NOT EXISTS idx_empresas_forma_pagamento ON empresas(forma_pagamento);