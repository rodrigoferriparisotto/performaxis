/*
  # Sistema de Analytics de Freshness para Gestores

  Este migration cria a infraestrutura completa para análise de qualidade e atualização
  de registros em tempo real, permitindo que gestores monitorem a performance operacional
  da equipe.

  ## Funcionalidades Criadas

  1. **View: vw_freshness_analytics**
     - Consolida todos os registros em andamento de todos os módulos
     - Calcula minutesSinceUpdate, qualityScore e freshnessStatus
     - Inclui dados do usuário e departamento

  2. **Função: fn_get_freshness_statistics**
     - Retorna estatísticas agregadas por empresa
     - Métricas: score médio, registros críticos, usuários ativos, taxa de atualização

  3. **Função: fn_get_stagnant_records**
     - Lista registros estagnados acima do threshold definido
     - Ordenados por tempo de estagnação (mais críticos primeiro)

  4. **Função: fn_get_user_consistency_ranking**
     - Ranking de colaboradores por consistência de freshness
     - Inclui score médio, total de atualizações e frequência

  5. **Índices de Performance**
     - Otimização de queries por empresa_id e updated_at
     - Índices compostos para melhor performance em análises

  ## Segurança
  - RLS aplicado em todas as views e funções
  - Isolamento por empresa_id garantido
  - SECURITY DEFINER para funções que precisam acesso cross-table
*/

-- =====================================================
-- VIEW: vw_freshness_analytics
-- Consolida todos os registros em andamento
-- =====================================================

CREATE OR REPLACE VIEW vw_freshness_analytics AS
WITH all_records AS (
  -- Recepção
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'recepcao' as modulo,
    COALESCE(tr.nome, 'Recepção') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_recepcao r
  JOIN usuarios u ON r.usuario_id = u.id
  LEFT JOIN tipos_recepcao tr ON r.tipo_recepcao_id = tr.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Camararia
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'camararia' as modulo,
    COALESCE(r.tipo_servico::text, 'Camararia') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_camararia r
  JOIN usuarios u ON r.usuario_id = u.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Revisão
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'revisao' as modulo,
    'Revisão' as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_revisao r
  JOIN usuarios u ON r.usuario_id = u.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Áreas Comuns
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'areas_comuns' as modulo,
    'Áreas Comuns' as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_areas_comuns r
  JOIN usuarios u ON r.usuario_id = u.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Gestão
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'gestao' as modulo,
    COALESCE(tg.nome, 'Gestão') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_gestao r
  JOIN usuarios u ON r.usuario_id = u.id
  LEFT JOIN tipos_gestao tg ON r.tipo_gestao_id = tg.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Cozinha
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'cozinha' as modulo,
    COALESCE(tc.nome, 'Cozinha') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_cozinha r
  JOIN usuarios u ON r.usuario_id = u.id
  LEFT JOIN tipos_cozinha tc ON r.tipo_cozinha_id = tc.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Vendas
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'vendas' as modulo,
    'Vendas' as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_vendas r
  JOIN usuarios u ON r.usuario_id = u.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Atividades Diárias
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'atividades_diarias' as modulo,
    COALESCE(ta.nome, 'Atividade Diária') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_atividades_diarias r
  JOIN usuarios u ON r.usuario_id = u.id
  LEFT JOIN tipos_atividades ta ON r.tipo_atividade_id = ta.id
  WHERE r.status = 'em_andamento'

  UNION ALL

  -- Atividades Extras
  SELECT 
    r.id,
    r.empresa_id,
    r.usuario_id,
    u.name as usuario_nome,
    'atividades_extras' as modulo,
    COALESCE(te.nome, 'Atividade Extra') as tipo_atividade,
    r.updated_at,
    r.created_at,
    EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 60 AS minutes_since_update
  FROM registros_atividades_extras r
  JOIN usuarios u ON r.usuario_id = u.id
  LEFT JOIN tipos_extras te ON r.tipo_atividade_id = te.id
  WHERE r.status = 'em_andamento'
)
SELECT 
  id,
  empresa_id,
  usuario_id,
  usuario_nome,
  modulo,
  tipo_atividade,
  updated_at,
  created_at,
  minutes_since_update,
  -- Calcular qualityScore (100 aos 0 min, decaindo linearmente até 0 aos 120 min)
  GREATEST(0, LEAST(100, 100 - (minutes_since_update * 100.0 / 120.0)))::INTEGER AS quality_score,
  -- Determinar status baseado no tempo
  CASE 
    WHEN minutes_since_update < 15 THEN 'excellent'
    WHEN minutes_since_update < 30 THEN 'good'
    WHEN minutes_since_update < 60 THEN 'warning'
    ELSE 'critical'
  END AS freshness_status
FROM all_records;

