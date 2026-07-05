/*
  # Migrate Old Profile Enum Values to New Standardized Names

  1. Changes
    - Migrate users from `atividades_diurnas` → `atividades_extras`
    - Migrate users from `atividades_noturnas` → `atividades_diarias`
    - Add new enum values to `user_profile_enum` if they don't exist
    - Ensure data integrity by checking for existing users before removal

  2. Important Notes
    - This migration maintains backwards compatibility by updating existing data
    - Users with old profile values will be automatically migrated to new values
    - No data will be lost during this migration
    - The migration is idempotent and safe to run multiple times

  3. Security
    - No RLS changes required
    - Existing security policies will work with new enum values
*/

-- Step 1: Add new enum values if they don't exist
DO $$
BEGIN
  -- Add atividades_extras if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'atividades_extras'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_extras';
    RAISE NOTICE 'Added atividades_extras to user_profile_enum';
  END IF;

  -- Add atividades_diarias if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'atividades_diarias'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'atividades_diarias';
    RAISE NOTICE 'Added atividades_diarias to user_profile_enum';
  END IF;

  -- Add cozinha if it doesn't exist (should already exist from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cozinha'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'cozinha';
    RAISE NOTICE 'Added cozinha to user_profile_enum';
  END IF;

  -- Add vendas if it doesn't exist (should already exist from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'vendas'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_profile_enum')
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE IF NOT EXISTS 'vendas';
    RAISE NOTICE 'Added vendas to user_profile_enum';
  END IF;
END $$;

-- Step 2: Migrate users from old profile values to new ones
DO $$
DECLARE
  migrated_diurnas_count INTEGER;
  migrated_noturnas_count INTEGER;
BEGIN
  -- Migrate users from atividades_diurnas to atividades_extras
  UPDATE usuarios
  SET profile = 'atividades_extras'
  WHERE profile = 'atividades_diurnas';
  
  GET DIAGNOSTICS migrated_diurnas_count = ROW_COUNT;
  
  IF migrated_diurnas_count > 0 THEN
    RAISE NOTICE 'Migrated % users from atividades_diurnas to atividades_extras', migrated_diurnas_count;
  END IF;

  -- Migrate users from atividades_noturnas to atividades_diarias
  UPDATE usuarios
  SET profile = 'atividades_diarias'
  WHERE profile = 'atividades_noturnas';
  
  GET DIAGNOSTICS migrated_noturnas_count = ROW_COUNT;
  
  IF migrated_noturnas_count > 0 THEN
    RAISE NOTICE 'Migrated % users from atividades_noturnas to atividades_diarias', migrated_noturnas_count;
  END IF;

  -- Summary
  IF migrated_diurnas_count = 0 AND migrated_noturnas_count = 0 THEN
    RAISE NOTICE 'No users required migration - all profiles are already using new values';
  END IF;
END $$;

-- Step 3: Verify the migration
DO $$
DECLARE
  old_profile_count INTEGER;
BEGIN
  -- Check if any users still have old profile values
  SELECT COUNT(*) INTO old_profile_count
  FROM usuarios
  WHERE profile IN ('atividades_diurnas', 'atividades_noturnas');

  IF old_profile_count > 0 THEN
    RAISE WARNING 'Found % users with old profile values - this should not happen', old_profile_count;
  ELSE
    RAISE NOTICE 'Migration successful - no users found with old profile values';
  END IF;
END $$;
