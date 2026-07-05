/*
  # Reestruturar Tabela performance_diaria para Sistema de Ranking por Meritocracia

  ## Descrição
  Reestrutura a tabela performance_diaria para implementar corretamente o sistema de ranking
  onde usuários são ranqueados pela soma de todas as suas atividades (de todos os perfis),
  não por perfil individual.

  ## 1. Mudanças na Tabela performance_diaria
  
  ### Campos Removidos:
  - `perfil` - Não é mais necessário pois agora é por usuário, não por perfil
  - `total_atividades` - Substituído por campos mais específicos
  - `atividades_no_prazo` - Não é usado no novo sistema
  - `atividades_atrasadas` - Não é usado no novo sistema
  - `tempo_medio_conclusao` - Não é usado no novo sistema
  - `taxa_cumprimento` - Substituído por percentual_efetividade
  - `pontuacao` - Substituído por pontos_dia
  
  ### Campos Adicionados:
  - `total_atividades_programadas` (integer) - soma de todas as atividades do dia
  - `total_atividades_realizadas` (integer) - soma das atividades com status 'realizada'
  - `percentual_efetividade` (decimal 5,2) - (realizadas / programadas) × 100
  - `pontos_dia` (decimal 3,1) - pontos: <70%=0, 70-79%=1, 80-89%=1.5, ≥90%=2
  - `total_horas_trabalhadas` (decimal 10,2) - soma de horas de todos os registros
  - `ranking_dia` (integer) - posição no ranking do dia (1, 2, 3...)
  
  ### Constraints Modificadas:
  - UNIQUE mudou de (usuario_id, data, perfil) para apenas (usuario_id, data)
  - Agora um usuário tem apenas 1 registro por dia, somando todos os perfis

  ## 2. Migração de Dados
  - Trunca dados antigos pois estrutura mudou completamente
  - Sistema recalculará performance com nova lógica

  ## 3. Security
  - Mantém RLS policies existentes
  - Atualiza policies para nova estrutura sem perfil

  ## 4. Important Notes
  - Esta migration é DESTRUTIVA: apaga dados antigos de performance_diaria
  - Execute recálculo completo após aplicar
  - Nova lógica: usuário tem 1 registro/dia somando TODOS os perfis
  - Ranking é calculado por pontos_dia (maior pontuação = 1º lugar)
  - Desempate: total_horas_trabalhadas DESC
*/

-- =====================================================
-- 1. REMOVER CONSTRAINTS E ÍNDICES ANTIGOS
-- =====================================================

-- Remover constraint UNIQUE antiga
ALTER TABLE performance_diaria DROP CONSTRAINT IF EXISTS performance_diaria_usuario_id_data_perfil_key;

-- Remover índices que referenciam perfil
DROP INDEX IF EXISTS idx_performance_diaria_perfil;

-- =====================================================
-- 2. LIMPAR DADOS ANTIGOS
-- =====================================================

-- Truncar tabela (dados antigos não são compatíveis com nova estrutura)
TRUNCATE TABLE performance_diaria CASCADE;

-- =====================================================
-- 3. REMOVER COLUNAS ANTIGAS
-- =====================================================

ALTER TABLE performance_diaria DROP COLUMN IF EXISTS perfil;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS total_atividades;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS atividades_no_prazo;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS atividades_atrasadas;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS tempo_medio_conclusao;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS taxa_cumprimento;
ALTER TABLE performance_diaria DROP COLUMN IF EXISTS pontuacao;

-- =====================================================
-- 4. ADICIONAR NOVAS COLUNAS
-- =====================================================

ALTER TABLE performance_diaria 
  ADD COLUMN IF NOT EXISTS total_atividades_programadas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_atividades_realizadas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_efetividade decimal(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pontos_dia decimal(3,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_horas_trabalhadas decimal(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS ranking_dia integer;

-- =====================================================
-- 5. ADICIONAR NOVA CONSTRAINT UNIQUE
-- =====================================================

-- Agora é apenas 1 registro por usuário por dia
ALTER TABLE performance_diaria 
  ADD CONSTRAINT performance_diaria_usuario_id_data_key 
  UNIQUE(usuario_id, data);

-- =====================================================
-- 6. CRIAR NOVOS ÍNDICES
-- =====================================================

-- Índice para ordenação de ranking (pontos DESC, horas DESC)
CREATE INDEX IF NOT EXISTS idx_performance_diaria_ranking 
  ON performance_diaria(empresa_id, data DESC, pontos_dia DESC, total_horas_trabalhadas DESC);

-- Índice para buscar ranking de um dia específico
CREATE INDEX IF NOT EXISTS idx_performance_diaria_ranking_dia 
  ON performance_diaria(data, ranking_dia) WHERE ranking_dia IS NOT NULL;

-- Índice para efetividade
CREATE INDEX IF NOT EXISTS idx_performance_diaria_efetividade 
  ON performance_diaria(percentual_efetividade DESC);

-- =====================================================
-- 7. ATUALIZAR RLS POLICIES
-- =====================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view own daily performance" ON performance_diaria;
DROP POLICY IF EXISTS "System can insert daily performance" ON performance_diaria;
DROP POLICY IF EXISTS "System can update daily performance" ON performance_diaria;

-- Criar policies atualizadas (sem referência a perfil)
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

-- =====================================================
-- 8. COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE performance_diaria IS 'Performance diária por usuário (soma de todos os perfis/registros do dia)';
COMMENT ON COLUMN performance_diaria.total_atividades_programadas IS 'Total de atividades programadas no dia (soma de todos os registros)';
COMMENT ON COLUMN performance_diaria.total_atividades_realizadas IS 'Total de atividades com status realizada';
COMMENT ON COLUMN performance_diaria.percentual_efetividade IS 'Percentual de efetividade: (realizadas / programadas) × 100';
COMMENT ON COLUMN performance_diaria.pontos_dia IS 'Pontos do dia: <70%=0, 70-79%=1, 80-89%=1.5, ≥90%=2';
COMMENT ON COLUMN performance_diaria.total_horas_trabalhadas IS 'Total de horas trabalhadas no dia (soma de todos os registros)';
COMMENT ON COLUMN performance_diaria.ranking_dia IS 'Posição no ranking do dia (1=primeiro lugar, 2=segundo, etc)';
