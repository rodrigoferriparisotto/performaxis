/*
  # Update super_admin records to admin (Data Only)
  
  1. Data Migration
    - Update all existing usuarios records with profile = 'super_admin' to 'admin'
    - This is a safe operation that doesn't modify the enum type
  
  2. Important Notes
    - We're only updating data, not modifying the enum
    - The enum will still contain 'super_admin' but no records will use it
    - The application code has been updated to only use 'admin'
    - A future migration can clean up the enum if needed
*/

-- Update all existing super_admin users to admin
UPDATE usuarios
SET profile = 'admin'
WHERE profile = 'super_admin';

-- Verify the update
DO $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count
  FROM usuarios
  WHERE profile = 'super_admin';
  
  IF super_admin_count > 0 THEN
    RAISE EXCEPTION 'Still have % super_admin records after migration', super_admin_count;
  END IF;
  
  RAISE NOTICE 'Successfully migrated all super_admin users to admin';
END $$;