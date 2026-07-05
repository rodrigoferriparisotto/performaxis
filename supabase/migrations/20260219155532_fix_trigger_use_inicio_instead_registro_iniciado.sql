/*
  # Fix: Usar 'inicio' ao invés de 'registro_iniciado' no trigger de marcação

  1. Problema Identificado
    - A função `atualizar_marcacao_usuario()` estava usando `'registro_iniciado'` nas linhas 53 e 61
    - Mas a constraint CHECK na tabela `ultima_marcacao_usuario` só aceita: 'inicio', 'pausa', 'conclusao', 'atividade_marcada'
    - Isso causava erro PostgreSQL 23514 (check_violation) impedindo a criação de registros

  2. Correção Aplicada
    - Substituir todas as ocorrências de `'registro_iniciado'` por `'inicio'`
    - Manter toda a lógica do trigger intacta
    - Usar valor que já existe e é aceito pela constraint

  3. Impacto
    - Após esta correção, todos os usuários conseguirão iniciar registros normalmente
    - A tabela ultima_marcacao_usuario será atualizada corretamente com tipo_marcacao = 'inicio'
    - Mantém compatibilidade com o código existente que já usa 'inicio'

  4. Segurança
    - Função mantém SECURITY DEFINER conforme original
    - Sem alterações nos triggers ou permissões RLS
*/

-- Substituir a função com o valor correto
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
      'inicio',  -- CORRIGIDO: usar 'inicio' ao invés de 'registro_iniciado'
      TG_TABLE_NAME,
      NOW(),
      NOW()
    )
    ON CONFLICT (usuario_id, empresa_id)
    DO UPDATE SET
      ultima_marcacao_em = COALESCE(NEW.hora_inicio, NOW()),
      tipo_marcacao = 'inicio',  -- CORRIGIDO: usar 'inicio' ao invés de 'registro_iniciado'
      modulo = TG_TABLE_NAME,
      empresa_id = NEW.empresa_id,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$;

-- Adicionar comentário atualizado
COMMENT ON FUNCTION atualizar_marcacao_usuario() IS 'Trigger function que atualiza automaticamente ultima_marcacao_usuario quando registro é iniciado (usa tipo_marcacao = inicio)';
