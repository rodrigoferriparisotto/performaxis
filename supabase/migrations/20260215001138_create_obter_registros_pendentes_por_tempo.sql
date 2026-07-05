/*
  # Create obter_registros_pendentes_por_tempo Function

  1. Purpose
    - Creates a new function to fetch pending records filtered by minimum elapsed time
    - Used for reminder system to only send reminders after a minimum time threshold
    - Keeps original function for badge display (shows all pending records)

  2. New Function
    - `obter_registros_pendentes_por_tempo(p_usuario_id, p_horas_minimas)`
    - Returns only records with elapsed time >= p_horas_minimas
    - Useful for filtering reminders (e.g., only send after 6 hours)

  3. Security
    - SECURITY DEFINER to allow access to all tables
    - Filters by usuario_id for multi-tenancy
*/

CREATE OR REPLACE FUNCTION obter_registros_pendentes_por_tempo(
  p_usuario_id uuid,
  p_horas_minimas numeric DEFAULT 0
)
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
  RETURN QUERY
  WITH todos_registros AS (
    -- Camararia
    SELECT
      rc.id,
      'camararia'::text as tipo,
      EXTRACT(EPOCH FROM (now() - rc.hora_inicio)) / 3600 as horas,
      jsonb_build_object(
        'suite', s.name,
        'tipo_servico', rc.tipo_servico::text,
        'status', rc.status::text
      ) as info
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
        'suite', s.name,
        'tipo_servico', rrev.tipo_servico::text,
        'status', rrev.status::text
      )
    FROM registros_revisao rrev
    JOIN suites s ON s.id = rrev.suite_id
    WHERE rrev.usuario_id = p_usuario_id
    AND rrev.status = 'em_andamento'
  )
  SELECT
    todos_registros.id,
    todos_registros.tipo,
    todos_registros.horas,
    todos_registros.info
  FROM todos_registros
  WHERE todos_registros.horas >= p_horas_minimas
  ORDER BY todos_registros.horas DESC;
END;
$$;