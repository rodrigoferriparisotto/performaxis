/*
  # Sistema de Controle de Ciclo de Inatividade

  ## Resumo
  Implementa controle de estado para notificações de inatividade, garantindo que cada marcador
  (20, 40, 80, 120 minutos) seja enviado apenas UMA vez por ciclo de inatividade.

  ## Alterações

  1. Nova Tabela: `controle_ciclo_inatividade`
    - `usuario_id` (uuid, primary key) - ID do usuário
    - `empresa_id` (uuid) - ID da empresa do usuário
    - `ciclo_iniciado_em` (timestamptz) - Quando o usuário ficou inativo pela primeira vez
    - `ultima_marcacao_em` (timestamptz) - Última vez que o usuário marcou atividade
    - `marcadores_enviados` (jsonb) - Array com marcadores já enviados [20, 40, 80, 120]
    - `proximo_marcador` (integer) - Próximo marcador a enviar (20, 40, 80, 120, ou null)
    - `ciclo_completo` (boolean) - True se já enviou notificação de 120 minutos
    - `ultima_verificacao_em` (timestamptz) - Última verificação do sistema
    - `created_at`, `updated_at` (timestamptz) - Timestamps de auditoria

  2. Índices
    - Índice em usuario_id (primary key)
    - Índice em empresa_id para queries por empresa
    - Índice em ultima_verificacao_em para limpeza automática
    - Índice em ciclo_completo para queries de ciclos ativos

  3. Segurança (RLS)
    - Usuários podem visualizar apenas seu próprio registro
    - Admins e gestores podem visualizar registros da empresa
    - Edge functions (service_role) podem inserir/atualizar qualquer registro

  4. Função de Limpeza
    - `limpar_ciclos_inatividade_antigos()` - Remove ciclos de usuários sem registros abertos

  ## Comportamento Esperado
  - Sistema envia notificação aos 20 minutos (apenas uma vez)
  - Sistema envia notificação aos 40 minutos (apenas uma vez)
  - Sistema envia notificação aos 80 minutos (apenas uma vez)
  - Sistema envia notificação aos 120 minutos (apenas uma vez)
  - Sistema PARA de enviar notificações após 120 minutos
  - Quando usuário volta à atividade, ciclo é resetado

  ## Notas Importantes
  - Elimina spam de notificações repetidas
  - Garante sequência correta (20 → 40 → 80 → 120 → PARAR)
  - Detecta automaticamente novo ciclo quando usuário volta à atividade
  - Limpa ciclos antigos automaticamente
*/

-- Criar tabela de controle de ciclo de inatividade
CREATE TABLE IF NOT EXISTS controle_ciclo_inatividade (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ciclo_iniciado_em timestamptz NOT NULL DEFAULT now(),
  ultima_marcacao_em timestamptz NOT NULL DEFAULT now(),
  marcadores_enviados jsonb DEFAULT '[]'::jsonb NOT NULL,
  proximo_marcador integer CHECK (proximo_marcador IN (20, 40, 80, 120) OR proximo_marcador IS NULL) DEFAULT 20,
  ciclo_completo boolean DEFAULT false NOT NULL,
  ultima_verificacao_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_controle_ciclo_empresa
  ON controle_ciclo_inatividade(empresa_id);

CREATE INDEX IF NOT EXISTS idx_controle_ciclo_verificacao
  ON controle_ciclo_inatividade(ultima_verificacao_em);

CREATE INDEX IF NOT EXISTS idx_controle_ciclo_completo
  ON controle_ciclo_inatividade(ciclo_completo) WHERE ciclo_completo = false;

CREATE INDEX IF NOT EXISTS idx_controle_ciclo_proximo_marcador
  ON controle_ciclo_inatividade(proximo_marcador) WHERE proximo_marcador IS NOT NULL;

-- Ativar RLS
ALTER TABLE controle_ciclo_inatividade ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuário vê apenas seu próprio registro
CREATE POLICY "Users can view own cycle control"
  ON controle_ciclo_inatividade
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Política SELECT: Admin e gestor veem registros da empresa
CREATE POLICY "Admins and managers can view company cycle controls"
  ON controle_ciclo_inatividade
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = controle_ciclo_inatividade.empresa_id
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Política INSERT: Usuários autenticados podem inserir para si mesmos
CREATE POLICY "Users can insert own cycle control"
  ON controle_ciclo_inatividade
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Política UPDATE: Usuários podem atualizar próprio registro
CREATE POLICY "Users can update own cycle control"
  ON controle_ciclo_inatividade
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política DELETE: Usuários podem deletar próprio registro
CREATE POLICY "Users can delete own cycle control"
  ON controle_ciclo_inatividade
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at_controle_ciclo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_updated_at_controle_ciclo
  BEFORE UPDATE ON controle_ciclo_inatividade
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_controle_ciclo();

-- Função para limpar ciclos antigos (chamada pela edge function)
CREATE OR REPLACE FUNCTION limpar_ciclos_inatividade_antigos()
RETURNS TABLE (
  ciclos_removidos integer,
  detalhes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ciclos_removidos integer := 0;
  v_detalhes jsonb;
BEGIN
  -- Remover ciclos de usuários sem registros abertos há mais de 24 horas
  WITH ciclos_para_remover AS (
    DELETE FROM controle_ciclo_inatividade
    WHERE ultima_verificacao_em < now() - interval '24 hours'
    RETURNING usuario_id, empresa_id, ciclo_iniciado_em, marcadores_enviados
  )
  SELECT 
    COUNT(*)::integer,
    jsonb_agg(
      jsonb_build_object(
        'usuario_id', usuario_id,
        'empresa_id', empresa_id,
        'ciclo_iniciado_em', ciclo_iniciado_em,
        'marcadores_enviados', marcadores_enviados
      )
    )
  INTO v_ciclos_removidos, v_detalhes
  FROM ciclos_para_remover;

  RETURN QUERY SELECT v_ciclos_removidos, COALESCE(v_detalhes, '[]'::jsonb);
END;
$$;

-- Adicionar comentários para documentação
COMMENT ON TABLE controle_ciclo_inatividade IS 'Controla o estado do ciclo de notificações de inatividade por usuário';
COMMENT ON COLUMN controle_ciclo_inatividade.ciclo_iniciado_em IS 'Timestamp de quando o usuário ficou inativo pela primeira vez neste ciclo';
COMMENT ON COLUMN controle_ciclo_inatividade.ultima_marcacao_em IS 'Timestamp da última marcação de atividade do usuário';
COMMENT ON COLUMN controle_ciclo_inatividade.marcadores_enviados IS 'Array JSON com marcadores já enviados neste ciclo (ex: [20, 40, 80])';
COMMENT ON COLUMN controle_ciclo_inatividade.proximo_marcador IS 'Próximo marcador a enviar (20, 40, 80, 120) ou null se ciclo completo';
COMMENT ON COLUMN controle_ciclo_inatividade.ciclo_completo IS 'True se o usuário já recebeu a notificação de 120 minutos';
COMMENT ON COLUMN controle_ciclo_inatividade.ultima_verificacao_em IS 'Última vez que o sistema verificou este usuário';

-- Habilitar realtime para a tabela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'controle_ciclo_inatividade'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE controle_ciclo_inatividade;
  END IF;
END $$;
