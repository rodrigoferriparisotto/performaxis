/*
  # Adicionar Total de Pontos ao Performance Mensal

  1. Alterações
    - Adiciona coluna `total_pontos_mes` à tabela `performance_mensal`
    - Tipo: decimal(10,2) - suporta valores até 99.999.999,99
    - Valor padrão: 0.00
    - Representa a soma total de pontos acumulados no mês
  
  2. Índices
    - Adiciona índice para otimizar consultas que ordenam por total de pontos
  
  3. Notas
    - A coluna `media_pontos_dia` existente é mantida intacta
    - Total de pontos é usado apenas para exibição e análise
    - Não afeta os critérios de ranking que continuam priorizando:
      1º - total_vezes_primeiro_lugar
      2º - media_pontos_dia
      3º - media_efetividade
      4º - total_horas_mes
*/

-- Adicionar coluna total_pontos_mes se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performance_mensal' AND column_name = 'total_pontos_mes'
  ) THEN
    ALTER TABLE performance_mensal 
    ADD COLUMN total_pontos_mes decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Criar índice para otimizar ordenação por total de pontos
CREATE INDEX IF NOT EXISTS idx_performance_mensal_total_pontos 
  ON performance_mensal(empresa_id, ano DESC, mes DESC, total_pontos_mes DESC);

-- Adicionar comentário explicativo na coluna
COMMENT ON COLUMN performance_mensal.total_pontos_mes IS 'Soma total de pontos acumulados pelo funcionário durante o mês';