/*
  # Add Battery Optimization Configuration Tracking

  1. Changes
    - Add `battery_optimization_configured` column to `usuarios` table
      - Type: boolean
      - Default: false
      - Tracks if user confirmed battery optimization setup on Android
  
  2. Purpose
    - Store user confirmation that they configured battery optimization
    - Used to prevent showing educational modal repeatedly
    - Only relevant for Android users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'battery_optimization_configured'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN battery_optimization_configured boolean DEFAULT false NOT NULL;
  END IF;
END $$;
