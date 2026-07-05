/*
  # Criar Tabela de Logs de Cálculo de Performance

  ## Descrição
  Cria tabela para registrar logs de execução dos cálculos de performance,
  permitindo monitoramento e troubleshooting do sistema.

  ## 1. Nova Tabela

  ### logs_calculo_performance
  Registra cada execução do sistema de cálculo de performance
  - id (uuid, primary key)
  - empresa_id (uuid, foreign key -> empresas)
  - data_calculo (date) - data para qual o cálculo foi executado
  - tipo_calculo (text) - tipo: 'diario', 'mensal', 'retroativo'
  - usuarios_processados (integer) - quantidade de usuários processados
  - usuarios_com_erro (integer) - quantidade de erros
  - tempo_execucao_ms (integer) - tempo em milissegundos
  - status (text) - 'sucesso', 'erro', 'parcial'
  - mensagem_erro (text) - detalhes de erro se houver
  - detalhes_json (jsonb) - informações adicionais em JSON
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ## 2. Security
  - Enable RLS na tabela
  - Apenas admins podem visualizar logs
  - Sistema pode inserir logs automaticamente

  ## 3. Indexes
  - Índices em empresa_id, data_calculo, status, tipo_calculo
  - Índice composto para queries de monitoramento

  ## 4. Important Notes
  - Logs são mantidos indefinidamente para histórico
  - Sistema pode adicionar logs sem autenticação (via Edge Function)
  - Administradores podem consultar logs de sua empresa
*/

-- =====================================================
-- 1. CRIAR TABELA DE LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS logs_calculo_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data_calculo date NOT NULL,
  tipo_calculo text NOT NULL CHECK (tipo_calculo IN ('diario', 'mensal', 'retroativo')),
  usuarios_processados integer DEFAULT 0,
  usuarios_com_erro integer DEFAULT 0,
  tempo_execucao_ms integer DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'parcial')),
  mensagem_erro text,
  detalhes_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_logs_performance_empresa ON logs_calculo_performance(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_performance_data ON logs_calculo_performance(data_calculo DESC);
CREATE INDEX IF NOT EXISTS idx_logs_performance_status ON logs_calculo_performance(status);
CREATE INDEX IF NOT EXISTS idx_logs_performance_tipo ON logs_calculo_performance(tipo_calculo);
CREATE INDEX IF NOT EXISTS idx_logs_performance_empresa_data ON logs_calculo_performance(empresa_id, data_calculo DESC);
CREATE INDEX IF NOT EXISTS idx_logs_performance_empresa_tipo_status ON logs_calculo_performance(empresa_id, tipo_calculo, status);

-- =====================================================
-- 3. FUNÇÃO DE ATUALIZAÇÃO
-- =====================================================

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_logs_performance_updated_at ON logs_calculo_performance;
CREATE TRIGGER update_logs_performance_updated_at
  BEFORE UPDATE ON logs_calculo_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE logs_calculo_performance ENABLE ROW LEVEL SECURITY;

-- Admins podem visualizar logs da própria empresa
CREATE POLICY "Admins can view company logs"
  ON logs_calculo_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = logs_calculo_performance.empresa_id
      AND u.profile = 'admin'
    )
  );

-- Sistema pode inserir logs (service_role tem acesso total)
CREATE POLICY "System can insert logs"
  ON logs_calculo_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins podem atualizar logs da própria empresa (para correções)
CREATE POLICY "Admins can update company logs"
  ON logs_calculo_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = logs_calculo_performance.empresa_id
      AND u.profile = 'admin'
    )
  );

-- =====================================================
-- 5. COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE logs_calculo_performance IS 'Logs de execução dos cálculos de performance diária e mensal';
COMMENT ON COLUMN logs_calculo_performance.tipo_calculo IS 'Tipo de cálculo: diario, mensal ou retroativo';
COMMENT ON COLUMN logs_calculo_performance.status IS 'Status da execução: sucesso, erro ou parcial';
COMMENT ON COLUMN logs_calculo_performance.detalhes_json IS 'Informações adicionais sobre a execução em formato JSON';
