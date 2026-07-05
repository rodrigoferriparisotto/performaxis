/*
  # Fix obter_registros_pendentes Function
  
  1. Changes
    - Fix registros_camararia: remove servico_id reference (doesn't exist)
    - Fix registros_areas_comuns: remove tipo_area_comum_id reference (doesn't exist)
    - Fix registros_vendas: remove tipo_funcao_id reference (doesn't exist)
    - Fix registros_revisao: remove duplicate conflict with recepcao alias
    - Simplify queries to use only existing columns
    
  2. Notes
    - Tables store activity types in jsonb 'atividades' column, not in separate FK columns
    - Only some tables have dedicated tipo_* foreign keys
*/

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
      'tipo_servico', rc.tipo_servico::text,
      'status', rc.status::text
    )
  FROM registros_camararia rc
  JOIN suites s ON s.id = rc.suite_id
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
      'status', rr.status::text
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
      'atividades', rac.atividades,
      'status', rac.status::text
    )
  FROM registros_areas_comuns rac
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
      'status', rg.status::text
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
      'status', rad.status::text
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
      'status', rae.status::text
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
      'atividades', rv.atividades,
      'status', rv.status::text
    )
  FROM registros_vendas rv
  WHERE rv.usuario_id = p_usuario_id
  AND rv.status = 'em_andamento'

  UNION ALL

  -- Revisao
  SELECT
    rrev.id,
    'revisao'::text,
    EXTRACT(EPOCH FROM (now() - rrev.hora_inicio)) / 3600,
    jsonb_build_object(
      'suite', s.nome,
      'tipo_servico', rrev.tipo_servico::text,
      'status', rrev.status::text
    )
  FROM registros_revisao rrev
  JOIN suites s ON s.id = rrev.suite_id
  WHERE rrev.usuario_id = p_usuario_id
  AND rrev.status = 'em_andamento';

END;
$$;