/*
  # Adicionar vinculação de tipos de gestão às atividades

  1. Schema Changes
    - Add `tipos_gestao` column to `atividades` table as JSONB array
    - Add index for performance on the new column

  2. Security
    - No changes to existing RLS policies

  3. Notes
    - Uses JSONB array to store multiple tipo_gestao IDs
    - Similar pattern to existing `tipos_recepcao` and `servicos_camararia` columns
*/

-- Add tipos_gestao column to atividades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atividades' AND column_name = 'tipos_gestao'
  ) THEN
    ALTER TABLE public.atividades ADD COLUMN tipos_gestao jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for performance on tipos_gestao column
CREATE INDEX IF NOT EXISTS idx_atividades_tipos_gestao 
ON public.atividades USING gin (tipos_gestao);

-- Add comment to the column
COMMENT ON COLUMN public.atividades.tipos_gestao IS 'Array de IDs dos tipos de gestão vinculados à atividade';