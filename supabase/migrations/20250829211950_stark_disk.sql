/*
  # Add tipo_atividade_id column to registros_noturnas table

  1. Changes
    - Add `tipo_atividade_id` column to `registros_noturnas` table
    - Set as nullable UUID column
    - Add foreign key constraint to `tipos_atividades` table
    - Add index for performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add the tipo_atividade_id column to registros_noturnas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_noturnas' AND column_name = 'tipo_atividade_id'
  ) THEN
    ALTER TABLE registros_noturnas ADD COLUMN tipo_atividade_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_noturnas_tipo_atividade_id_fkey'
  ) THEN
    ALTER TABLE registros_noturnas 
    ADD CONSTRAINT registros_noturnas_tipo_atividade_id_fkey 
    FOREIGN KEY (tipo_atividade_id) REFERENCES tipos_atividades(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_registros_noturnas_tipo_atividade'
  ) THEN
    CREATE INDEX idx_registros_noturnas_tipo_atividade ON registros_noturnas USING btree (tipo_atividade_id);
  END IF;
END $$;