/*
  # Criar tabela de fotos da camararia

  1. New Tables
    - `fotos_camararia`
      - `id` (uuid, primary key)
      - `titulo` (text, título da foto)
      - `descricao` (text, descrição da foto)
      - `url_externa` (text, link externo da foto)
      - `ativo` (boolean, se a foto está ativa)
      - `ordem` (integer, ordem de exibição)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `fotos_camararia` table
    - Add policy for authenticated users to read
    - Add policy for admins and camararia users to modify
*/

CREATE TABLE IF NOT EXISTS public.fotos_camararia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text DEFAULT '',
  url_externa text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fotos_camararia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler fotos de camararia"
  ON public.fotos_camararia
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e camararia podem modificar fotos de camararia"
  ON public.fotos_camararia
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE
        (usuarios.id = auth.uid()) AND
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
        (usuarios.profile IN ('admin', 'camararia')) AND
        (usuarios.active = true)
    )
  );

CREATE TRIGGER update_fotos_camararia_updated_at
  BEFORE UPDATE ON public.fotos_camararia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_ativo ON public.fotos_camararia USING btree (ativo);
CREATE INDEX IF NOT EXISTS idx_fotos_camararia_ordem ON public.fotos_camararia USING btree (ordem);