/*
  # Add Super Admin to User Profile Enum

  1. Changes
    - Add 'super_admin' value to user_profile_enum

  2. Notes
    - Super admin will have full control over all companies
    - Super admin can edit empresas including modulos_contratados
    - Must be assigned manually in database (not through UI initially)
    - This is the highest level of access in the system
*/

-- Add super_admin to user_profile_enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_admin' 
    AND enumtypid = 'user_profile_enum'::regtype
  ) THEN
    ALTER TYPE user_profile_enum ADD VALUE 'super_admin';
  END IF;
END $$;