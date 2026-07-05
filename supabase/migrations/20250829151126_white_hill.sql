/*
  # Add 'programado' status to registro_status_enum

  1. Database Changes
    - Add 'programado' as a valid value to the registro_status_enum
    - This allows records to be created with 'programado' status for scheduling purposes

  2. Security
    - No RLS changes needed as this only extends an existing enum

  3. Notes
    - This change affects all tables using registro_status_enum:
      - registros_camararia
      - registros_recepcao
      - registros_revisao
      - registros_areas_comuns
      - registros_gestao
      - registros_diurnas
*/

-- Add 'programado' to the registro_status_enum
ALTER TYPE registro_status_enum ADD VALUE IF NOT EXISTS 'programado';