/*
  # Criar Função de Manutenção para Limpar Marcações Órfãs

  ## Descrição
  Esta migration cria uma função de manutenção que pode ser executada periodicamente
  para identificar e limpar marcações órfãs na tabela ultima_marcacao_usuario.

  ## Mudanças

  1. Nova Função
     - `limpar_marcacoes_orfas()` - Função que identifica e remove marcações órfãs
       - Busca usuários em ultima_marcacao_usuario que não têm registros em andamento
       - Remove essas marcações órfãs
       - Registra log de auditoria detalhado
       - Retorna estatísticas da limpeza executada

  2. View de Monitoramento
     - `view_marcacoes_orfas` - View para facilitar identificação de inconsistências
       - Lista usuários com marcação mas sem registros em andamento
       - Mostra há quanto tempo a marcação está órfã
       - Útil para monitoramento e debug

  ## Uso
  - Executar manualmente: `SELECT limpar_marcacoes_orfas();`
  - Pode ser agendado via cron job
  - Retorna quantas marcações foram limpas

  ## Segurança
  - Função com SECURITY DEFINER para garantir execução com privilégios adequados
  - Validação extensiva antes de qualquer DELETE
  - Logs de auditoria completos para rastreabilidade
*/

-- Criar função de manutenção para limpar marcações órfãs
CREATE OR REPLACE FUNCTION limpar_marcacoes_orfas()
RETURNS TABLE (
  marcacoes_limpas INTEGER,
  usuarios_afetados UUID[],
  detalhes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_marcacao RECORD;
  v_tem_registros BOOLEAN;
  v_count INTEGER := 0;
  v_usuarios UUID[] := ARRAY[]::UUID[];
  v_detalhes JSONB := '[]'::JSONB;
  v_registro_info JSONB;
BEGIN
  -- Buscar todas as marcações existentes
  FOR v_marcacao IN
    SELECT usuario_id, empresa_id, ultima_marcacao_em, modulo
    FROM ultima_marcacao_usuario
  LOOP
    v_tem_registros := FALSE;

    -- Verificar se o usuário tem algum registro em andamento em qualquer tabela
    -- Camararia
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_camararia
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Recepção
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_recepcao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Revisão
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_revisao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Áreas Comuns
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_areas_comuns
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Gestão
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_gestao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Cozinha
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_cozinha
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Vendas
    IF NOT v_tem_registros THEN
      SELECT EXISTS (
        SELECT 1 FROM registros_vendas
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_marcacao.usuario_id
          AND empresa_id = v_marcacao.empresa_id
          AND status = 'em_andamento'
      ) INTO v_tem_registros;
    END IF;

    -- Se não tem registros em andamento, é uma marcação órfã - remover
    IF NOT v_tem_registros THEN
      -- Calcular há quanto tempo está órfã
      v_registro_info := jsonb_build_object(
        'usuario_id', v_marcacao.usuario_id,
        'empresa_id', v_marcacao.empresa_id,
        'ultima_marcacao_em', v_marcacao.ultima_marcacao_em,
        'modulo', v_marcacao.modulo,
        'minutos_orfao', EXTRACT(EPOCH FROM (NOW() - v_marcacao.ultima_marcacao_em)) / 60
      );

      -- Adicionar aos detalhes
      v_detalhes := v_detalhes || jsonb_build_array(v_registro_info);

      -- Deletar a marcação órfã
      DELETE FROM ultima_marcacao_usuario
      WHERE usuario_id = v_marcacao.usuario_id
        AND empresa_id = v_marcacao.empresa_id;

      -- Registrar log de auditoria
      INSERT INTO logs_inatividade_backend (
        tipo_log,
        usuario_id,
        empresa_id,
        detalhes,
        created_at
      ) VALUES (
        'limpeza_marcacao_orfa_manutencao',
        v_marcacao.usuario_id,
        v_marcacao.empresa_id,
        jsonb_build_object(
          'motivo', 'Marcação órfã removida durante manutenção periódica',
          'ultima_marcacao_em', v_marcacao.ultima_marcacao_em,
          'modulo', v_marcacao.modulo,
          'minutos_orfao', EXTRACT(EPOCH FROM (NOW() - v_marcacao.ultima_marcacao_em)) / 60
        ),
        NOW()
      );

      -- Incrementar contadores
      v_count := v_count + 1;
      v_usuarios := v_usuarios || v_marcacao.usuario_id;
    END IF;
  END LOOP;

  -- Retornar resultados
  RETURN QUERY SELECT v_count, v_usuarios, v_detalhes;
END;
$$;

-- Criar view para monitoramento de marcações órfãs
CREATE OR REPLACE VIEW view_marcacoes_orfas AS
WITH marcacoes AS (
  SELECT 
    m.usuario_id,
    m.empresa_id,
    m.ultima_marcacao_em,
    m.modulo,
    u.name as usuario_nome,
    e.nome as empresa_nome,
    EXTRACT(EPOCH FROM (NOW() - m.ultima_marcacao_em)) / 60 as minutos_desde_marcacao
  FROM ultima_marcacao_usuario m
  JOIN usuarios u ON u.id = m.usuario_id
  JOIN empresas e ON e.id = m.empresa_id
),
registros_camararia_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_camararia
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_recepcao_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_recepcao
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_revisao_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_revisao
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_areas_comuns_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_areas_comuns
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_gestao_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_gestao
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_cozinha_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_cozinha
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
registros_vendas_count AS (
  SELECT 
    COALESCE(usuario_executor_id, usuario_id) as usuario_id,
    empresa_id,
    COUNT(*) as total
  FROM registros_vendas
  WHERE status = 'em_andamento'
  GROUP BY COALESCE(usuario_executor_id, usuario_id), empresa_id
),
total_registros AS (
  SELECT 
    m.usuario_id,
    m.empresa_id,
    COALESCE(rc.total, 0) + 
    COALESCE(rr.total, 0) + 
    COALESCE(rv.total, 0) + 
    COALESCE(ra.total, 0) + 
    COALESCE(rg.total, 0) + 
    COALESCE(rk.total, 0) + 
    COALESCE(rd.total, 0) as total_registros
  FROM marcacoes m
  LEFT JOIN registros_camararia_count rc ON rc.usuario_id = m.usuario_id AND rc.empresa_id = m.empresa_id
  LEFT JOIN registros_recepcao_count rr ON rr.usuario_id = m.usuario_id AND rr.empresa_id = m.empresa_id
  LEFT JOIN registros_revisao_count rv ON rv.usuario_id = m.usuario_id AND rv.empresa_id = m.empresa_id
  LEFT JOIN registros_areas_comuns_count ra ON ra.usuario_id = m.usuario_id AND ra.empresa_id = m.empresa_id
  LEFT JOIN registros_gestao_count rg ON rg.usuario_id = m.usuario_id AND rg.empresa_id = m.empresa_id
  LEFT JOIN registros_cozinha_count rk ON rk.usuario_id = m.usuario_id AND rk.empresa_id = m.empresa_id
  LEFT JOIN registros_vendas_count rd ON rd.usuario_id = m.usuario_id AND rd.empresa_id = m.empresa_id
)
SELECT 
  m.usuario_id,
  m.usuario_nome,
  m.empresa_id,
  m.empresa_nome,
  m.ultima_marcacao_em,
  m.modulo,
  m.minutos_desde_marcacao,
  t.total_registros as total_registros_abertos,
  CASE 
    WHEN t.total_registros = 0 THEN 'ÓRFÃ - SEM REGISTROS'
    ELSE 'OK - TEM REGISTROS'
  END as status_marcacao
FROM marcacoes m
JOIN total_registros t ON t.usuario_id = m.usuario_id AND t.empresa_id = m.empresa_id
ORDER BY 
  CASE WHEN t.total_registros = 0 THEN 0 ELSE 1 END,
  m.minutos_desde_marcacao DESC;

-- Comentários para documentação
COMMENT ON FUNCTION limpar_marcacoes_orfas() IS 
'Função de manutenção que identifica e remove marcações órfãs da tabela ultima_marcacao_usuario. 
Retorna estatísticas da limpeza executada e registra logs de auditoria.
Uso: SELECT * FROM limpar_marcacoes_orfas();';

COMMENT ON VIEW view_marcacoes_orfas IS 
'View para monitoramento de marcações órfãs. 
Mostra usuários com marcação mas sem registros em andamento.
Útil para identificar inconsistências e debug.';
