/*
  # Create Notifications Freshness Tracking Table

  1. New Tables
    - `notificacoes_freshness`
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, references usuarios)
      - `empresa_id` (uuid, references empresas)
      - `modulo` (text) - Module name (recepcao, camararia, revisao, etc)
      - `nivel_urgencia` (text) - Urgency level (lembrete, moderado, critico)
      - `enviada_em` (timestamptz) - When notification was sent
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `notificacoes_freshness` table
    - Add policy for users to manage their own notification records
    - Add policy for admin/gestor to view all notifications

  3. Indexes
    - Index on usuario_id for fast lookups
    - Index on enviada_em for time-based queries
    - Composite index on (usuario_id, modulo, enviada_em) for freshness checks
*/

CREATE TABLE IF NOT EXISTS notificacoes_freshness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  nivel_urgencia text NOT NULL CHECK (nivel_urgencia IN ('lembrete', 'moderado', 'critico')),
  enviada_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notificacoes_freshness ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own notification records
CREATE POLICY "Users can view own notification records"
  ON notificacoes_freshness
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own notification records"
  ON notificacoes_freshness
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Admin and gestor can view all notifications in their company
CREATE POLICY "Admin and gestor can view all company notification records"
  ON notificacoes_freshness
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = notificacoes_freshness.empresa_id
      AND usuarios.profile IN ('admin', 'gestor')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_freshness_usuario_id 
  ON notificacoes_freshness(usuario_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_freshness_enviada_em 
  ON notificacoes_freshness(enviada_em);

CREATE INDEX IF NOT EXISTS idx_notificacoes_freshness_lookup 
  ON notificacoes_freshness(usuario_id, modulo, enviada_em DESC);