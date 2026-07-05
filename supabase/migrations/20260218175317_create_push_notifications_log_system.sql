/*
  # Sistema de Log de Notificações Push

  1. Nova Tabela
    - `push_notifications_log`
      - `id` (uuid, primary key)
      - `tipo` (text) - tipo da notificação: 'reminder', 'broadcast', 'update', 'inactivity', 'test'
      - `titulo` (text) - título da notificação
      - `corpo` (text) - corpo/mensagem da notificação
      - `usuario_id` (uuid) - usuário alvo (null para broadcast geral)
      - `empresa_id` (uuid) - empresa alvo (null para todas empresas)
      - `tokens_alvo` (text[]) - array de tokens FCM que receberam
      - `sucesso_count` (int) - contador de envios bem-sucedidos
      - `falha_count` (int) - contador de envios que falharam
      - `tentativas` (int) - número de tentativas de envio
      - `dados` (jsonb) - dados adicionais da notificação
      - `enviado_em` (timestamptz) - quando foi enviado
      - `created_at` (timestamptz) - data de criação

  2. Índices
    - Índice em `tipo` para filtrar por tipo de notificação
    - Índice em `usuario_id` para buscar notificações de usuário
    - Índice em `empresa_id` para buscar notificações de empresa
    - Índice em `enviado_em` para ordenação temporal

  3. Security
    - Enable RLS
    - Admin pode ver todos os logs
    - Usuários podem ver apenas seus próprios logs
*/

-- Criar tabela de log de notificações push
CREATE TABLE IF NOT EXISTS push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('reminder', 'broadcast', 'update', 'inactivity', 'test', 'custom')),
  titulo TEXT NOT NULL,
  corpo TEXT NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  tokens_alvo TEXT[] DEFAULT ARRAY[]::TEXT[],
  sucesso_count INTEGER DEFAULT 0,
  falha_count INTEGER DEFAULT 0,
  tentativas INTEGER DEFAULT 1,
  dados JSONB DEFAULT '{}'::jsonb,
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_tipo ON push_notifications_log(tipo);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_usuario ON push_notifications_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_empresa ON push_notifications_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_enviado ON push_notifications_log(enviado_em DESC);

-- Enable RLS
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admin pode ver todos os logs
CREATE POLICY "Admin can view all push logs"
  ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- Policy: Usuários podem ver seus próprios logs
CREATE POLICY "Users can view own push logs"
  ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Policy: Sistema pode inserir logs
CREATE POLICY "System can insert push logs"
  ON push_notifications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admin pode atualizar logs
CREATE POLICY "Admin can update push logs"
  ON push_notifications_log
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );
