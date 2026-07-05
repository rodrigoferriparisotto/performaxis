/*
  # Criar tabela registros_cozinha

  1. Nova Tabela
    - `registros_cozinha`
      - `id` (uuid, primary key)
      - `data` (date) - Data do registro
      - `usuario_id` (uuid, foreign key) - Referência ao usuário
      - `empresa_id` (uuid, foreign key) - Referência à empresa
      - `tipo_cozinha_id` (uuid, foreign key) - Referência ao tipo de cozinha
      - `hora_inicio` (timestamptz) - Hora de início do registro
      - `hora_fim` (timestamptz) - Hora de término do registro
      - `atividades` (jsonb) - Lista de atividades com status
      - `observacoes` (text) - Observações do colaborador
      - `status` (text) - Status do registro (em_andamento, concluido)
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  2. Segurança
    - Habilitar RLS na tabela `registros_cozinha`
    - Políticas para usuários autenticados visualizarem apenas dados da sua empresa
    - Políticas para inserção e atualização de registros próprios
    - Política para exclusão apenas por administradores

  3. Índices
    - Índice em `empresa_id` para performance
    - Índice em `usuario_id` para filtros por usuário
    - Índice em `data` para consultas por período
    - Índice em `status` para filtros de registros ativos
*/

-- Criar tabela registros_cozinha
CREATE TABLE IF NOT EXISTS registros_cozinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_cozinha_id uuid REFERENCES tipos_cozinha(id) ON DELETE SET NULL,
  hora_inicio timestamptz NOT NULL DEFAULT now(),
  hora_fim timestamptz,
  atividades jsonb DEFAULT '[]'::jsonb,
  observacoes text DEFAULT '',
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_empresa_id ON registros_cozinha(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_usuario_id ON registros_cozinha(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_data ON registros_cozinha(data);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_status ON registros_cozinha(status);
CREATE INDEX IF NOT EXISTS idx_registros_cozinha_tipo_cozinha_id ON registros_cozinha(tipo_cozinha_id);

-- Habilitar RLS
ALTER TABLE registros_cozinha ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar registros da sua empresa
CREATE POLICY "Usuários podem visualizar registros da sua empresa"
  ON registros_cozinha FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir registros para sua empresa
CREATE POLICY "Usuários podem inserir registros"
  ON registros_cozinha FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar seus próprios registros
CREATE POLICY "Usuários podem atualizar seus próprios registros"
  ON registros_cozinha FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Política: Apenas administradores podem excluir registros
CREATE POLICY "Administradores podem excluir registros"
  ON registros_cozinha FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'
      AND empresa_id = registros_cozinha.empresa_id
    )
  );
