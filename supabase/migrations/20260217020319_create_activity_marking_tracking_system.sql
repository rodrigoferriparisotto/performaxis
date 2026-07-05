/*
  # Sistema de Rastreamento de Marcações de Atividades

  ## Descrição
  Este sistema rastreia quando os usuários fazem marcações de atividades (iniciar, pausar, concluir registros)
  e gera alertas quando ficam muito tempo sem atualizar suas atividades.

  ## 1. Nova Tabela: ultima_marcacao_usuario
    - `id` (uuid, primary key)
    - `usuario_id` (uuid, references usuarios.id)
    - `empresa_id` (uuid, references empresas.id)
    - `ultima_marcacao_em` (timestamptz) - timestamp da última marcação de atividade
    - `tipo_marcacao` (text) - tipo de marcação: 'inicio', 'conclusao', 'atividade_marcada'
    - `modulo` (text) - módulo onde foi feita a marcação (camararia, recepcao, etc)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 2. Nova Tabela: alertas_inatividade_marcacao
    - `id` (uuid, primary key)
    - `usuario_id` (uuid, references usuarios.id)
    - `empresa_id` (uuid, references empresas.id)
    - `mostrado_em` (timestamptz) - quando o alerta foi mostrado
    - `adiado_ate` (timestamptz, nullable) - até quando foi adiado
    - `fechado_em` (timestamptz, nullable) - quando foi fechado (usuário tomou ação)
    - `acao_tomada` (text, nullable) - 'revisar_agora', 'adiar', 'marcacao_feita'
    - `created_at` (timestamptz)

  ## 3. Segurança
    - Enable RLS em ambas as tabelas
    - Políticas para usuários visualizarem e atualizarem apenas seus próprios dados
*/

-- Criar tabela de última marcação do usuário
CREATE TABLE IF NOT EXISTS ultima_marcacao_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ultima_marcacao_em timestamptz NOT NULL DEFAULT now(),
  tipo_marcacao text NOT NULL CHECK (tipo_marcacao IN ('inicio', 'conclusao', 'atividade_marcada', 'pausa')),
  modulo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ultima_marcacao_usuario_id ON ultima_marcacao_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ultima_marcacao_empresa_id ON ultima_marcacao_usuario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ultima_marcacao_em ON ultima_marcacao_usuario(ultima_marcacao_em);

-- Criar tabela de alertas de inatividade
CREATE TABLE IF NOT EXISTS alertas_inatividade_marcacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mostrado_em timestamptz NOT NULL DEFAULT now(),
  adiado_ate timestamptz,
  fechado_em timestamptz,
  acao_tomada text CHECK (acao_tomada IN ('revisar_agora', 'adiar', 'marcacao_feita')),
  created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_alertas_inatividade_usuario_id ON alertas_inatividade_marcacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_inatividade_empresa_id ON alertas_inatividade_marcacao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_alertas_inatividade_mostrado_em ON alertas_inatividade_marcacao(mostrado_em);

-- Enable RLS
ALTER TABLE ultima_marcacao_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_inatividade_marcacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ultima_marcacao_usuario
CREATE POLICY "Users can view own marking data"
  ON ultima_marcacao_usuario FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own marking data"
  ON ultima_marcacao_usuario FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own marking data"
  ON ultima_marcacao_usuario FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Políticas RLS para alertas_inatividade_marcacao
CREATE POLICY "Users can view own alerts"
  ON alertas_inatividade_marcacao FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own alerts"
  ON alertas_inatividade_marcacao FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own alerts"
  ON alertas_inatividade_marcacao FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_ultima_marcacao_updated_at ON ultima_marcacao_usuario;
CREATE TRIGGER update_ultima_marcacao_updated_at
  BEFORE UPDATE ON ultima_marcacao_usuario
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
