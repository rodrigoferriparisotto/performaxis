/*
  # Reestruturar Tabela performance_mensal para Sistema de Ranking por Meritocracia

  ## Descrição
  Reestrutura a tabela performance_mensal para implementar corretamente o sistema de ranking
  onde o ranking mensal é baseado em quantas vezes o usuário ficou em 1º lugar durante o mês.

  ## 1. Mudanças na Tabela performance_mensal
  
  ### Campos Removidos:
  - `perfil` - Não é mais necessário pois agora é por usuário, não por perfil
  - `media_atividades_dia` - Não é relevante para o novo sistema
  - `taxa_cumprimento_media` - Substituído por media_efetividade
  - `pontuacao_total` - Substituído por campos mais específicos
  - `pontuacao_media` - Substituído por media_pontos_dia
  
  ### Campos Adicionados:
  - `total_vezes_primeiro_lugar` (integer) - quantas vezes ficou em 1º no mês
  - `total_vezes_segundo_lugar` (integer) - quantas vezes ficou em 2º (estatística)
  - `total_vezes_terceiro_lugar` (integer) - quantas vezes ficou em 3º (estatística)
  - `media_pontos_dia` (decimal 5,2) - média dos pontos diários do mês
  - `media_efetividade` (decimal 5,2) - média de efetividade do mês
  - `total_horas_mes` (decimal 10,2) - total de horas trabalhadas no mês
  
  ### Campos Mantidos/Modificados:
  - `total_dias_trabalhados` - mantido
  - `ranking_posicao` - mantido mas agora baseado em total_vezes_primeiro_lugar
  
  ### Constraints Modificadas:
  - UNIQUE mudou de (usuario_id, mes, ano, perfil) para apenas (usuario_id, mes, ano)
  - Agora um usuário tem apenas 1 registro por mês, somando todos os perfis

  ## 2. Migração de Dados
  - Trunca dados antigos pois estrutura mudou completamente
  - Sistema recalculará performance mensal com nova lógica

  ## 3. Security
  - Mantém RLS policies existentes
  - Atualiza policies para nova estrutura sem perfil

  ## 4. Important Notes
  - Esta migration é DESTRUTIVA: apaga dados antigos de performance_mensal
  - Execute recálculo completo após aplicar
  - Nova lógica de ranking: total_vezes_primeiro_lugar DESC, depois media_pontos_dia DESC
  - Quanto mais vezes o usuário ficar em 1º lugar no mês, maior o ranking
*/

-- =====================================================
-- 1. REMOVER CONSTRAINTS E ÍNDICES ANTIGOS
-- =====================================================

-- Remover constraint UNIQUE antiga
ALTER TABLE performance_mensal DROP CONSTRAINT IF EXISTS performance_mensal_usuario_id_mes_ano_perfil_key;

-- Remover índices que referenciam perfil
DROP INDEX IF EXISTS idx_performance_mensal_perfil;
DROP INDEX IF EXISTS idx_performance_mensal_ranking;

-- =====================================================
-- 2. LIMPAR DADOS ANTIGOS
-- =====================================================

-- Truncar tabela (dados antigos não são compatíveis com nova estrutura)
TRUNCATE TABLE performance_mensal CASCADE;

-- =====================================================
-- 3. REMOVER COLUNAS ANTIGAS
-- =====================================================

ALTER TABLE performance_mensal DROP COLUMN IF EXISTS perfil;
ALTER TABLE performance_mensal DROP COLUMN IF EXISTS media_atividades_dia;
ALTER TABLE performance_mensal DROP COLUMN IF EXISTS taxa_cumprimento_media;
ALTER TABLE performance_mensal DROP COLUMN IF EXISTS pontuacao_total;
ALTER TABLE performance_mensal DROP COLUMN IF EXISTS pontuacao_media;

-- =====================================================
-- 4. ADICIONAR NOVAS COLUNAS
-- =====================================================

ALTER TABLE performance_mensal 
  ADD COLUMN IF NOT EXISTS total_vezes_primeiro_lugar integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vezes_segundo_lugar integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vezes_terceiro_lugar integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS media_pontos_dia decimal(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS media_efetividade decimal(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_horas_mes decimal(10,2) DEFAULT 0.00;

-- =====================================================
-- 5. ADICIONAR NOVA CONSTRAINT UNIQUE
-- =====================================================

-- Agora é apenas 1 registro por usuário por mês/ano
ALTER TABLE performance_mensal 
  ADD CONSTRAINT performance_mensal_usuario_id_mes_ano_key 
  UNIQUE(usuario_id, mes, ano);

-- =====================================================
-- 6. CRIAR NOVOS ÍNDICES
-- =====================================================

-- Índice para ordenação de ranking mensal (primeiro lugar DESC, média pontos DESC)
CREATE INDEX IF NOT EXISTS idx_performance_mensal_ranking_new 
  ON performance_mensal(empresa_id, ano DESC, mes DESC, total_vezes_primeiro_lugar DESC, media_pontos_dia DESC);

-- Índice para buscar ranking de um mês específico
CREATE INDEX IF NOT EXISTS idx_performance_mensal_ranking_posicao 
  ON performance_mensal(mes, ano, ranking_posicao) WHERE ranking_posicao IS NOT NULL;

-- Índice para estatísticas de primeiros lugares
CREATE INDEX IF NOT EXISTS idx_performance_mensal_primeiro_lugar 
  ON performance_mensal(total_vezes_primeiro_lugar DESC);

-- Índice para média de efetividade
CREATE INDEX IF NOT EXISTS idx_performance_mensal_media_efetividade 
  ON performance_mensal(media_efetividade DESC);

-- =====================================================
-- 7. ATUALIZAR RLS POLICIES
-- =====================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view own monthly performance" ON performance_mensal;
DROP POLICY IF EXISTS "System can insert monthly performance" ON performance_mensal;
DROP POLICY IF EXISTS "System can update monthly performance" ON performance_mensal;

-- Criar policies atualizadas (sem referência a perfil)
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

-- =====================================================
-- 8. COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE performance_mensal IS 'Performance mensal consolidada por usuário (todas as áreas agregadas)';
COMMENT ON COLUMN performance_mensal.total_vezes_primeiro_lugar IS 'Quantas vezes o usuário ficou em 1º lugar no mês';
COMMENT ON COLUMN performance_mensal.total_vezes_segundo_lugar IS 'Quantas vezes o usuário ficou em 2º lugar no mês';
COMMENT ON COLUMN performance_mensal.total_vezes_terceiro_lugar IS 'Quantas vezes o usuário ficou em 3º lugar no mês';
COMMENT ON COLUMN performance_mensal.media_pontos_dia IS 'Média dos pontos diários do mês';
COMMENT ON COLUMN performance_mensal.media_efetividade IS 'Média de efetividade (%) do mês';
COMMENT ON COLUMN performance_mensal.total_horas_mes IS 'Total de horas trabalhadas no mês';
COMMENT ON COLUMN performance_mensal.ranking_posicao IS 'Posição no ranking mensal (baseado em total_vezes_primeiro_lugar)';
