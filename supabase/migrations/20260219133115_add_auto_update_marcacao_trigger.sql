/*
  # Adicionar trigger para atualizar última marcação automaticamente

  1. Funções
    - `atualizar_marcacao_usuario()`: Função trigger que atualiza automaticamente a tabela ultima_marcacao_usuario quando um registro é inserido ou atualizado
    - `corrigir_inconsistencias_marcacao()`: Função de manutenção que corrige inconsistências detectadas entre registros abertos e última marcação

  2. Triggers
    - Triggers em todas as tabelas de registros para atualizar marcação automaticamente ao inserir/atualizar registros com status 'em_andamento'

  3. Segurança
    - Funções com SECURITY DEFINER para permitir atualização da tabela ultima_marcacao_usuario
    - Validações para evitar atualizações desnecessárias

  IMPORTANTE: Esta migration resolve o problema de notificações incorretas garantindo que a última marcação seja sempre atualizada quando um registro é iniciado.
*/

-- Função para atualizar automaticamente a última marcação do usuário
CREATE OR REPLACE FUNCTION atualizar_marcacao_usuario()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualizar apenas se o registro está sendo criado com status 'em_andamento'
  -- ou se o status está mudando para 'em_andamento'
  IF (TG_OP = 'INSERT' AND NEW.status = 'em_andamento') OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'em_andamento' AND NEW.status = 'em_andamento') THEN

    -- Atualizar ou inserir na tabela ultima_marcacao_usuario
    INSERT INTO ultima_marcacao_usuario (
      usuario_id,
      empresa_id,
      ultima_marcacao_em,
      tipo_marcacao,
      modulo,
      created_at,
      updated_at
    )
    VALUES (
      COALESCE(NEW.usuario_executor_id, NEW.usuario_id),
      NEW.empresa_id,
      COALESCE(NEW.hora_inicio, NOW()),
      'registro_iniciado',
      TG_TABLE_NAME,
      NOW(),
      NOW()
    )
    ON CONFLICT (usuario_id)
    DO UPDATE SET
      ultima_marcacao_em = COALESCE(NEW.hora_inicio, NOW()),
      tipo_marcacao = 'registro_iniciado',
      modulo = TG_TABLE_NAME,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$;

-- Adicionar triggers em todas as tabelas de registros
CREATE TRIGGER trigger_atualizar_marcacao_camararia
  AFTER INSERT OR UPDATE ON registros_camararia
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_areas_comuns
  AFTER INSERT OR UPDATE ON registros_areas_comuns
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_cozinha
  AFTER INSERT OR UPDATE ON registros_cozinha
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_gestao
  AFTER INSERT OR UPDATE ON registros_gestao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_recepcao
  AFTER INSERT OR UPDATE ON registros_recepcao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_vendas
  AFTER INSERT OR UPDATE ON registros_vendas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

CREATE TRIGGER trigger_atualizar_marcacao_revisao
  AFTER INSERT OR UPDATE ON registros_revisao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_marcacao_usuario();

-- Função de manutenção para corrigir inconsistências
CREATE OR REPLACE FUNCTION corrigir_inconsistencias_marcacao()
RETURNS TABLE (
  usuario_id uuid,
  nome_usuario text,
  marcacao_anterior timestamptz,
  marcacao_corrigida timestamptz,
  diferenca_minutos numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH registros_recentes AS (
    SELECT DISTINCT ON (usuario_executor_id)
      usuario_executor_id,
      hora_inicio,
      empresa_id
    FROM (
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_camararia WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_areas_comuns WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_cozinha WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_gestao WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_recepcao WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_vendas WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_revisao WHERE status = 'em_andamento'
    ) todos_registros
    WHERE usuario_executor_id IS NOT NULL
    ORDER BY usuario_executor_id, hora_inicio DESC
  ),
  inconsistencias AS (
    SELECT
      rr.usuario_executor_id as uid,
      u.name,
      umu.ultima_marcacao_em as marcacao_antiga,
      rr.hora_inicio as marcacao_nova,
      EXTRACT(EPOCH FROM (rr.hora_inicio - umu.ultima_marcacao_em))/60 as diff_min
    FROM registros_recentes rr
    JOIN usuarios u ON u.id = rr.usuario_executor_id
    LEFT JOIN ultima_marcacao_usuario umu ON umu.usuario_id = rr.usuario_executor_id
    WHERE rr.hora_inicio > COALESCE(umu.ultima_marcacao_em, '1970-01-01'::timestamptz) + INTERVAL '5 minutes'
  )
  UPDATE ultima_marcacao_usuario umu
  SET
    ultima_marcacao_em = i.marcacao_nova,
    updated_at = NOW()
  FROM inconsistencias i
  WHERE umu.usuario_id = i.uid
  RETURNING i.uid, i.name, i.marcacao_antiga, i.marcacao_nova, i.diff_min;
END;
$$;

-- Comentários
COMMENT ON FUNCTION atualizar_marcacao_usuario() IS 'Trigger function que atualiza automaticamente ultima_marcacao_usuario quando registro é iniciado';
COMMENT ON FUNCTION corrigir_inconsistencias_marcacao() IS 'Função de manutenção para corrigir inconsistências entre registros abertos e última marcação';