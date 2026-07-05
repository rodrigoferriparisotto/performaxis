/*
  # Create User Version Tracking System

  1. New Tables
    - `usuarios_versoes_vistas`
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, references usuarios)
      - `versao_vista` (text, the version number seen)
      - `vista_em` (timestamptz, when user saw/updated to this version)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `usuarios_versoes_vistas` table
    - Add policy for users to read their own version history
    - Add policy for users to insert their own version records
    - Add policy for system to update version records

  3. Changes
    - Create unique index on (usuario_id, versao_vista) to prevent duplicates
    - Add foreign key constraint with cascade delete
    - Populate initial data for existing users with current system version
*/

-- Create the usuarios_versoes_vistas table
CREATE TABLE IF NOT EXISTS usuarios_versoes_vistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  versao_vista text NOT NULL,
  vista_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate version records per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_versoes_vistas_unique 
  ON usuarios_versoes_vistas(usuario_id, versao_vista);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_versoes_vistas_usuario_id 
  ON usuarios_versoes_vistas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_versoes_vistas_vista_em 
  ON usuarios_versoes_vistas(vista_em DESC);

-- Enable Row Level Security
ALTER TABLE usuarios_versoes_vistas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own version history
CREATE POLICY "Users can read own version history"
  ON usuarios_versoes_vistas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Policy: Users can insert their own version records
CREATE POLICY "Users can insert own version records"
  ON usuarios_versoes_vistas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Policy: Users can update their own version records
CREATE POLICY "Users can update own version records"
  ON usuarios_versoes_vistas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Populate initial data: mark all active users as having seen the current version
-- This prevents showing update modal to existing users for the current version
DO $$
DECLARE
  current_version text;
BEGIN
  -- Get the latest version from app_versions
  SELECT version INTO current_version
  FROM app_versions
  ORDER BY deployed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  -- If a version exists, populate for all active users
  IF current_version IS NOT NULL THEN
    INSERT INTO usuarios_versoes_vistas (usuario_id, versao_vista, vista_em)
    SELECT id, current_version, now()
    FROM usuarios
    WHERE active = true
    ON CONFLICT (usuario_id, versao_vista) DO NOTHING;
  END IF;
END $$;
