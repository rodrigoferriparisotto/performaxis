/*
  # Add tipos_extras column to atividades table

  1. Changes
    - Add `tipos_extras` column to `atividades` table
    - Column type: jsonb (to store array of UUIDs)
    - Default value: empty array
    - Add GIN index for performance on jsonb queries

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing table permissions
*/

-- Add tipos_extras column to atividades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_extras'
  ) THEN
    ALTER TABLE public.atividades ADD COLUMN tipos_extras jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add GIN index for performance on tipos_extras jsonb column
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_extras 
ON public.atividades USING gin (tipos_extras);