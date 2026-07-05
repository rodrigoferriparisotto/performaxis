/*
  # Corrigir Campo de Manutenções na Limpeza de Histórico

  1. Problema
    - A migration anterior usou campo 'data_solicitacao' que não existe
    - A tabela 'manutencoes' usa apenas o campo 'data'

  2. Correção
    - Ajustar funções para usar 'data' ao invés de 'data_solicitacao' na tabela manutencoes
*/

-- Função corrigida para consultar quantidade de registros antigos por tabela
CREATE OR REPLACE FUNCTION consultar_registros_antigos(
  p_empresa_id uuid,
  p_periodo_meses integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data_limite timestamptz;
  v_resultado jsonb := '[]'::jsonb;
  v_count integer;
BEGIN
  -- Verificar permissão
  IF NOT verificar_permissao_limpeza(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores e gestores podem executar esta operação.';
  END IF;

  -- Calcular data limite
  v_data_limite := now() - (p_periodo_meses || ' months')::interval;

  -- Registros Recepção (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_recepcao
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_recepcao',
    'nome_exibicao', 'Recepção',
    'quantidade', v_count
  );

  -- Registros Camararia (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_camararia
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_camararia',
    'nome_exibicao', 'Camararia',
    'quantidade', v_count
  );

  -- Registros Revisão (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_revisao
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_revisao',
    'nome_exibicao', 'Revisão',
    'quantidade', v_count
  );

  -- Registros Áreas Comuns (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_areas_comuns
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_areas_comuns',
    'nome_exibicao', 'Áreas Comuns',
    'quantidade', v_count
  );

  -- Registros Gestão (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_gestao
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_gestao',
    'nome_exibicao', 'Gestão',
    'quantidade', v_count
  );

  -- Registros Atividades Diárias (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_atividades_diarias
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_atividades_diarias',
    'nome_exibicao', 'Atividades Diárias',
    'quantidade', v_count
  );

  -- Registros Atividades Extras (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_atividades_extras
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_atividades_extras',
    'nome_exibicao', 'Atividades Extras',
    'quantidade', v_count
  );

  -- Registros Cozinha (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_cozinha
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_cozinha',
    'nome_exibicao', 'Cozinha',
    'quantidade', v_count
  );

  -- Registros Vendas (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM registros_vendas
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'registros_vendas',
    'nome_exibicao', 'Vendas',
    'quantidade', v_count
  );

  -- Manutenções (usando campo 'data')
  SELECT COUNT(*) INTO v_count
  FROM manutencoes
  WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
  v_resultado := v_resultado || jsonb_build_object(
    'tabela', 'manutencoes',
    'nome_exibicao', 'Manutenções',
    'quantidade', v_count
  );

  RETURN v_resultado;
END;
$$;

-- Função corrigida para executar limpeza de histórico
CREATE OR REPLACE FUNCTION executar_limpeza_historico(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_periodo_meses integer,
  p_tabelas_selecionadas text[],
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data_limite timestamptz;
  v_inicio timestamptz;
  v_fim timestamptz;
  v_tempo_execucao integer;
  v_tabelas_processadas jsonb := '[]'::jsonb;
  v_total_excluidos integer := 0;
  v_count integer;
  v_tabela text;
  v_log_id uuid;
  v_status text := 'sucesso';
  v_detalhes_erro text := NULL;
BEGIN
  -- Verificar permissão
  IF NOT verificar_permissao_limpeza(p_usuario_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores e gestores podem executar esta operação.';
  END IF;

  -- Iniciar contagem de tempo
  v_inicio := clock_timestamp();
  
  -- Calcular data limite
  v_data_limite := now() - (p_periodo_meses || ' months')::interval;

  -- Processar cada tabela selecionada
  FOREACH v_tabela IN ARRAY p_tabelas_selecionadas
  LOOP
    BEGIN
      v_count := 0;
      
      CASE v_tabela
        WHEN 'registros_recepcao' THEN
          DELETE FROM registros_recepcao
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_camararia' THEN
          DELETE FROM registros_camararia
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_revisao' THEN
          DELETE FROM registros_revisao
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_areas_comuns' THEN
          DELETE FROM registros_areas_comuns
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_gestao' THEN
          DELETE FROM registros_gestao
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_atividades_diarias' THEN
          DELETE FROM registros_atividades_diarias
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_atividades_extras' THEN
          DELETE FROM registros_atividades_extras
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_cozinha' THEN
          DELETE FROM registros_cozinha
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'registros_vendas' THEN
          DELETE FROM registros_vendas
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        WHEN 'manutencoes' THEN
          DELETE FROM manutencoes
          WHERE empresa_id = p_empresa_id AND data::timestamptz < v_data_limite;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          
        ELSE
          RAISE NOTICE 'Tabela não reconhecida: %', v_tabela;
      END CASE;

      -- Adicionar resultado ao array
      v_tabelas_processadas := v_tabelas_processadas || jsonb_build_object(
        'tabela', v_tabela,
        'registros_excluidos', v_count,
        'status', 'sucesso'
      );
      
      v_total_excluidos := v_total_excluidos + v_count;

    EXCEPTION WHEN OTHERS THEN
      -- Se houver erro em alguma tabela, registrar mas continuar
      v_status := 'erro_parcial';
      v_detalhes_erro := COALESCE(v_detalhes_erro, '') || 'Erro na tabela ' || v_tabela || ': ' || SQLERRM || '; ';
      
      v_tabelas_processadas := v_tabelas_processadas || jsonb_build_object(
        'tabela', v_tabela,
        'registros_excluidos', 0,
        'status', 'erro',
        'erro', SQLERRM
      );
    END;
  END LOOP;

  -- Calcular tempo de execução
  v_fim := clock_timestamp();
  v_tempo_execucao := EXTRACT(MILLISECONDS FROM (v_fim - v_inicio))::integer;

  -- Registrar log da operação
  INSERT INTO logs_limpeza_historico (
    empresa_id,
    usuario_id,
    periodo_meses,
    tabelas_processadas,
    total_registros_excluidos,
    tempo_execucao_ms,
    observacoes,
    status,
    detalhes_erro
  ) VALUES (
    p_empresa_id,
    p_usuario_id,
    p_periodo_meses,
    v_tabelas_processadas,
    v_total_excluidos,
    v_tempo_execucao,
    p_observacoes,
    v_status,
    v_detalhes_erro
  ) RETURNING id INTO v_log_id;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'status', v_status,
    'total_excluidos', v_total_excluidos,
    'tempo_execucao_ms', v_tempo_execucao,
    'tabelas_processadas', v_tabelas_processadas,
    'detalhes_erro', v_detalhes_erro
  );
END;
$$;
