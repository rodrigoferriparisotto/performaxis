/*
  # Create logs_acesso (user access logs) table

  1. New Tables
    - `logs_acesso`
      - `id` (uuid, primary key) - Unique identifier for each access log
      - `usuario_id` (uuid, foreign key) - References usuarios table
      - `empresa_id` (uuid, foreign key) - References empresas table
      - `usuario_nome` (text) - User name at time of access
      - `usuario_profile` (text) - User profile at time of access
      - `data_hora` (timestamptz) - Timestamp of access
      - `acao` (text) - Type of action: Login, Logout, Acesso ao módulo, Erro de autenticação
      - `modulo_acessado` (text) - Module accessed (if applicable)
      - `detalhes` (text) - Additional details about the access
      - `ip_address` (text) - IP address of user
      - `navegador` (text) - Browser information
      - `dispositivo` (text) - Device type (Desktop, Mobile, Tablet)
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `logs_acesso` table
    - Users can view all logs from their company
    - This allows proper audit trail visibility

  3. Indexes
    - Index on usuario_id for fast user lookups
    - Index on empresa_id for company filtering
    - Index on data_hora for date-based queries
    - Composite index on empresa_id and data_hora for efficient queries
*/

-- Create logs_acesso table
CREATE TABLE IF NOT EXISTS logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_nome text NOT NULL,
  usuario_profile text NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  acao text NOT NULL,
  modulo_acessado text,
  detalhes text,
  ip_address text,
  navegador text,
  dispositivo text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_acesso_usuario_id ON logs_acesso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_empresa_id ON logs_acesso(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_data_hora ON logs_acesso(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_acao ON logs_acesso(acao);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_usuario_profile ON logs_acesso(usuario_profile);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_empresa_data ON logs_acesso(empresa_id, data_hora DESC);

-- Enable RLS
ALTER TABLE logs_acesso ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all logs from their company
CREATE POLICY "Users can view company logs"
  ON logs_acesso
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = logs_acesso.empresa_id
    )
  );

-- Policy: Authenticated users can insert logs
CREATE POLICY "System can insert logs"
  ON logs_acesso
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = logs_acesso.empresa_id
    )
  );

-- Enable realtime for logs_acesso table
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE logs_acesso;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add comment to table
COMMENT ON TABLE logs_acesso IS 'Stores user access logs for auditing and monitoring purposes';
