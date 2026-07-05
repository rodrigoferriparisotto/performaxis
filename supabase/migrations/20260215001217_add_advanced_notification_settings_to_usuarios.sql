/*
  # Add Advanced Notification Settings to Usuarios Table

  1. New Columns
    - `intensidade_vibracao` (text) - Vibration intensity: 'fraca', 'media', 'forte'
    - `volume_som` (integer) - Sound volume: 0-100
    - `tipo_som_preferido` (text) - Preferred sound type: 'info', 'warning', 'urgent', 'critical'
    - `tempo_minimo_badge_horas` (integer) - Minimum hours before showing in badge (default 0)

  2. Changes
    - Add columns to usuarios table with default values
    - Add check constraints for valid values
    - These settings integrate with notification and reminder systems

  3. Security
    - RLS policies already exist for usuarios table
    - Users can update their own notification preferences
*/

-- Add new columns for advanced notification settings
DO $$ 
BEGIN
  -- Add intensidade_vibracao column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'intensidade_vibracao'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN intensidade_vibracao text DEFAULT 'media';
    ALTER TABLE usuarios ADD CONSTRAINT intensidade_vibracao_check 
      CHECK (intensidade_vibracao IN ('fraca', 'media', 'forte'));
  END IF;

  -- Add volume_som column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'volume_som'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN volume_som integer DEFAULT 100;
    ALTER TABLE usuarios ADD CONSTRAINT volume_som_check 
      CHECK (volume_som >= 0 AND volume_som <= 100);
  END IF;

  -- Add tipo_som_preferido column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'tipo_som_preferido'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN tipo_som_preferido text DEFAULT 'warning';
    ALTER TABLE usuarios ADD CONSTRAINT tipo_som_preferido_check 
      CHECK (tipo_som_preferido IN ('info', 'warning', 'urgent', 'critical'));
  END IF;

  -- Add tempo_minimo_badge_horas column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'tempo_minimo_badge_horas'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN tempo_minimo_badge_horas integer DEFAULT 0;
    ALTER TABLE usuarios ADD CONSTRAINT tempo_minimo_badge_horas_check 
      CHECK (tempo_minimo_badge_horas >= 0);
  END IF;
END $$;