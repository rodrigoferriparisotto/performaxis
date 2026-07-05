/*
  # Criar tabela tipos_funcoes_comerciais

  1. Nova Tabela
    - `tipos_funcoes_comerciais`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `ativo` (boolean, default true)
      - `empresa_id` (uuid, not null, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `tipos_funcoes_comerciais`
    - Adicionar políticas para usuários autenticados lerem seus próprios dados
    - Adicionar políticas para usuários com permissão modificarem

  3. Índices
    - Índice no campo `nome` para buscas rápidas
    - Índice no campo `ativo` para filtros
    - Índice no campo `empresa_id` para multi-tenancy

  4. Notas Importantes
    - Esta tabela armazena tipos de funções comerciais (vendas, marketing, comercial, etc.)
    - Permite configuração customizada por empresa
*/

-- Criar tabela tipos_funcoes_comerciais
CREATE TABLE IF NOT EXISTS tipos_funcoes_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE tipos_funcoes_comerciais ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários autenticados podem ler tipos da própria empresa
CREATE POLICY "Users can view tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Política para INSERT: usuários autenticados podem criar tipos
CREATE POLICY "Users can insert tipos_funcoes_comerciais for own company"
  ON tipos_funcoes_comerciais
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para UPDATE: usuários podem atualizar tipos da própria empresa
CREATE POLICY "Users can update tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- Política para DELETE: apenas admins podem excluir tipos
CREATE POLICY "Admins can delete tipos_funcoes_comerciais from own company"
  ON tipos_funcoes_comerciais
  FOR DELETE
  TO authenticated
  USING (
    empresa_id = get_user_empresa_id()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_nome ON tipos_funcoes_comerciais(nome);
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_ativo ON tipos_funcoes_comerciais(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_funcoes_comerciais_empresa_id ON tipos_funcoes_comerciais(empresa_id);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_funcoes_comerciais_updated_at
  BEFORE UPDATE ON tipos_funcoes_comerciais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();