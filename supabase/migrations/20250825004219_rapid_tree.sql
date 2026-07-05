/*
  # Criar tabela tipos_areas_comuns

  1. Nova Tabela
    - `tipos_areas_comuns`
      - `id` (uuid, primary key)
      - `nome` (text, unique, not null)
      - `ativo` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_areas_comuns`
    - Política de leitura para usuários autenticados
    - Política de modificação para admins e gestores

  3. Índices
    - Índice no campo `nome` para busca
    - Índice no campo `ativo` para filtros

  4. Triggers
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar tabela tipos_areas_comuns
CREATE TABLE IF NOT EXISTS tipos_areas_comuns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_areas_comuns ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Authenticated users can read tipos_areas_comuns"
  ON tipos_areas_comuns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestores can modify tipos_areas_comuns"
  ON tipos_areas_comuns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.profile IN ('admin', 'gestor') 
      AND usuarios.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.profile IN ('admin', 'gestor') 
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_nome ON tipos_areas_comuns USING btree (nome);
CREATE INDEX IF NOT EXISTS idx_tipos_areas_comuns_ativo ON tipos_areas_comuns USING btree (ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tipos_areas_comuns_updated_at
  BEFORE UPDATE ON tipos_areas_comuns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();