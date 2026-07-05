/*
  # Fix Infinite Recursion in Usuarios Table with SECURITY DEFINER Function

  ## Problem
  The "Admins: Full access to usuarios" policy causes infinite recursion because:
  - Policy on usuarios table queries the usuarios table itself
  - This creates an infinite loop: Query → Policy Check → Query usuarios → Policy Check...

  ## Solution
  1. **Create SECURITY DEFINER function** that bypasses RLS to check admin status
  2. **Update usuarios policies** to use this function instead of direct table queries
  3. **Keep other optimizations** on all other tables intact

  ## Changes
  1. Create `is_admin_in_empresa()` function with SECURITY DEFINER
  2. Drop and recreate all usuarios table policies using the function
  3. Ensure simple policies (read/update own data) use direct auth.uid()

  ## Security Notes
  - SECURITY DEFINER function is safe because it only returns boolean/uuid
  - No user data is exposed, only admin status verification
  - All security logic is preserved, just executed differently
*/

-- Create SECURITY DEFINER function to check if current user is admin
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_in_empresa(check_empresa_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if current user is admin
  -- If check_empresa_id is provided, also verify they belong to that empresa
  RETURN EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
      AND usuarios.active = true
      AND (check_empresa_id IS NULL OR usuarios.empresa_id = check_empresa_id)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_in_empresa(uuid) TO authenticated;

-- Drop all existing policies on usuarios table
DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can delete own data" ON public.usuarios;

-- Create simple policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create simple policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create admin policy using SECURITY DEFINER function (no recursion!)
CREATE POLICY "Admins can read all users in empresa"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data OR if they're admin in the same empresa
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for updates
CREATE POLICY "Admins can update users in empresa"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own data OR if they're admin in the same empresa
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  )
  WITH CHECK (
    -- Same check for the new values
    id = auth.uid()
    OR is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for inserts
CREATE POLICY "Admins can insert users in empresa"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create users in their empresa
    is_admin_in_empresa(empresa_id)
  );

-- Create admin policy for deletes
CREATE POLICY "Admins can delete users in empresa"
  ON public.usuarios
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete users in their empresa (but not themselves)
    id != auth.uid()
    AND is_admin_in_empresa(empresa_id)
  );

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin_in_empresa(uuid) IS
  'SECURITY DEFINER function to check if current user is admin. Bypasses RLS to prevent infinite recursion when checking admin status in usuarios table policies.';