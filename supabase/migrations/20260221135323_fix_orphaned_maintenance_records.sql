/*
  # Fix Orphaned Maintenance Records and Add Status Constraints

  1. Data Cleanup
    - Reset orphaned maintenance records (em_andamento/pausada without usuario_id) back to 'aberto' status
    - Clear invalid hora_inicio and pausas data for these records
  
  2. Status Transition Constraints
    - Add check constraint to ensure em_andamento and pausada status always have usuario_id
    - Add function to validate status transitions
    - Add trigger to enforce valid status changes
  
  3. Security
    - Ensure data integrity with proper constraints
    - Prevent future orphaned records
*/

-- Step 1: Fix existing orphaned maintenance records
UPDATE manutencoes
SET 
  status = 'aberto',
  hora_inicio = NULL,
  hora_fim = NULL,
  pausas = '[]'::jsonb,
  usuario_id = NULL
WHERE 
  status IN ('em_andamento', 'pausada') 
  AND usuario_id IS NULL;

-- Step 2: Add check constraint to prevent orphaned maintenance records
DO $$ 
BEGIN
  -- Drop constraint if it exists (for idempotency)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'manutencoes_status_requires_usuario'
  ) THEN
    ALTER TABLE manutencoes DROP CONSTRAINT manutencoes_status_requires_usuario;
  END IF;
  
  -- Add constraint
  ALTER TABLE manutencoes 
  ADD CONSTRAINT manutencoes_status_requires_usuario 
  CHECK (
    (status IN ('em_andamento', 'pausada') AND usuario_id IS NOT NULL) 
    OR 
    (status NOT IN ('em_andamento', 'pausada'))
  );
END $$;

-- Step 3: Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_manutencao_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If transitioning to em_andamento or pausada, require usuario_id
  IF NEW.status IN ('em_andamento', 'pausada') AND NEW.usuario_id IS NULL THEN
    RAISE EXCEPTION 'Status % requires usuario_id to be set', NEW.status;
  END IF;

  -- If changing from em_andamento or pausada to aberto, clear executor
  IF OLD.status IN ('em_andamento', 'pausada') AND NEW.status = 'aberto' THEN
    NEW.usuario_id := NULL;
    NEW.hora_inicio := NULL;
    NEW.hora_fim := NULL;
    NEW.pausas := '[]'::jsonb;
  END IF;

  -- If marking as concluida, ensure it was em_andamento
  IF NEW.status = 'concluida' AND OLD.status NOT IN ('em_andamento', 'pausada') THEN
    RAISE EXCEPTION 'Can only mark maintenance as concluida from em_andamento or pausada status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for status validation
DROP TRIGGER IF EXISTS trigger_validate_manutencao_status ON manutencoes;
CREATE TRIGGER trigger_validate_manutencao_status
  BEFORE UPDATE ON manutencoes
  FOR EACH ROW
  EXECUTE FUNCTION validate_manutencao_status_transition();

-- Step 5: Add index for better query performance on pending maintenance
CREATE INDEX IF NOT EXISTS idx_manutencoes_status_usuario 
ON manutencoes(status, usuario_id) 
WHERE status IN ('aberto', 'em_andamento', 'pausada');

-- Step 6: Create view for monitoring orphaned records (should always be empty now)
CREATE OR REPLACE VIEW view_manutencoes_orphaned AS
SELECT 
  m.id,
  m.local,
  m.descricao,
  m.status,
  m.usuario_id,
  m.created_at,
  s.name as solicitante_nome,
  s.profile as solicitante_profile
FROM manutencoes m
LEFT JOIN usuarios s ON m.solicitante_id = s.id
WHERE 
  m.status IN ('em_andamento', 'pausada') 
  AND m.usuario_id IS NULL
ORDER BY m.created_at DESC;
