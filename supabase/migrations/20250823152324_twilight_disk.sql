/*
  # Criar tabela tipos_recepcao

  1. Nova Tabela
    - `tipos_recepcao`
      - `id` (uuid, primary key)
      - `nome` (text, unique, not null)
      - `ativo` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_recepcao`
    - Adicionar políticas para usuários autenticados lerem
    - Adicionar políticas para admins e recepção modificarem

  3. Índices
    - Índice no campo `nome` para buscas rápidas
    - Índice no campo `ativo` para filtros
*/

-- Criar tabela tipos_recepcao
CREATE TABLE IF NOT EXISTS tipos_recepcao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_recepcao ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem ler tipos de recepção"
  ON tipos_recepcao
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem modificar tipos de recepção"
  ON tipos_recepcao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  );

CREATE POLICY "Usuários de recepção podem modificar tipos de recepção"
  ON tipos_recepcao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'recepcao')
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'recepcao')
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_nome ON tipos_recepcao(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_recepcao_ativo ON tipos_recepcao(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_recepcao_updated_at
  BEFORE UPDATE ON tipos_recepcao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns tipos padrão
INSERT INTO tipos_recepcao (nome, ativo) VALUES
  ('Recepção Diurna', true),
  ('Recepção Noturna', true),
  ('Recepção VIP', true),
  ('Recepção Express', true)
ON CONFLICT (nome) DO NOTHING;