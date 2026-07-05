/*
  # Add Modulos Contratados to Empresas Table

  1. Changes
    - Add `modulos_contratados` JSONB field to `empresas` table
    - Add GIN index for optimized JSONB queries
    - Set default value (all modules) for existing companies
    - Add check constraint to ensure array structure

  2. Available Modules
    - atividades_diarias (Atividades Diárias)
    - recepcao (Recepção)
    - areas_comuns (Áreas Comuns)
    - camararia (Camararia)
    - revisao (Revisão)
    - cozinha (Cozinha)
    - gestao (Gestão)
    - vendas (Vendas)
    - atividades_extras (Atividades Extras)

  3. Always Active Modules (non-contractable)
    - manutencao (Manutenção)
    - relatorios (Relatórios)

  4. Notes
    - Empty/null modulos_contratados = all modules active (backward compatibility)
    - Existing companies will get all modules by default
    - Only super_admin can modify this field (enforced by RLS in next migration)
*/

-- Add modulos_contratados column to empresas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'modulos_contratados'
  ) THEN
    ALTER TABLE empresas ADD COLUMN modulos_contratados JSONB DEFAULT '["atividades_diarias", "recepcao", "areas_comuns", "camararia", "revisao", "cozinha", "gestao", "vendas", "atividades_extras"]'::jsonb;
  END IF;
END $$;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_empresas_modulos_contratados ON empresas USING GIN (modulos_contratados);

-- Update existing companies to have all modules if null
UPDATE empresas 
SET modulos_contratados = '["atividades_diarias", "recepcao", "areas_comuns", "camararia", "revisao", "cozinha", "gestao", "vendas", "atividades_extras"]'::jsonb
WHERE modulos_contratados IS NULL;

-- Add check constraint to ensure it's an array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_modulos_contratados_is_array'
  ) THEN
    ALTER TABLE empresas ADD CONSTRAINT empresas_modulos_contratados_is_array 
    CHECK (jsonb_typeof(modulos_contratados) = 'array');
  END IF;
END $$;