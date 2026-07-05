/*
  # Sistema de Tracking de Entrega de Mensagens

  1. Alterações em Tabelas Existentes
    - `mensagens_broadcast_lidas`
      - Adiciona `notificacao_push_enviada` (boolean) - indica se push foi enviado
      - Adiciona `tentativas_entrega` (integer) - contador de tentativas
      - Adiciona `ultima_tentativa_entrega` (timestamptz) - timestamp da última tentativa
      - Adiciona `metodo_entrega` (text) - como a mensagem foi entregue (realtime/push/email/verificacao)
    
    - `usuarios`
      - Adiciona `receber_email_mensagens_urgentes` (boolean) - preferência de email
      - Adiciona `ultima_verificacao_mensagens` (timestamptz) - última vez que verificou mensagens
  
  2. Índices
    - Índice para buscar mensagens não lidas por usuário
    - Índice para buscar mensagens pendentes de entrega
  
  3. Security
    - Mantém RLS existente
*/

-- Adicionar campos de tracking na tabela mensagens_broadcast_lidas
ALTER TABLE mensagens_broadcast_lidas 
ADD COLUMN IF NOT EXISTS notificacao_push_enviada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tentativas_entrega INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_tentativa_entrega TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metodo_entrega TEXT CHECK (metodo_entrega IN ('realtime', 'push', 'email', 'verificacao', 'manual'));

-- Adicionar created_at se não existir para tracking
ALTER TABLE mensagens_broadcast_lidas 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar campos de preferências em usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS receber_email_mensagens_urgentes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ultima_verificacao_mensagens TIMESTAMPTZ;

-- Criar índice para buscar mensagens não lidas de um usuário específico
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_usuario_lida 
ON mensagens_broadcast_lidas(usuario_id, lida_em, created_at DESC);

-- Criar índice para buscar mensagens pendentes de entrega
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_pendentes 
ON mensagens_broadcast_lidas(notificacao_push_enviada, tentativas_entrega, ultima_tentativa_entrega) 
WHERE lida_em IS NULL;

-- Criar função para obter mensagens não lidas de um usuário
CREATE OR REPLACE FUNCTION obter_mensagens_nao_lidas(p_usuario_id UUID)
RETURNS TABLE (
  mensagem_id UUID,
  titulo TEXT,
  conteudo TEXT,
  tipo TEXT,
  bloqueia_sistema BOOLEAN,
  criada_em TIMESTAMPTZ,
  tentativas_entrega INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mb.id,
    mb.titulo,
    mb.conteudo,
    mb.tipo,
    mb.bloqueia_sistema,
    mb.created_at,
    COALESCE(mbl.tentativas_entrega, 0) as tentativas_entrega
  FROM mensagens_broadcast mb
  LEFT JOIN mensagens_broadcast_lidas mbl 
    ON mbl.mensagem_id = mb.id AND mbl.usuario_id = p_usuario_id
  WHERE 
    mb.ativa = true
    AND (
      mbl.id IS NULL 
      OR (mbl.lida_em IS NULL AND mb.bloqueia_sistema = true)
    )
  ORDER BY 
    mb.bloqueia_sistema DESC,
    mb.created_at DESC;
END;
$$;

-- Criar função para registrar tentativa de entrega
CREATE OR REPLACE FUNCTION registrar_tentativa_entrega(
  p_usuario_id UUID,
  p_mensagem_id UUID,
  p_metodo TEXT DEFAULT 'verificacao'
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_registro_id UUID;
BEGIN
  -- Buscar ou criar registro na tabela de lidas
  SELECT id INTO v_registro_id
  FROM mensagens_broadcast_lidas
  WHERE usuario_id = p_usuario_id AND mensagem_id = p_mensagem_id;
  
  IF v_registro_id IS NULL THEN
    -- Criar novo registro
    INSERT INTO mensagens_broadcast_lidas (usuario_id, mensagem_id, tentativas_entrega, ultima_tentativa_entrega, metodo_entrega)
    VALUES (p_usuario_id, p_mensagem_id, 1, NOW(), p_metodo);
  ELSE
    -- Atualizar registro existente se ainda não foi lida
    UPDATE mensagens_broadcast_lidas
    SET 
      tentativas_entrega = tentativas_entrega + 1,
      ultima_tentativa_entrega = NOW(),
      metodo_entrega = COALESCE(metodo_entrega, p_metodo)
    WHERE id = v_registro_id AND lida_em IS NULL;
  END IF;
END;
$$;

-- Criar função para marcar notificação push como enviada
CREATE OR REPLACE FUNCTION marcar_push_enviada(
  p_usuario_id UUID,
  p_mensagem_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE mensagens_broadcast_lidas
  SET 
    notificacao_push_enviada = true,
    metodo_entrega = 'push'
  WHERE usuario_id = p_usuario_id AND mensagem_id = p_mensagem_id;
  
  -- Se não existe registro, criar
  IF NOT FOUND THEN
    INSERT INTO mensagens_broadcast_lidas (usuario_id, mensagem_id, notificacao_push_enviada, metodo_entrega)
    VALUES (p_usuario_id, p_mensagem_id, true, 'push');
  END IF;
END;
$$;

-- Criar função para obter estatísticas de entrega de uma mensagem
CREATE OR REPLACE FUNCTION obter_estatisticas_entrega(p_mensagem_id UUID)
RETURNS TABLE (
  total_destinatarios BIGINT,
  lidas BIGINT,
  nao_lidas BIGINT,
  push_enviadas BIGINT,
  tentativas_media NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH usuarios_empresa AS (
    SELECT u.id
    FROM usuarios u
    INNER JOIN mensagens_broadcast mb ON mb.empresa_id = u.empresa_id
    WHERE mb.id = p_mensagem_id AND u.active = true
  )
  SELECT 
    COUNT(ue.id) as total_destinatarios,
    COUNT(mbl.id) FILTER (WHERE mbl.lida_em IS NOT NULL) as lidas,
    COUNT(ue.id) - COUNT(mbl.id) FILTER (WHERE mbl.lida_em IS NOT NULL) as nao_lidas,
    COUNT(mbl.id) FILTER (WHERE mbl.notificacao_push_enviada = true) as push_enviadas,
    COALESCE(AVG(mbl.tentativas_entrega), 0) as tentativas_media
  FROM usuarios_empresa ue
  LEFT JOIN mensagens_broadcast_lidas mbl ON mbl.usuario_id = ue.id AND mbl.mensagem_id = p_mensagem_id;
END;
$$;

-- Garantir permissões de execução
GRANT EXECUTE ON FUNCTION obter_mensagens_nao_lidas TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_tentativa_entrega TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_push_enviada TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_entrega TO authenticated;