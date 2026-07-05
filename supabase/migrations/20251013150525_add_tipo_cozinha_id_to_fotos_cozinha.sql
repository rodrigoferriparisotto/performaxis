/*
  # Add tipo_cozinha_id to fotos_cozinha table

  1. Changes
    - Add `tipo_cozinha_id` column to `fotos_cozinha` table
      - uuid, nullable (optional)
      - Foreign key reference to `tipos_cozinha(id)`
      - ON DELETE SET NULL to preserve photos if type is deleted
    
  2. Performance
    - Create index on `tipo_cozinha_id` for faster queries and joins
    
  3. Notes
    - Column is nullable to allow photos without a specific type
    - Existing photos will have NULL value for tipo_cozinha_id
    - Users can optionally associate photos with a kitchen type
*/

-- Add tipo_cozinha_id column to fotos_cozinha table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fotos_cozinha' AND column_name = 'tipo_cozinha_id'
  ) THEN
    ALTER TABLE public.fotos_cozinha 
    ADD COLUMN tipo_cozinha_id uuid REFERENCES public.tipos_cozinha(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance on joins and filters
CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_tipo_cozinha_id 
ON public.fotos_cozinha USING btree (tipo_cozinha_id);