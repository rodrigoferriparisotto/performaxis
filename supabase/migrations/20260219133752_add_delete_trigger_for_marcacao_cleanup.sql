/*
  # Adicionar Trigger para Limpeza Automática de Marcações ao Deletar Registros

  ## Descrição
  Esta migration adiciona triggers AFTER DELETE em todas as tabelas de registros para garantir
  que a tabela ultima_marcacao_usuario seja limpa automaticamente quando um usuário cancela ou
  deleta todos os seus registros em andamento.

  ## Mudanças

  1. Nova Função
     - `limpar_marcacao_apos_delete()` - Função que é executada após DELETE de um registro
       - Verifica se o usuário ainda tem outros registros em andamento
       - Se não tiver mais nenhum registro, remove da tabela ultima_marcacao_usuario
       - Se ainda tiver registros, atualiza para o registro mais recente
       - Registra log de auditoria da limpeza

  2. Novos Triggers AFTER DELETE
     - `trigger_limpar_marcacao_camararia_delete`
     - `trigger_limpar_marcacao_recepcao_delete`
     - `trigger_limpar_marcacao_revisao_delete`
     - `trigger_limpar_marcacao_areas_comuns_delete`
     - `trigger_limpar_marcacao_gestao_delete`
     - `trigger_limpar_marcacao_cozinha_delete`
     - `trigger_limpar_marcacao_vendas_delete`

  ## Segurança
  - Função com SECURITY DEFINER para garantir execução com privilégios adequados
  - Busca automática por registros em andamento em todas as tabelas de registros
  - Garante consistência mesmo se o frontend falhar

  ## Notas Importantes
  - Este trigger garante que usuários não recebam notificações após cancelar todos os registros
  - Complementa a limpeza feita pelo frontend em activityMarkingService.limparRastreamentoCompleto()
  - Adiciona camada extra de segurança no banco de dados
*/

-- Criar função para limpar marcação após DELETE de registro
CREATE OR REPLACE FUNCTION limpar_marcacao_apos_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_id UUID;
  v_empresa_id UUID;
  v_tem_registros_abertos BOOLEAN := FALSE;
  v_ultimo_registro RECORD;
BEGIN
  -- Obter usuario_id e empresa_id do registro deletado
  v_usuario_id := COALESCE(OLD.usuario_executor_id, OLD.usuario_id);
  v_empresa_id := OLD.empresa_id;

  -- Verificar se ainda existem registros em andamento para este usuário
  -- Buscar em todas as tabelas de registros
  
  -- Camararia
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_camararia
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Recepção
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_recepcao
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Revisão
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_revisao
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Áreas Comuns
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_areas_comuns
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Gestão
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_gestao
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Cozinha
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_cozinha
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Vendas
  IF NOT v_tem_registros_abertos THEN
    SELECT TRUE INTO v_tem_registros_abertos
    FROM registros_vendas
    WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
      AND empresa_id = v_empresa_id
      AND status = 'em_andamento'
    LIMIT 1;
  END IF;

  -- Se não há mais registros em andamento, deletar da tabela ultima_marcacao_usuario
  IF NOT v_tem_registros_abertos THEN
    DELETE FROM ultima_marcacao_usuario
    WHERE usuario_id = v_usuario_id
      AND empresa_id = v_empresa_id;

    -- Registrar log de auditoria
    INSERT INTO logs_inatividade_backend (
      tipo_log,
      usuario_id,
      empresa_id,
      detalhes,
      created_at
    ) VALUES (
      'marcacao_limpa_apos_delete',
      v_usuario_id,
      v_empresa_id,
      jsonb_build_object(
        'motivo', 'Nenhum registro em andamento após DELETE',
        'tabela_origem', TG_TABLE_NAME,
        'registro_id', OLD.id
      ),
      NOW()
    );
  ELSE
    -- Se ainda há registros, atualizar para o mais recente
    -- Buscar o registro mais recente em andamento
    SELECT 
      hora_inicio,
      TG_TABLE_NAME as modulo
    INTO v_ultimo_registro
    FROM (
      SELECT hora_inicio, 'registros_camararia' as modulo FROM registros_camararia
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_recepcao' FROM registros_recepcao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_revisao' FROM registros_revisao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_areas_comuns' FROM registros_areas_comuns
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_gestao' FROM registros_gestao
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_cozinha' FROM registros_cozinha
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
      UNION ALL
      SELECT hora_inicio, 'registros_vendas' FROM registros_vendas
        WHERE COALESCE(usuario_executor_id, usuario_id) = v_usuario_id
          AND empresa_id = v_empresa_id AND status = 'em_andamento'
    ) todos_registros
    ORDER BY hora_inicio DESC
    LIMIT 1;

    -- Atualizar marcação para o registro mais recente
    IF v_ultimo_registro IS NOT NULL THEN
      UPDATE ultima_marcacao_usuario
      SET 
        ultima_marcacao_em = v_ultimo_registro.hora_inicio,
        modulo = v_ultimo_registro.modulo,
        updated_at = NOW()
      WHERE usuario_id = v_usuario_id
        AND empresa_id = v_empresa_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Criar triggers AFTER DELETE para todas as tabelas de registros

-- Camararia
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_camararia_delete ON registros_camararia;
CREATE TRIGGER trigger_limpar_marcacao_camararia_delete
  AFTER DELETE ON registros_camararia
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Recepção
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_recepcao_delete ON registros_recepcao;
CREATE TRIGGER trigger_limpar_marcacao_recepcao_delete
  AFTER DELETE ON registros_recepcao
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Revisão
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_revisao_delete ON registros_revisao;
CREATE TRIGGER trigger_limpar_marcacao_revisao_delete
  AFTER DELETE ON registros_revisao
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Áreas Comuns
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_areas_comuns_delete ON registros_areas_comuns;
CREATE TRIGGER trigger_limpar_marcacao_areas_comuns_delete
  AFTER DELETE ON registros_areas_comuns
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Gestão
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_gestao_delete ON registros_gestao;
CREATE TRIGGER trigger_limpar_marcacao_gestao_delete
  AFTER DELETE ON registros_gestao
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Cozinha
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_cozinha_delete ON registros_cozinha;
CREATE TRIGGER trigger_limpar_marcacao_cozinha_delete
  AFTER DELETE ON registros_cozinha
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();

-- Vendas
DROP TRIGGER IF EXISTS trigger_limpar_marcacao_vendas_delete ON registros_vendas;
CREATE TRIGGER trigger_limpar_marcacao_vendas_delete
  AFTER DELETE ON registros_vendas
  FOR EACH ROW
  EXECUTE FUNCTION limpar_marcacao_apos_delete();
