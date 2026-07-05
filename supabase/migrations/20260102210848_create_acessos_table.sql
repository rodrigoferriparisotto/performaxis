/*
  # Create Acessos (Access Management) Table

  ## Overview
  This migration creates a comprehensive access credentials management system
  for storing and organizing login credentials, URLs, and access information.

  ## New Tables
    - `acessos`
      - `id` (uuid, primary key) - Unique identifier
      - `titulo` (text, required) - Title/name of the access
      - `login` (text, optional) - Username/login credential
      - `senha` (text, optional) - Password in plain text
      - `url_acesso` (text, optional) - URL for the access
      - `comentarios` (text, optional) - Additional comments/notes
      - `area_vinculada` (text, required) - Linked area/module
      - `empresa_id` (uuid, required) - Foreign key to empresas table
      - `ativo` (boolean, default true) - Active status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## Security
    - Enable RLS on `acessos` table
    - Add policies for authenticated users to manage their company's access records
    - Only admin and gestor profiles can access (enforced at application level)
    - Users can only see/manage records from their own company

  ## Indexes
    - Index on empresa_id for faster company-based queries
    - Index on area_vinculada for filtering by area
    - Index on ativo for filtering active records
*/

-- Create acessos table
CREATE TABLE IF NOT EXISTS acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  login text,
  senha text,
  url_acesso text,
  comentarios text,
  area_vinculada text NOT NULL CHECK (area_vinculada IN (
    'recepcao',
    'camararia',
    'revisao',
    'gestao',
    'vendas',
    'cozinha',
    'areas_comuns',
    'atividades_diarias',
    'atividades_extras',
    'manutencao',
    'geral'
  )),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_acessos_empresa_id ON acessos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_acessos_area_vinculada ON acessos(area_vinculada);
CREATE INDEX IF NOT EXISTS idx_acessos_ativo ON acessos(ativo);
CREATE INDEX IF NOT EXISTS idx_acessos_empresa_ativo ON acessos(empresa_id, ativo);

-- Enable Row Level Security
ALTER TABLE acessos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for acessos table

-- SELECT: Users can view acessos from their company
CREATE POLICY "Users can view company acessos"
  ON acessos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos.empresa_id
    )
  );

-- INSERT: Users can create acessos for their company
CREATE POLICY "Users can create company acessos"
  ON acessos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos.empresa_id
    )
  );

-- UPDATE: Users can update acessos from their company
CREATE POLICY "Users can update company acessos"
  ON acessos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos.empresa_id
    )
  );

-- DELETE: Users can delete acessos from their company
CREATE POLICY "Users can delete company acessos"
  ON acessos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.empresa_id = acessos.empresa_id
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_acessos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_acessos_updated_at_trigger
  BEFORE UPDATE ON acessos
  FOR EACH ROW
  EXECUTE FUNCTION update_acessos_updated_at();

-- Enable realtime for acessos table
ALTER PUBLICATION supabase_realtime ADD TABLE acessos;