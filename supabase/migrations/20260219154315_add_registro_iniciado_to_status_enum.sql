/*
  # Add registro_iniciado to status enum

  1. Changes
    - Add 'registro_iniciado' value to registro_status_enum type
    - This allows records to be saved with 'registro_iniciado' status
  
  2. Notes
    - New value is added before 'em_andamento' in the enum order
    - No data migration needed as this is a new value
*/

-- Add 'registro_iniciado' to the enum type
ALTER TYPE registro_status_enum ADD VALUE IF NOT EXISTS 'registro_iniciado' BEFORE 'em_andamento';