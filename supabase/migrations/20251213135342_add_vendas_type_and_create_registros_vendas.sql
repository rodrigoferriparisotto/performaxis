/*
  # Adicionar tipo 'vendas' e criar tabela registros_vendas

  1. Alteração de Enum
    - Adicionar 'vendas' ao enum `activity_type_enum`
    - Adicionar coluna `tipos_funcoes_comerciais` à tabela `atividades`

  2. Nova Tabela
    - `registros_vendas`
      - `id` (uuid, primary key)
      - `data` (date) - Data do registro
      - `usuario_id` (uuid, foreign key) - Referência ao usuário
      - `empresa_id` (uuid, foreign key) - Referência à empresa
      - `hora_inicio` (timestamptz) - Hora de início do registro
      - `hora_fim` (timestamptz) - Hora de término do registro
      - `atividades` (jsonb) - Lista de atividades com status
      - `observacoes` (text) - Observações do colaborador
      - `fotos` (text[]) - Array de URLs de fotos
      - `status` (registro_status_enum) - Status do registro
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  3. Segurança
    - Habilitar RLS na tabela `registros_vendas`
    - Políticas para usuários autenticados visualizarem apenas dados da sua empresa
    - Políticas para inserção e atualização de registros próprios
    - Política para exclusão apenas por administradores

  4. Índices
    - Índice em `empresa_id` para performance
    - Índice em `usuario_id` para filtros por usuário
    - Índice em `data` para consultas por período
    - Índice em `status` para filtros de registros ativos

  5. Notas Importantes
    - Esta tabela armazena registros de atividades comerciais/vendas
    - Suporta multi-tenancy através de empresa_id
*/

-- Adicionar 'vendas' ao enum activity_type_enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'vendas' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
  ) THEN
    ALTER TYPE activity_type_enum ADD VALUE 'vendas';
  END IF;
END $$;

-- Adicionar coluna tipos_funcoes_comerciais à tabela atividades (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades' AND column_name = 'tipos_funcoes_comerciais'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_funcoes_comerciais jsonb DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_atividades_tipos_funcoes_comerciais 
      ON atividades USING gin(tipos_funcoes_comerciais);
  END IF;
END $$;

-- Criar tabela registros_vendas
CREATE TABLE IF NOT EXISTS registros_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  hora_inicio timestamptz NOT NULL DEFAULT now(),
  hora_fim timestamptz,
  atividades jsonb DEFAULT '[]'::jsonb,
  observacoes text DEFAULT '',
  fotos text[] DEFAULT '{}',
  status registro_status_enum NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registros_vendas_empresa_id ON registros_vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_usuario_id ON registros_vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_data ON registros_vendas(data);
CREATE INDEX IF NOT EXISTS idx_registros_vendas_status ON registros_vendas(status);

-- Habilitar RLS
ALTER TABLE registros_vendas ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar registros da sua empresa
CREATE POLICY "Users can view registros_vendas from own company"
  ON registros_vendas FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir registros para sua empresa
CREATE POLICY "Users can insert registros_vendas for own company"
  ON registros_vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar seus próprios registros
CREATE POLICY "Users can update own registros_vendas"
  ON registros_vendas FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Política: Apenas administradores podem excluir registros
CREATE POLICY "Admins can delete registros_vendas from own company"
  ON registros_vendas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND profile = 'admin'
      AND empresa_id = registros_vendas.empresa_id
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_registros_vendas_updated_at
  BEFORE UPDATE ON registros_vendas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();