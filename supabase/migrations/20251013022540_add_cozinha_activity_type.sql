/*
  # Add 'cozinha' to activity_type_enum
  
  1. Alterações
    - Adicionar o valor 'cozinha' ao enum activity_type_enum
    - Permite criar atividades do tipo cozinha
  
  2. Justificativa
    - O sistema precisa suportar atividades específicas da cozinha
    - Complementa a funcionalidade de tipos_cozinha já implementada
*/

-- Adicionar 'cozinha' ao enum activity_type_enum se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'cozinha' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'activity_type_enum'
    )
  ) THEN
    ALTER TYPE activity_type_enum ADD VALUE 'cozinha';
  END IF;
END $$;