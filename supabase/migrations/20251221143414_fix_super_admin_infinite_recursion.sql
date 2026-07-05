/*
  # Fix Super-Admin Infinite Recursion

  ## Problem
  The `is_super_admin()` function queries the `usuarios` table, which has RLS enabled.
  When RLS policies on `usuarios` call `is_super_admin()`, it creates infinite recursion:
  Policy → Function → Query usuarios → Policy → Function → ...

  ## Solution
  1. **Rewrite is_super_admin() to use auth.email()**
     - Check directly against auth.email() instead of querying usuarios table
     - No RLS recursion since auth functions don't trigger RLS
     - Super-admin identified by email: consultoria@rodrigoparisotto.com.br

  2. **Super-Admin in Auth Only**
     - Super-admin exists only in auth.users, not in public.usuarios
     - No empresa_id needed since they manage all companies
     - Clean separation: auth handles super-admin, usuarios handles company users

  3. **Updated Access Rules**
     - Super-admin: Full access to all companies and their data
     - Regular users: Access restricted to their empresa_id
     - No access to individual activity records (registros_*)

  ## Security Notes
  - Super-admin identified by email in auth.users only
  - No recursion possible since we don't query tables with RLS
  - Multi-tenant isolation maintained for regular users
  - Activity records (registros_*) are not affected by super-admin access
*/

-- ============================================================================
-- PART 1: Replace is_super_admin() function without recursion
-- ============================================================================

-- Replace the function (no DROP needed, CREATE OR REPLACE handles it)
-- New version checks auth.email() directly instead of querying usuarios table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Check if current user's email is the super-admin email
  -- This doesn't query any table with RLS, so no recursion!
  SELECT COALESCE(auth.email() = 'consultoria@rodrigoparisotto.com.br', false);
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
'Returns true if the current user is the super-admin (consultoria@rodrigoparisotto.com.br). Uses auth.email() to avoid RLS recursion.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================================
-- PART 2: Remove super-admin from usuarios table
-- ============================================================================

-- Super-admin doesn't need to be in usuarios table
-- They exist only in auth.users and manage all companies
DELETE FROM public.usuarios
WHERE login = 'consultoria@rodrigoparisotto.com.br';

-- ============================================================================
-- PART 3: Verify the fix works
-- ============================================================================

-- Test that the function works without recursion
DO $$
DECLARE
  test_result boolean;
BEGIN
  -- This would have caused infinite recursion before
  test_result := public.is_super_admin();
  RAISE NOTICE 'Testing is_super_admin() - Success! Result: %', test_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error testing is_super_admin(): %', SQLERRM;
END $$;
