/*
  # Add modulo column to alertas_inatividade_marcacao

  1. Changes
    - Add `modulo` column to `alertas_inatividade_marcacao` table
      - VARCHAR type to store the module name where activity is being tracked
      - Allows tracking which module the user was working on when inactivity was detected
    
  2. Notes
    - This enables accurate redirection when user clicks on inactivity alerts
    - Helps with analytics and understanding user behavior by module
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alertas_inatividade_marcacao' AND column_name = 'modulo'
  ) THEN
    ALTER TABLE alertas_inatividade_marcacao ADD COLUMN modulo VARCHAR;
  END IF;
END $$;
