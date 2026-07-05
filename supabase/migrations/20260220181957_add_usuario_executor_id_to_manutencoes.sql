/*
  # Add usuario_executor_id to manutencoes table

  1. Changes
    - Add `usuario_executor_id` column to `manutencoes` table
      - Type: uuid (nullable)
      - References: usuarios(id)
      - Purpose: Track which user is executing/performing the maintenance task
      - Different from `usuario_id` (creator) and `solicitante_id` (requester)
    
  2. Indexes
    - Create index on `usuario_executor_id` for query performance
    
  3. Foreign Key Constraints
    - Add foreign key constraint to `usuarios` table with CASCADE on delete
    
  4. Notes
    - This column maintains consistency with other registro tables
    - Allows tracking the actual executor of maintenance tasks
    - Existing records will have NULL values (can be backfilled later if needed)
*/

-- Add usuario_executor_id column to manutencoes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manutencoes' AND column_name = 'usuario_executor_id'
  ) THEN
    ALTER TABLE manutencoes 
    ADD COLUMN usuario_executor_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'manutencoes_usuario_executor_id_fkey'
  ) THEN
    ALTER TABLE manutencoes
    ADD CONSTRAINT manutencoes_usuario_executor_id_fkey
    FOREIGN KEY (usuario_executor_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_manutencoes_usuario_executor_id 
ON manutencoes(usuario_executor_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN manutencoes.usuario_executor_id IS 
'ID do usuário que está executando/realizando a manutenção (diferente do criador ou solicitante)';
