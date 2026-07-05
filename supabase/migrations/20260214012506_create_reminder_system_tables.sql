/*
  # Create Reminder System Tables

  1. New Tables
    - `lembretes_enviados`
      - `id` (uuid, primary key)
      - `registro_id` (uuid, ID do registro)
      - `tipo_registro` (text, tipo: camararia, recepcao, areas_comuns, etc)
      - `usuario_id` (uuid, FK para usuarios)
      - `empresa_id` (uuid, FK para empresas)
      - `marco_tempo` (text, valores: 6h, 8h, 10h, 11h)
      - `enviado_em` (timestamptz, quando foi enviado)
      - `respondido` (boolean, se o usuário concluiu após o lembrete)
      - `created_at` (timestamptz)

    - `configuracoes_lembretes_usuario`
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, FK para usuarios, unique)
      - `ativo` (boolean, se lembretes estão ativos)
      - `horario_inicio_nao_perturbe` (time, início do período sem lembretes)
      - `horario_fim_nao_perturbe` (time, fim do período sem lembretes)
      - `permitir_som` (boolean)
      - `permitir_vibracao` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only view and manage their own reminder settings
    - Users can only view reminders from their company
    - Gestores can view reminders from all users in their company

  3. Indexes
    - Index on (registro_id, tipo_registro, marco_tempo) for quick lookups
    - Index on usuario_id for user queries
    - Index on empresa_id for company queries
    - Index on enviado_em for cleanup queries
*/

-- Create lembretes_enviados table
CREATE TABLE IF NOT EXISTS lembretes_enviados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL,
  tipo_registro text NOT NULL CHECK (tipo_registro IN ('camararia', 'recepcao', 'areas_comuns', 'gestao', 'atividades_diarias', 'atividades_extras', 'cozinha', 'vendas', 'revisao', 'manutencao', 'noturnas')),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  marco_tempo text NOT NULL CHECK (marco_tempo IN ('6h', '8h', '10h', '11h')),
  enviado_em timestamptz NOT NULL DEFAULT now(),
  respondido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create configuracoes_lembretes_usuario table
CREATE TABLE IF NOT EXISTS configuracoes_lembretes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true,
  horario_inicio_nao_perturbe time,
  horario_fim_nao_perturbe time,
  permitir_som boolean DEFAULT true,
  permitir_vibracao boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for lembretes_enviados
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_registro
  ON lembretes_enviados(registro_id, tipo_registro, marco_tempo);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_usuario
  ON lembretes_enviados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_empresa
  ON lembretes_enviados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_data
  ON lembretes_enviados(enviado_em);

-- Create indexes for configuracoes_lembretes_usuario
CREATE INDEX IF NOT EXISTS idx_configuracoes_lembretes_usuario
  ON configuracoes_lembretes_usuario(usuario_id);

-- Enable RLS
ALTER TABLE lembretes_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_lembretes_usuario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lembretes_enviados

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON lembretes_enviados FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
  );

-- Gestores can view all reminders from their company
CREATE POLICY "Gestores can view company reminders"
  ON lembretes_enviados FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = lembretes_enviados.empresa_id
      AND u.profile IN ('admin', 'gestor')
    )
  );

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders"
  ON lembretes_enviados FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
  );

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
  ON lembretes_enviados FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
  ON lembretes_enviados FOR DELETE
  TO authenticated
  USING (usuario_id = auth.uid());

-- RLS Policies for configuracoes_lembretes_usuario

-- Users can view their own settings
CREATE POLICY "Users can view own reminder settings"
  ON configuracoes_lembretes_usuario FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users can insert own reminder settings"
  ON configuracoes_lembretes_usuario FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "Users can update own reminder settings"
  ON configuracoes_lembretes_usuario FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Users can delete their own settings
CREATE POLICY "Users can delete own reminder settings"
  ON configuracoes_lembretes_usuario FOR DELETE
  TO authenticated
  USING (usuario_id = auth.uid());

-- Function to automatically clean old reminders (older than 30 days)
CREATE OR REPLACE FUNCTION limpar_lembretes_antigos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM lembretes_enviados
  WHERE enviado_em < now() - interval '30 days';
END;
$$;

