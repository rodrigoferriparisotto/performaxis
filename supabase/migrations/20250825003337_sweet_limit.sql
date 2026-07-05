/*
  # Adicionar coluna tipos_areas_comuns à tabela atividades

  1. Changes
    - Add `tipos_areas_comuns` column to `atividades` table
    - Column type: jsonb with default empty array
    - Add GIN index for performance

  2. Purpose
    - Link activities to specific area types
    - Support filtering activities by area type
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_areas_comuns'
  ) THEN
    ALTER TABLE atividades ADD COLUMN tipos_areas_comuns jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_areas_comuns ON atividades USING gin (tipos_areas_comuns);