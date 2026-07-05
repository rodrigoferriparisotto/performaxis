/*
  # Add empresa_id field to fotos_camararia table

  1. Changes
    - Add `empresa_id` (uuid, foreign key to empresas table) to `fotos_camararia`
    - Set NOT NULL with a default to handle existing records
    - Create index for better query performance
    - Update RLS policies to filter by empresa_id

  2. Security
    - Update existing policies to check empresa_id matches user's empresa_id
    - Ensure multi-tenant data isolation
*/

-- Add empresa_id column to fotos_camararia table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fotos_camararia' AND column_name = 'empresa_id'
  ) THEN
    -- First, get the first empresa_id to use as default (for existing records)
    -- This assumes at least one empresa exists
    ALTER TABLE public.fotos_camararia 
    ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
    
    -- Update existing records to use the first empresa's id
    UPDATE public.fotos_camararia 
    SET empresa_id = (SELECT id FROM public.empresas LIMIT 1)
    WHERE empresa_id IS NULL;
    
    -- Now make it NOT NULL
    ALTER TABLE public.fotos_camararia 
    ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_empresa_id 
ON public.fotos_camararia USING btree (empresa_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários autenticados podem ler fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia" ON public.fotos_camararia;

-- Recreate policies with empresa_id filtering
CREATE POLICY "Usuários autenticados podem ler fotos de camararia de sua empresa"
  ON public.fotos_camararia
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.active = true)
    )
  );

CREATE POLICY "Admins e camararia podem modificar fotos de camararia de sua empresa"
  ON public.fotos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_camararia.empresa_id) AND
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  );