-- Function to get pending records with elapsed time
CREATE OR REPLACE FUNCTION obter_registros_pendentes(p_usuario_id uuid)
RETURNS TABLE (
  registro_id uuid,
  tipo_registro text,
  horas_decorridas numeric,
  info_adicional jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return all pending records from different modules with elapsed time
  RETURN QUERY

  -- Camararia
  SELECT
    rc.id,
    'camararia'::text,
    EXTRACT(EPOCH FROM (now() - rc.hora_inicio)) / 3600,
    jsonb_build_object(
      'suite', s.nome,
      'servico', COALESCE(sc.nome, ''),
      'status', rc.status
    )
  FROM registros_camararia rc
  JOIN suites s ON s.id = rc.suite_id
  LEFT JOIN servicos_camararia sc ON sc.id = rc.servico_id
  WHERE rc.usuario_id = p_usuario_id
  AND rc.status = 'em_andamento'

  UNION ALL

  -- Recepcao
  SELECT
    rr.id,
    'recepcao'::text,
    EXTRACT(EPOCH FROM (now() - rr.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', tr.nome,
      'status', rr.status
    )
  FROM registros_recepcao rr
  JOIN tipos_recepcao tr ON tr.id = rr.tipo_recepcao_id
  WHERE rr.usuario_id = p_usuario_id
  AND rr.status = 'em_andamento'

  UNION ALL

  -- Areas Comuns
  SELECT
    rac.id,
    'areas_comuns'::text,
    EXTRACT(EPOCH FROM (now() - rac.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', tac.nome,
      'status', rac.status
    )
  FROM registros_areas_comuns rac
  JOIN tipos_areas_comuns tac ON tac.id = rac.tipo_area_comum_id
  WHERE rac.usuario_id = p_usuario_id
  AND rac.status = 'em_andamento'

  UNION ALL

  -- Gestao
  SELECT
    rg.id,
    'gestao'::text,
    EXTRACT(EPOCH FROM (now() - rg.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', tg.nome,
      'status', rg.status
    )
  FROM registros_gestao rg
  JOIN tipos_gestao tg ON tg.id = rg.tipo_gestao_id
  WHERE rg.usuario_id = p_usuario_id
  AND rg.status = 'em_andamento'

  UNION ALL

  -- Atividades Diarias
  SELECT
    rad.id,
    'atividades_diarias'::text,
    EXTRACT(EPOCH FROM (now() - rad.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', ta.nome,
      'status', rad.status
    )
  FROM registros_atividades_diarias rad
  JOIN tipos_atividades ta ON ta.id = rad.tipo_atividade_id
  WHERE rad.usuario_id = p_usuario_id
  AND rad.status = 'em_andamento'

  UNION ALL

  -- Atividades Extras
  SELECT
    rae.id,
    'atividades_extras'::text,
    EXTRACT(EPOCH FROM (now() - rae.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', te.nome,
      'status', rae.status
    )
  FROM registros_atividades_extras rae
  JOIN tipos_extras te ON te.id = rae.tipo_atividade_id
  WHERE rae.usuario_id = p_usuario_id
  AND rae.status = 'em_andamento'

  UNION ALL

  -- Cozinha
  SELECT
    rck.id,
    'cozinha'::text,
    EXTRACT(EPOCH FROM (now() - rck.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', tc.nome,
      'status', rck.status
    )
  FROM registros_cozinha rck
  JOIN tipos_cozinha tc ON tc.id = rck.tipo_cozinha_id
  WHERE rck.usuario_id = p_usuario_id
  AND rck.status = 'em_andamento'

  UNION ALL

  -- Vendas
  SELECT
    rv.id,
    'vendas'::text,
    EXTRACT(EPOCH FROM (now() - rv.hora_inicio)) / 3600,
    jsonb_build_object(
      'tipo', tfc.nome,
      'status', rv.status
    )
  FROM registros_vendas rv
  JOIN tipos_funcoes_comerciais tfc ON tfc.id = rv.tipo_funcao_id
  WHERE rv.usuario_id = p_usuario_id
  AND rv.status = 'em_andamento'

  UNION ALL

  -- Revisao
  SELECT
    rr.id,
    'revisao'::text,
    EXTRACT(EPOCH FROM (now() - rr.hora_inicio)) / 3600,
    jsonb_build_object(
      'suite', s.nome,
      'status', rr.status
    )
  FROM registros_revisao rr
  JOIN suites s ON s.id = rr.suite_id
  WHERE rr.usuario_id = p_usuario_id
  AND rr.status = 'em_andamento';

END;
$$;

-- Enable realtime for reminder tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'lembretes_enviados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lembretes_enviados;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'configuracoes_lembretes_usuario'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE configuracoes_lembretes_usuario;
  END IF;
END $$;
