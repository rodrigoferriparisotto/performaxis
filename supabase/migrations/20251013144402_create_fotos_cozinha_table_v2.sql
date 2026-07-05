/*
  # Create fotos_cozinha table for kitchen reference photos

  1. New Tables
    - `fotos_cozinha`
      - `id` (uuid, primary key)
      - `titulo` (text, photo title)
      - `descricao` (text, photo description)
      - `url_externa` (text, external photo link)
      - `ativo` (boolean, whether photo is active)
      - `ordem` (integer, display order)
      - `empresa_id` (uuid, foreign key to empresas)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `fotos_cozinha` table
    - Add policy for authenticated users to read photos from their empresa
    - Add policy for admins and cozinha users to modify photos from their empresa

  3. Performance
    - Create indexes for ativo, ordem, and empresa_id fields
*/

CREATE TABLE IF NOT EXISTS public.fotos_cozinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text DEFAULT '',
  url_externa text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 1,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fotos_cozinha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler fotos de cozinha de sua empresa"
  ON public.fotos_cozinha
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.active = true)
    )
  );

CREATE POLICY "Admins e cozinha podem modificar fotos de cozinha de sua empresa"
  ON public.fotos_cozinha
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.profile IN ('admin', 'cozinha')) AND
        (usuarios.active = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
        (usuarios.empresa_id = fotos_cozinha.empresa_id) AND
        (usuarios.profile IN ('admin', 'cozinha')) AND
        (usuarios.active = true)
    )
  );

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_fotos_cozinha_updated_at'
  ) THEN
    CREATE TRIGGER update_fotos_cozinha_updated_at
      BEFORE UPDATE ON public.fotos_cozinha
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_ativo 
ON public.fotos_cozinha USING btree (ativo);

CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_ordem 
ON public.fotos_cozinha USING btree (ordem);

CREATE INDEX IF NOT EXISTS idx_fotos_cozinha_empresa_id 
ON public.fotos_cozinha USING btree (empresa_id);