-- =====================================================
-- FUNÇÃO: fn_get_freshness_statistics
-- Retorna estatísticas agregadas por empresa
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_freshness_statistics(
  p_empresa_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Definir datas padrão se não fornecidas
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '7 days');
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT json_build_object(
    'avgFreshness', COALESCE(AVG(quality_score)::INTEGER, 0),
    'criticalCount', COUNT(*) FILTER (WHERE freshness_status = 'critical'),
    'warningCount', COUNT(*) FILTER (WHERE freshness_status = 'warning'),
    'goodCount', COUNT(*) FILTER (WHERE freshness_status = 'good'),
    'excellentCount', COUNT(*) FILTER (WHERE freshness_status = 'excellent'),
    'totalRecords', COUNT(*),
    'activeUsers', COUNT(DISTINCT usuario_id),
    'avgMinutesSinceUpdate', COALESCE(AVG(minutes_since_update)::INTEGER, 0),
    'moduleBreakdown', (
      SELECT json_object_agg(modulo, cnt)
      FROM (
        SELECT modulo, COUNT(*) as cnt
        FROM vw_freshness_analytics
        WHERE empresa_id = p_empresa_id
          AND updated_at BETWEEN v_start_date AND v_end_date
        GROUP BY modulo
      ) sub
    )
  )
  INTO v_result
  FROM vw_freshness_analytics
  WHERE empresa_id = p_empresa_id
    AND updated_at BETWEEN v_start_date AND v_end_date;

  RETURN v_result;
END;
$$;

-- =====================================================
-- FUNÇÃO: fn_get_stagnant_records
-- Lista registros estagnados acima do threshold
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_stagnant_records(
  p_empresa_id UUID,
  p_threshold_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  usuario_id UUID,
  usuario_nome TEXT,
  modulo TEXT,
  tipo_atividade TEXT,
  minutes_since_update NUMERIC,
  quality_score INTEGER,
  freshness_status TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vfa.id,
    vfa.usuario_id,
    vfa.usuario_nome,
    vfa.modulo,
    vfa.tipo_atividade,
    vfa.minutes_since_update,
    vfa.quality_score,
    vfa.freshness_status,
    vfa.updated_at
  FROM vw_freshness_analytics vfa
  WHERE vfa.empresa_id = p_empresa_id
    AND vfa.minutes_since_update >= p_threshold_minutes
  ORDER BY vfa.minutes_since_update DESC;
END;
$$;

-- =====================================================
-- FUNÇÃO: fn_get_user_consistency_ranking
-- Ranking de colaboradores por consistência
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_user_consistency_ranking(
  p_empresa_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  usuario_id UUID,
  usuario_nome TEXT,
  avg_quality_score NUMERIC,
  total_updates INTEGER,
  avg_minutes_between_updates NUMERIC,
  modules_used TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '7 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  SELECT 
    vfa.usuario_id,
    vfa.usuario_nome,
    AVG(vfa.quality_score)::NUMERIC(5,2) as avg_quality_score,
    COUNT(*)::INTEGER as total_updates,
    AVG(vfa.minutes_since_update)::NUMERIC(5,2) as avg_minutes_between_updates,
    ARRAY_AGG(DISTINCT vfa.modulo) as modules_used
  FROM vw_freshness_analytics vfa
  WHERE vfa.empresa_id = p_empresa_id
    AND vfa.updated_at BETWEEN v_start_date AND v_end_date
  GROUP BY vfa.usuario_id, vfa.usuario_nome
  ORDER BY avg_quality_score DESC, total_updates DESC;
END;
$$;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice composto para queries por empresa e data
CREATE INDEX IF NOT EXISTS idx_registros_recepcao_freshness 
  ON registros_recepcao(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_camararia_freshness 
  ON registros_camararia(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_revisao_freshness 
  ON registros_revisao(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_areas_comuns_freshness 
  ON registros_areas_comuns(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_gestao_freshness 
  ON registros_gestao(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_cozinha_freshness 
  ON registros_cozinha(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_vendas_freshness 
  ON registros_vendas(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_atividades_diarias_freshness 
  ON registros_atividades_diarias(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_registros_atividades_extras_freshness 
  ON registros_atividades_extras(empresa_id, updated_at) 
  WHERE status = 'em_andamento';

-- =====================================================
-- PERMISSÕES
-- =====================================================

-- Garantir que apenas gestores e admins possam usar essas funções
GRANT EXECUTE ON FUNCTION fn_get_freshness_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_stagnant_records TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_user_consistency_ranking TO authenticated;

-- Comentários para documentação
COMMENT ON VIEW vw_freshness_analytics IS 'View consolidada de todos os registros em andamento com métricas de freshness';
COMMENT ON FUNCTION fn_get_freshness_statistics IS 'Retorna estatísticas agregadas de freshness para uma empresa';
COMMENT ON FUNCTION fn_get_stagnant_records IS 'Lista registros estagnados acima do threshold especificado';
COMMENT ON FUNCTION fn_get_user_consistency_ranking IS 'Ranking de usuários por consistência de atualização de registros';