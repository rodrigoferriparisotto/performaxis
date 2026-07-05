/*
  # Adicionar Sistema de Validação e Rastreamento de Erros para Tokens FCM

  1. Mudanças na Tabela push_tokens
    - Adiciona coluna `last_error` para armazenar último erro
    - Adiciona coluna `error_count` para contar falhas consecutivas
    - Adiciona coluna `last_success_at` para rastrear último envio bem-sucedido
    - Adiciona validação de formato de token
    - Adiciona índices para melhorar performance

  2. Funções
    - Cria função para validar formato de token FCM
    - Cria função para desativar tokens com muitos erros
    - Cria trigger para validar tokens antes de inserir

  3. View
    - Cria view para facilitar monitoramento de saúde dos tokens
*/

-- Adicionar colunas de rastreamento de erros
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN last_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'error_count'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN error_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'last_success_at'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN last_success_at timestamptz;
  END IF;
END $$;

-- Função para validar formato de token FCM
CREATE OR REPLACE FUNCTION validate_fcm_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Token FCM deve ter pelo menos 140 caracteres e não ser token de teste
  IF token IS NULL OR LENGTH(token) < 100 THEN
    RETURN false;
  END IF;

  -- Não aceitar tokens de teste
  IF token LIKE 'test-%' OR token = 'test-token-123' THEN
    RETURN false;
  END IF;

  -- Token FCM válido geralmente contém caracteres alfanuméricos, hífens, underscores e dois pontos
  IF token !~ '^[A-Za-z0-9_\-:]+$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Trigger para validar tokens antes de inserir/atualizar
CREATE OR REPLACE FUNCTION validate_token_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT validate_fcm_token(NEW.token) THEN
    RAISE EXCEPTION 'Token FCM inválido: formato incorreto ou token de teste';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS validate_token_trigger ON push_tokens;
CREATE TRIGGER validate_token_trigger
  BEFORE INSERT OR UPDATE OF token ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION validate_token_before_insert();

-- Função para desativar tokens com muitos erros (5+ erros consecutivos)
CREATE OR REPLACE FUNCTION deactivate_failed_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE push_tokens
  SET 
    is_active = false,
    updated_at = now()
  WHERE 
    is_active = true
    AND error_count >= 5
    AND (last_success_at IS NULL OR last_success_at < updated_at);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- View para monitorar saúde dos tokens
CREATE OR REPLACE VIEW push_tokens_health AS
SELECT 
  pt.id,
  pt.usuario_id,
  u.name as usuario_nome,
  u.empresa_id,
  pt.token,
  pt.is_active,
  pt.error_count,
  pt.last_error,
  pt.last_success_at,
  pt.created_at,
  pt.updated_at,
  CASE 
    WHEN pt.error_count = 0 THEN 'healthy'
    WHEN pt.error_count < 3 THEN 'warning'
    WHEN pt.error_count < 5 THEN 'critical'
    ELSE 'failed'
  END as health_status,
  CASE
    WHEN NOT pt.is_active THEN 'inactive'
    WHEN pt.last_success_at IS NULL THEN 'never_sent'
    WHEN pt.last_success_at > now() - interval '7 days' THEN 'active'
    WHEN pt.last_success_at > now() - interval '30 days' THEN 'stale'
    ELSE 'very_stale'
  END as activity_status
FROM push_tokens pt
LEFT JOIN usuarios u ON u.id = pt.usuario_id
ORDER BY pt.updated_at DESC;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_error_count ON push_tokens(error_count) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_last_success ON push_tokens(last_success_at) WHERE is_active = true;

-- Comentários
COMMENT ON COLUMN push_tokens.last_error IS 'Último erro encontrado ao tentar enviar notificação';
COMMENT ON COLUMN push_tokens.error_count IS 'Número de erros consecutivos (resetado após sucesso)';
COMMENT ON COLUMN push_tokens.last_success_at IS 'Data/hora do último envio bem-sucedido';
COMMENT ON FUNCTION validate_fcm_token IS 'Valida formato de token FCM';
COMMENT ON FUNCTION deactivate_failed_tokens IS 'Desativa tokens com 5 ou mais erros consecutivos';
COMMENT ON VIEW push_tokens_health IS 'View para monitorar saúde e status dos tokens FCM';
