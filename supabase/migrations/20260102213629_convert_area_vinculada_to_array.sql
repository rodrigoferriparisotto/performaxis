/*
  # Convert area_vinculada to Multiple Areas Array

  ## Overview
  This migration converts the `area_vinculada` field from a single string value
  to an array of strings, allowing each access record to be linked to multiple areas.

  ## Changes
    1. Add temporary `areas_vinculadas` array column
    2. Migrate existing data from single value to array
    3. Remove old column and constraints
    4. Rename new column to original name
    5. Add array-based constraints and indexes

  ## Data Migration
    - All existing single area values will be preserved in array format
    - No data loss occurs during migration

  ## New Constraints
    - Array must not be empty (at least one area required)
    - All values in array must be valid area types
    - GIN index for efficient array queries
*/

-- Step 1: Add temporary array column
ALTER TABLE acessos 
ADD COLUMN IF NOT EXISTS areas_vinculadas text[];

-- Step 2: Migrate existing data (convert single value to array)
UPDATE acessos 
SET areas_vinculadas = ARRAY[area_vinculada]::text[]
WHERE areas_vinculadas IS NULL;

-- Step 3: Drop old constraint and column
ALTER TABLE acessos 
DROP CONSTRAINT IF EXISTS acessos_area_vinculada_check;

ALTER TABLE acessos 
DROP COLUMN IF EXISTS area_vinculada;

-- Step 4: Rename new column to original name
ALTER TABLE acessos 
RENAME COLUMN areas_vinculadas TO area_vinculada;

-- Step 5: Make column NOT NULL
ALTER TABLE acessos 
ALTER COLUMN area_vinculada SET NOT NULL;

-- Step 6: Add new constraints for array validation
-- Ensure array is not empty
ALTER TABLE acessos 
ADD CONSTRAINT acessos_area_vinculada_not_empty 
CHECK (array_length(area_vinculada, 1) > 0);

-- Ensure all values in array are valid area types
ALTER TABLE acessos 
ADD CONSTRAINT acessos_area_vinculada_valid_values 
CHECK (
  area_vinculada <@ ARRAY[
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
  ]::text[]
);

-- Step 7: Drop old index
DROP INDEX IF EXISTS idx_acessos_area_vinculada;

-- Step 8: Create GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_acessos_area_vinculada_gin 
ON acessos USING GIN (area_vinculada);

-- Add comment explaining the new structure
COMMENT ON COLUMN acessos.area_vinculada IS 
'Array of areas linked to this access. Must contain at least one valid area type.';