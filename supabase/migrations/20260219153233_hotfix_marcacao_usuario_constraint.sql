/*
  # Hotfix: Corrigir constraint no trigger de marcação de usuário

  1. Problema Identificado
    - A função `atualizar_marcacao_usuario()` estava usando `ON CONFLICT (usuario_id)` na linha 50
    - Mas a constraint única real na tabela `ultima_marcacao_usuario` é `(usuario_id, empresa_id)`
    - Isso causava erro PostgreSQL 42P10 impedindo TODOS os usuários de iniciar registros em TODOS os módulos

  2. Correção Aplicada
    - Substituir completamente a função `atualizar_marcacao_usuario()` com a constraint correta
    - Alterar `ON CONFLICT (usuario_id)` para `ON CONFLICT (usuario_id, empresa_id)`
    - Adicionar `empresa_id = NEW.empresa_id` no UPDATE para garantir consistência

  3. Impacto
    - Após esta correção, todos os usuários voltarão a conseguir iniciar registros normalmente
    - A tabela ultima_marcacao_usuario será atualizada corretamente respeitando a constraint composta
    - Triggers existentes continuarão funcionando sem necessidade de modificação

  4. Segurança
    - Função mantém SECURITY DEFINER conforme original
    - Sem alterações nos triggers ou permissões RLS
*/

-- DROP e recriar a função com a constraint correta
DROP FUNCTION IF EXISTS atualizar_marcacao_usuario() CASCADE;

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
    ON CONFLICT (usuario_id, empresa_id)
    DO UPDATE SET
      ultima_marcacao_em = COALESCE(NEW.hora_inicio, NOW()),
      tipo_marcacao = 'registro_iniciado',
      modulo = TG_TABLE_NAME,
      empresa_id = NEW.empresa_id,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$;

-- Recriar todos os triggers (o DROP CASCADE removeu os triggers antigos)
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

-- Adicionar comentário atualizado
COMMENT ON FUNCTION atualizar_marcacao_usuario() IS 'Trigger function que atualiza automaticamente ultima_marcacao_usuario quando registro é iniciado (HOTFIX: corrigida constraint composta)';
