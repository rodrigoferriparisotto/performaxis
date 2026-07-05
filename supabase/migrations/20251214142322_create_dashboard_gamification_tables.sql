/*
  # Create Dashboard Gamification and Metrics Tables
  
  1. New Tables
    - `metas_diarias`: Daily goals per department
      - `id` (uuid, primary key)
      - `data` (date): Date of the goal
      - `departamento` (text): Department name (recepcao, camararia, etc)
      - `meta_registros` (integer): Target number of records to complete
      - `registros_concluidos` (integer): Actual completed records
      - `empresa_id` (uuid): Reference to company
      - `created_at`, `updated_at` (timestamp)
    
    - `conquistas`: Achievement badges and rewards
      - `id` (uuid, primary key)
      - `nome` (text): Achievement name
      - `descricao` (text): Description of achievement
      - `tipo` (text): Type (velocidade, consistencia, volume, etc)
      - `icone` (text): Icon name
      - `cor` (text): Color hex code
      - `criterio` (jsonb): Criteria to earn achievement
      - `ativo` (boolean): Active status
      - `created_at`, `updated_at` (timestamp)
    
    - `usuarios_conquistas`: User achievements junction table
      - `id` (uuid, primary key)
      - `usuario_id` (uuid): Reference to user
      - `conquista_id` (uuid): Reference to achievement
      - `data_obtencao` (timestamptz): When achievement was earned
      - `empresa_id` (uuid): Reference to company
      - `created_at` (timestamp)
    
    - `historico_performance`: Historical performance metrics
      - `id` (uuid, primary key)
      - `data` (date): Performance date
      - `usuario_id` (uuid): Reference to user
      - `departamento` (text): Department name
      - `registros_concluidos` (integer): Number of completed records
      - `tempo_medio_conclusao` (integer): Average completion time in minutes
      - `velocidade_score` (numeric): Performance score
      - `empresa_id` (uuid): Reference to company
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read their company data
    - Add policies for admins to manage all data
*/

-- Create metas_diarias table
CREATE TABLE IF NOT EXISTS metas_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  departamento text NOT NULL,
  meta_registros integer NOT NULL DEFAULT 0,
  registros_concluidos integer NOT NULL DEFAULT 0,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(data, departamento, empresa_id)
);

ALTER TABLE metas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company metas"
  ON metas_diarias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

CREATE POLICY "Admins can insert metas"
  ON metas_diarias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

CREATE POLICY "Admins can update metas"
  ON metas_diarias FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.empresa_id = metas_diarias.empresa_id
    )
  );

-- Create conquistas table
CREATE TABLE IF NOT EXISTS conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL,
  icone text NOT NULL DEFAULT 'award',
  cor text NOT NULL DEFAULT '#F59E0B',
  criterio jsonb NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conquistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active conquistas"
  ON conquistas FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins can manage conquistas"
  ON conquistas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- Create usuarios_conquistas table
CREATE TABLE IF NOT EXISTS usuarios_conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  conquista_id uuid NOT NULL REFERENCES conquistas(id) ON DELETE CASCADE,
  data_obtencao timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, conquista_id)
);

ALTER TABLE usuarios_conquistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conquistas"
  ON usuarios_conquistas FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = usuarios_conquistas.empresa_id
    )
  );

CREATE POLICY "System can insert conquistas"
  ON usuarios_conquistas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Create historico_performance table
CREATE TABLE IF NOT EXISTS historico_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  departamento text NOT NULL,
  registros_concluidos integer NOT NULL DEFAULT 0,
  tempo_medio_conclusao integer DEFAULT 0,
  velocidade_score numeric(5,2) DEFAULT 0,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(data, usuario_id, departamento)
);

ALTER TABLE historico_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance"
  ON historico_performance FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = historico_performance.empresa_id
    )
  );

CREATE POLICY "System can insert performance"
  ON historico_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  );

CREATE POLICY "System can update performance"
  ON historico_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metas_diarias_data ON metas_diarias(data);
CREATE INDEX IF NOT EXISTS idx_metas_diarias_empresa ON metas_diarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_conquistas_usuario ON usuarios_conquistas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_performance_data ON historico_performance(data);
CREATE INDEX IF NOT EXISTS idx_historico_performance_usuario ON historico_performance(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_performance_empresa ON historico_performance(empresa_id);

-- Insert some default conquistas
INSERT INTO conquistas (nome, descricao, tipo, icone, cor, criterio) VALUES
  ('Velocista', 'Complete 10 registros em menos de 2 horas cada', 'velocidade', 'zap', '#3B82F6', '{"tipo": "velocidade", "quantidade": 10, "tempo_max": 120}'),
  ('Consistente', 'Complete atividades por 7 dias consecutivos', 'consistencia', 'calendar-check', '#10B981', '{"tipo": "streak", "dias": 7}'),
  ('Produtivo', 'Complete 50 registros em um mês', 'volume', 'trending-up', '#F59E0B', '{"tipo": "volume", "quantidade": 50, "periodo": "mes"}'),
  ('Perfeccionista', 'Complete 20 registros sem nenhuma atividade não realizada', 'qualidade', 'check-circle', '#8B5CF6', '{"tipo": "qualidade", "quantidade": 20}'),
  ('Iniciante', 'Complete seu primeiro registro', 'marco', 'star', '#EC4899', '{"tipo": "marco", "quantidade": 1}'),
  ('Expert', 'Complete 100 registros', 'marco', 'award', '#EF4444', '{"tipo": "marco", "quantidade": 100}'),
  ('Mestre', 'Complete 500 registros', 'marco', 'crown', '#14B8A6', '{"tipo": "marco", "quantidade": 500}')
ON CONFLICT DO NOTHING;