/*
  # Create app_versions table for system update notifications

  1. New Tables
    - `app_versions`
      - `id` (uuid, primary key)
      - `version` (text) - Version number like "1.0.1"
      - `deployed_at` (timestamptz) - When this version was deployed
      - `created_at` (timestamptz) - When the record was created

  2. Security
    - Enable RLS on `app_versions` table
    - Add policy for public read access (all users can check version)
    - Add policy for admin insert (only admins can publish new versions)

  3. Realtime
    - Enable realtime replication for instant notifications
*/

-- Create the app_versions table
CREATE TABLE IF NOT EXISTS app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  deployed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read versions
CREATE POLICY "All authenticated users can read app versions"
  ON app_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert new versions
CREATE POLICY "Only admins can publish new versions"
  ON app_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- Create index for faster queries on version
CREATE INDEX IF NOT EXISTS idx_app_versions_deployed_at ON app_versions(deployed_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE app_versions;

-- Insert initial version
INSERT INTO app_versions (version, deployed_at)
VALUES ('1.0.0', now());