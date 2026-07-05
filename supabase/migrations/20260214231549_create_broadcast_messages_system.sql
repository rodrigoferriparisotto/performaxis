/*
  # Create broadcast messages system for admin announcements

  1. New Tables
    - `mensagens_broadcast`
      - `id` (uuid, primary key)
      - `titulo` (text) - Message title
      - `conteudo` (text) - Message content
      - `tipo` (text) - Message type: 'info', 'aviso', 'urgente'
      - `bloqueia_sistema` (boolean) - Whether message blocks system usage until read
      - `autor_id` (uuid) - User who created the message
      - `empresa_id` (uuid) - Company (for multi-tenancy)
      - `ativa` (boolean) - Whether message is still active
      - `created_at` (timestamptz) - When message was created
      - `updated_at` (timestamptz) - When message was last updated

    - `mensagens_broadcast_lidas`
      - `id` (uuid, primary key)
      - `mensagem_id` (uuid) - Reference to broadcast message
      - `usuario_id` (uuid) - User who read the message
      - `lida_em` (timestamptz) - When the message was read
      - Unique constraint on (mensagem_id, usuario_id)

  2. Security
    - Enable RLS on both tables
    - All authenticated users can read active broadcast messages
    - All authenticated users can mark messages as read (insert into lidas table)
    - Only admins and gestores can create broadcast messages
    - Users can only see read status for their own reads

  3. Indexes
    - Index on mensagens_broadcast (ativa, created_at)
    - Index on mensagens_broadcast_lidas (usuario_id, mensagem_id)
    - Index on mensagens_broadcast (empresa_id)

  4. Realtime
    - Enable realtime replication for instant notifications
*/

-- Create the mensagens_broadcast table
CREATE TABLE IF NOT EXISTS mensagens_broadcast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'aviso', 'urgente')),
  bloqueia_sistema boolean DEFAULT false,
  autor_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  ativa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create the mensagens_broadcast_lidas table
CREATE TABLE IF NOT EXISTS mensagens_broadcast_lidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid REFERENCES mensagens_broadcast(id) ON DELETE CASCADE NOT NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  lida_em timestamptz DEFAULT now(),
  UNIQUE(mensagem_id, usuario_id)
);

-- Enable Row Level Security
ALTER TABLE mensagens_broadcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_broadcast_lidas ENABLE ROW LEVEL SECURITY;

-- Policies for mensagens_broadcast

-- Policy: All authenticated users can read active broadcast messages from their company
CREATE POLICY "Users can read active broadcast messages from their company"
  ON mensagens_broadcast
  FOR SELECT
  TO authenticated
  USING (
    ativa = true
    AND (
      empresa_id IS NULL -- System-wide messages
      OR empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

-- Policy: Only admins and gestores can insert broadcast messages
CREATE POLICY "Admins and gestores can create broadcast messages"
  ON mensagens_broadcast
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  );

-- Policy: Only admins and gestores can update broadcast messages
CREATE POLICY "Admins and gestores can update broadcast messages"
  ON mensagens_broadcast
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  );

-- Policy: Only admins and gestores can delete broadcast messages
CREATE POLICY "Admins and gestores can delete broadcast messages"
  ON mensagens_broadcast
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND usuarios.empresa_id = mensagens_broadcast.empresa_id
    )
  );

-- Policies for mensagens_broadcast_lidas

-- Policy: Users can read their own read status
CREATE POLICY "Users can read their own read status"
  ON mensagens_broadcast_lidas
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Policy: Users can mark messages as read for themselves
CREATE POLICY "Users can mark messages as read"
  ON mensagens_broadcast_lidas
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Policy: Admins and gestores can view all read statuses for their company
CREATE POLICY "Admins and gestores can view all read statuses"
  ON mensagens_broadcast_lidas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile IN ('admin', 'gestor')
      AND EXISTS (
        SELECT 1 FROM mensagens_broadcast mb
        WHERE mb.id = mensagens_broadcast_lidas.mensagem_id
        AND mb.empresa_id = usuarios.empresa_id
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_ativa_created 
  ON mensagens_broadcast(ativa, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_empresa 
  ON mensagens_broadcast(empresa_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_usuario 
  ON mensagens_broadcast_lidas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_mensagem 
  ON mensagens_broadcast_lidas(mensagem_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_broadcast_lidas_usuario_mensagem 
  ON mensagens_broadcast_lidas(usuario_id, mensagem_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_broadcast;
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_broadcast_lidas;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mensagens_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER trigger_update_mensagens_broadcast_updated_at
  BEFORE UPDATE ON mensagens_broadcast
  FOR EACH ROW
  EXECUTE FUNCTION update_mensagens_broadcast_updated_at();