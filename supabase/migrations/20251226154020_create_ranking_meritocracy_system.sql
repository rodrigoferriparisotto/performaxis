/*
  # Sistema de Ranking por Meritocracia

  ## Descrição
  Este migration cria o sistema completo de ranking por meritocracia com performance diária e mensal.

  ## 1. Novas Tabelas
  
  ### performance_diaria
  Armazena a performance diária de cada funcionário por área
  - id (uuid, primary key)
  - usuario_id (uuid, foreign key -> usuarios)
  - empresa_id (uuid, foreign key -> empresas)
  - data (date) - data da performance
  - perfil (user_profile_enum) - área do funcionário
  - total_atividades (integer) - total de atividades realizadas
  - atividades_no_prazo (integer) - atividades concluídas dentro do prazo
  - atividades_atrasadas (integer) - atividades concluídas com atraso
  - tempo_medio_conclusao (interval) - tempo médio de conclusão
  - taxa_cumprimento (decimal) - percentual de cumprimento das metas
  - pontuacao (decimal) - pontuação calculada do dia
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ### performance_mensal
  Consolida a performance mensal de cada funcionário
  - id (uuid, primary key)
  - usuario_id (uuid, foreign key -> usuarios)
  - empresa_id (uuid, foreign key -> empresas)
  - mes (integer) - mês (1-12)
  - ano (integer) - ano
  - perfil (user_profile_enum) - área do funcionário
  - total_dias_trabalhados (integer)
  - media_atividades_dia (decimal)
  - taxa_cumprimento_media (decimal)
  - pontuacao_total (decimal)
  - pontuacao_media (decimal)
  - ranking_posicao (integer) - posição no ranking
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ### metas_performance
  Define as metas de performance para cada perfil e tipo de atividade
  - id (uuid, primary key)
  - empresa_id (uuid, foreign key -> empresas)
  - perfil (user_profile_enum)
  - meta_diaria_atividades (integer) - meta de atividades por dia
  - tempo_medio_ideal (interval) - tempo ideal de conclusão
  - peso_prazo (decimal) - peso do cumprimento de prazo (0-1)
  - peso_quantidade (decimal) - peso da quantidade (0-1)
  - peso_qualidade (decimal) - peso da qualidade (0-1)
  - ativo (boolean)
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ## 2. Security
  - Enable RLS em todas as tabelas
  - Políticas para authenticated users acessarem dados da própria empresa
  - Admin e gestor podem ver todos os dados da empresa
  - Funcionários podem ver apenas seus próprios dados

  ## 3. Indexes
  - Índices em usuario_id, empresa_id, data, mes/ano para queries eficientes
  - Índice composto para evitar duplicatas

  ## 4. Important Notes
  - A pontuação é calculada automaticamente via service
  - O ranking é atualizado diariamente
  - As metas podem ser customizadas por empresa
*/

-- =====================================================
-- 1. CRIAR TABELAS
-- =====================================================

-- Tabela performance_diaria
CREATE TABLE IF NOT EXISTS performance_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  perfil user_profile_enum NOT NULL,
  total_atividades integer DEFAULT 0,
  atividades_no_prazo integer DEFAULT 0,
  atividades_atrasadas integer DEFAULT 0,
  tempo_medio_conclusao interval,
  taxa_cumprimento decimal(5,2) DEFAULT 0.00,
  pontuacao decimal(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, data, perfil)
);

-- Tabela performance_mensal
CREATE TABLE IF NOT EXISTS performance_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  perfil user_profile_enum NOT NULL,
  total_dias_trabalhados integer DEFAULT 0,
  media_atividades_dia decimal(10,2) DEFAULT 0.00,
  taxa_cumprimento_media decimal(5,2) DEFAULT 0.00,
  pontuacao_total decimal(10,2) DEFAULT 0.00,
  pontuacao_media decimal(10,2) DEFAULT 0.00,
  ranking_posicao integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, mes, ano, perfil)
);

-- Tabela metas_performance
CREATE TABLE IF NOT EXISTS metas_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  perfil user_profile_enum NOT NULL,
  meta_diaria_atividades integer DEFAULT 10,
  tempo_medio_ideal interval DEFAULT '2 hours'::interval,
  peso_prazo decimal(3,2) DEFAULT 0.40,
  peso_quantidade decimal(3,2) DEFAULT 0.30,
  peso_qualidade decimal(3,2) DEFAULT 0.30,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, perfil),
  CHECK (peso_prazo + peso_quantidade + peso_qualidade = 1.00)
);

