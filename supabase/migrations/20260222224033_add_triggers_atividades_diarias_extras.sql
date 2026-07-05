/*
  # Adicionar triggers para Atividades Diárias e Atividades Extras

  1. Problema
    - As tabelas `registros_atividades_diarias` e `registros_atividades_extras` não possuem triggers para atualizar automaticamente a tabela `ultima_marcacao_usuario`
    - Edge Function `check-inactivity-reminders` já verifica essas tabelas, mas os triggers estão faltando
    - Resultado: notificações push não são enviadas para registros iniciados nestes módulos

  2. Solução
    - Adicionar triggers para `registros_atividades_diarias` que atualizam `ultima_marcacao_usuario` quando status muda para 'em_andamento'
    - Adicionar triggers para `registros_atividades_extras` que atualizam `ultima_marcacao_usuario` quando status muda para 'em_andamento'
    - Utilizar a função `atualizar_marcacao_usuario()` já existente

  3. Impacto
    - Usuários receberão notificações de inatividade quando iniciarem registros em Atividades Diárias e Atividades Extras
    - Sistema de rastreamento funcionará uniformemente em todos os módulos
    - Nenhuma mudança no frontend necessária

  4. Segurança
    - Triggers usam função existente com SECURITY DEFINER para contornar RLS
    - Sem alteração em políticas RLS ou permissões
*/

-- Adicionar trigger para registros_atividades_diarias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_atualizar_marcacao_atividades_diarias'
  ) THEN
    CREATE TRIGGER trigger_atualizar_marcacao_atividades_diarias
      AFTER INSERT OR UPDATE ON registros_atividades_diarias
      FOR EACH ROW
      EXECUTE FUNCTION atualizar_marcacao_usuario();
    
    RAISE NOTICE 'Trigger criado para registros_atividades_diarias';
  ELSE
    RAISE NOTICE 'Trigger já existe para registros_atividades_diarias';
  END IF;
END $$;

-- Adicionar trigger para registros_atividades_extras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_atualizar_marcacao_atividades_extras'
  ) THEN
    CREATE TRIGGER trigger_atualizar_marcacao_atividades_extras
      AFTER INSERT OR UPDATE ON registros_atividades_extras
      FOR EACH ROW
      EXECUTE FUNCTION atualizar_marcacao_usuario();
    
    RAISE NOTICE 'Trigger criado para registros_atividades_extras';
  ELSE
    RAISE NOTICE 'Trigger já existe para registros_atividades_extras';
  END IF;
END $$;

-- Atualizar função corrigir_inconsistencias_marcacao para incluir as novas tabelas
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
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_atividades_diarias WHERE status = 'em_andamento'
      UNION ALL
      SELECT usuario_executor_id, hora_inicio, empresa_id FROM registros_atividades_extras WHERE status = 'em_andamento'
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

-- Comentário atualizado
COMMENT ON FUNCTION corrigir_inconsistencias_marcacao() IS 'Função de manutenção para corrigir inconsistências entre registros abertos e última marcação (incluindo atividades_diarias e atividades_extras)';
