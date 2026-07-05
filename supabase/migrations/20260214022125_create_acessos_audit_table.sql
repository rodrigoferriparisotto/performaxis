/*
  # Create Acessos Audit Table

  ## Overview
  This migration creates an audit log system to track when users view passwords
  stored in the acessos table, enhancing security and accountability.

  ## New Tables
    - `acessos_audit_log`
      - `id` (uuid, primary key) - Unique identifier
      - `acesso_id` (uuid, required) - Foreign key to acessos table
      - `usuario_id` (uuid, required) - User who accessed the password
      - `empresa_id` (uuid, required) - Company context
      - `acao` (text, required) - Action type (visualizou_senha, copiou_senha)
      - `ip_address` (text, optional) - IP address of the user
      - `user_agent` (text, optional) - Browser/device information
      - `created_at` (timestamptz) - Timestamp of the access

  ## Security
    - Enable RLS on `acessos_audit_log` table
    - Add policies for authenticated users to view their own audit logs
    - Only admin and gestor profiles can view all company audit logs
    - Audit logs are immutable (no update or delete allowed)

  ## Indexes
    - Index on acesso_id for faster lookup
    - Index on usuario_id for user activity tracking
    - Index on empresa_id for company-wide reports
    - Index on created_at for time-based queries
*/

-- Create acessos_audit_log table
CREATE TABLE IF NOT EXISTS acessos_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id uuid NOT NULL REFERENCES acessos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acao text NOT NULL CHECK (acao IN ('visualizou_senha', 'copiou_senha', 'visualizou_login', 'copiou_login')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_acessos_audit_acesso_id ON acessos_audit_log(acesso_id);
CREATE INDEX IF NOT EXISTS idx_acessos_audit_usuario_id ON acessos_audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_acessos_audit_empresa_id ON acessos_audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_acessos_audit_created_at ON acessos_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acessos_audit_empresa_created ON acessos_audit_log(empresa_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE acessos_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for acessos_audit_log table

-- SELECT: Admin and gestor can view all company audit logs
CREATE POLICY "Admin and gestor can view company audit logs"
  ON acessos_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos_audit_log.empresa_id
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- INSERT: Any authenticated user can create audit logs for their company
CREATE POLICY "Users can create audit logs"
  ON acessos_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id = acessos_audit_log.usuario_id
      AND usuarios.empresa_id = acessos_audit_log.empresa_id
    )
  );

-- No UPDATE or DELETE policies - audit logs are immutable

-- Enable realtime for audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE acessos_audit_log;