-- =====================================================
-- 2. CRIAR ÍNDICES
-- =====================================================

-- Índices para performance_diaria
CREATE INDEX IF NOT EXISTS idx_performance_diaria_usuario ON performance_diaria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_performance_diaria_empresa ON performance_diaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_performance_diaria_data ON performance_diaria(data DESC);
CREATE INDEX IF NOT EXISTS idx_performance_diaria_perfil ON performance_diaria(perfil);
CREATE INDEX IF NOT EXISTS idx_performance_diaria_empresa_data ON performance_diaria(empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_performance_diaria_pontuacao ON performance_diaria(pontuacao DESC);

-- Índices para performance_mensal
CREATE INDEX IF NOT EXISTS idx_performance_mensal_usuario ON performance_mensal(usuario_id);
CREATE INDEX IF NOT EXISTS idx_performance_mensal_empresa ON performance_mensal(empresa_id);
CREATE INDEX IF NOT EXISTS idx_performance_mensal_mes_ano ON performance_mensal(ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_performance_mensal_perfil ON performance_mensal(perfil);
CREATE INDEX IF NOT EXISTS idx_performance_mensal_ranking ON performance_mensal(empresa_id, perfil, ranking_posicao);
CREATE INDEX IF NOT EXISTS idx_performance_mensal_pontuacao ON performance_mensal(pontuacao_total DESC);

-- Índices para metas_performance
CREATE INDEX IF NOT EXISTS idx_metas_performance_empresa ON metas_performance(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metas_performance_perfil ON metas_performance(perfil);
CREATE INDEX IF NOT EXISTS idx_metas_performance_ativo ON metas_performance(ativo) WHERE ativo = true;

-- =====================================================
-- 3. FUNÇÕES DE ATUALIZAÇÃO
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_performance_diaria_updated_at ON performance_diaria;
CREATE TRIGGER update_performance_diaria_updated_at
  BEFORE UPDATE ON performance_diaria
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_updated_at();

DROP TRIGGER IF EXISTS update_performance_mensal_updated_at ON performance_mensal;
CREATE TRIGGER update_performance_mensal_updated_at
  BEFORE UPDATE ON performance_mensal
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_updated_at();

DROP TRIGGER IF EXISTS update_metas_performance_updated_at ON metas_performance;
CREATE TRIGGER update_metas_performance_updated_at
  BEFORE UPDATE ON metas_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE performance_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_performance ENABLE ROW LEVEL SECURITY;

-- Políticas para performance_diaria
CREATE POLICY "Users can view own daily performance"
  ON performance_diaria FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_diaria.empresa_id
      AND u.profile IN ('admin', 'gestor')
    )
  );

CREATE POLICY "System can insert daily performance"
  ON performance_diaria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_diaria.empresa_id
    )
  );

CREATE POLICY "System can update daily performance"
  ON performance_diaria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_diaria.empresa_id
    )
  );

-- Políticas para performance_mensal
CREATE POLICY "Users can view own monthly performance"
  ON performance_mensal FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_mensal.empresa_id
      AND u.profile IN ('admin', 'gestor')
    )
  );

CREATE POLICY "System can insert monthly performance"
  ON performance_mensal FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_mensal.empresa_id
    )
  );

CREATE POLICY "System can update monthly performance"
  ON performance_mensal FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = performance_mensal.empresa_id
    )
  );

-- Políticas para metas_performance
CREATE POLICY "Users can view company performance goals"
  ON metas_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = metas_performance.empresa_id
    )
  );

CREATE POLICY "Admin can insert performance goals"
  ON metas_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = metas_performance.empresa_id
      AND u.profile = 'admin'
    )
  );

CREATE POLICY "Admin can update performance goals"
  ON metas_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = metas_performance.empresa_id
      AND u.profile = 'admin'
    )
  );

CREATE POLICY "Admin can delete performance goals"
  ON metas_performance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.empresa_id = metas_performance.empresa_id
      AND u.profile = 'admin'
    )
  );

-- =====================================================
-- 5. INSERIR METAS PADRÃO (EXEMPLO)
-- =====================================================

-- Comentário: As metas padrão devem ser criadas por cada empresa
-- Este é apenas um exemplo de estrutura
-- Não inserimos dados aqui pois cada empresa terá suas próprias metas