/*
  # Sistema de Logs para Verificação Backend de Inatividade

  1. Novas Tabelas
    - `logs_verificacao_inatividade`
      - `id` (uuid, primary key)
      - `executado_em` (timestamptz) - Quando a verificação rodou
      - `usuarios_verificados` (integer) - Quantidade de usuários verificados
      - `notificacoes_enviadas` (integer) - Quantidade de notificações enviadas
      - `erros` (jsonb) - Erros encontrados durante execução
      - `detalhes` (jsonb) - Detalhes adicionais da execução
      - `tempo_execucao_ms` (integer) - Tempo de execução em milissegundos
    
    - `logs_atualizacao_marcacao`
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, foreign key)
      - `empresa_id` (uuid, foreign key)
      - `modulo` (text) - Módulo que originou a atualização
      - `acao` (text) - Ação realizada (inicio, pausa, conclusao, marcacao)
      - `timestamp_anterior` (timestamptz) - Timestamp anterior
      - `timestamp_novo` (timestamptz) - Novo timestamp
      - `criado_em` (timestamptz)

  2. Segurança
    - Habilitar RLS em ambas tabelas
    - Políticas para admin e gestor visualizarem logs
    - Sistema pode inserir em ambas as tabelas
*/

-- Criar tabela de logs de verificação de inatividade
CREATE TABLE IF NOT EXISTS logs_verificacao_inatividade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz DEFAULT now() NOT NULL,
  usuarios_verificados integer DEFAULT 0 NOT NULL,
  notificacoes_enviadas integer DEFAULT 0 NOT NULL,
  erros jsonb DEFAULT '[]'::jsonb,
  detalhes jsonb DEFAULT '{}'::jsonb,
  tempo_execucao_ms integer DEFAULT 0
);

-- Criar índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_logs_verificacao_inatividade_executado_em 
  ON logs_verificacao_inatividade(executado_em DESC);

-- Habilitar RLS
ALTER TABLE logs_verificacao_inatividade ENABLE ROW LEVEL SECURITY;

-- Política para admin e gestor visualizarem logs
CREATE POLICY "Admin e Gestor podem visualizar logs de verificação"
  ON logs_verificacao_inatividade
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Permitir sistema inserir logs (será chamado pela Edge Function)
CREATE POLICY "Sistema pode inserir logs de verificação"
  ON logs_verificacao_inatividade
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Criar tabela de logs de atualização de marcação
CREATE TABLE IF NOT EXISTS logs_atualizacao_marcacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  modulo text NOT NULL,
  acao text NOT NULL,
  timestamp_anterior timestamptz,
  timestamp_novo timestamptz NOT NULL,
  criado_em timestamptz DEFAULT now() NOT NULL
);

-- Criar índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_logs_atualizacao_marcacao_usuario_id 
  ON logs_atualizacao_marcacao(usuario_id);

CREATE INDEX IF NOT EXISTS idx_logs_atualizacao_marcacao_criado_em 
  ON logs_atualizacao_marcacao(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_logs_atualizacao_marcacao_empresa_id 
  ON logs_atualizacao_marcacao(empresa_id);

-- Habilitar RLS
ALTER TABLE logs_atualizacao_marcacao ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem seus próprios logs
CREATE POLICY "Usuários podem visualizar próprios logs de marcação"
  ON logs_atualizacao_marcacao
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Política para admin e gestor visualizarem todos logs da empresa
CREATE POLICY "Admin e Gestor podem visualizar logs de marcação da empresa"
  ON logs_atualizacao_marcacao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = logs_atualizacao_marcacao.empresa_id
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Permitir inserção de logs
CREATE POLICY "Sistema pode inserir logs de marcação"
  ON logs_atualizacao_marcacao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
  );

-- Função para limpar logs antigos automaticamente (manter últimos 30 dias)
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar logs de verificação com mais de 30 dias
  DELETE FROM logs_verificacao_inatividade
  WHERE executado_em < now() - interval '30 days';

  -- Deletar logs de marcação com mais de 30 dias
  DELETE FROM logs_atualizacao_marcacao
  WHERE criado_em < now() - interval '30 days';
END;
$$;