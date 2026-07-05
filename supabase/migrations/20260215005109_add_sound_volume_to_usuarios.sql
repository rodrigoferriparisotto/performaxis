/*
  # Add Sound Volume Configuration to Users

  1. Changes
    - Add `volume_notificacao_som` column to `usuarios` table
      - Type: decimal (0.0 to 1.0)
      - Default: 1.0 (maximum volume)
      - Allows users to customize notification sound volume
  
  2. Notes
    - Volume range: 0.0 (muted) to 1.0 (maximum)
    - Integrates with existing notification system
    - User preference persists across sessions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'volume_notificacao_som'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN volume_notificacao_som decimal(3,2) DEFAULT 1.0 CHECK (volume_notificacao_som >= 0 AND volume_notificacao_som <= 1.0);
  END IF;
END $$;