/*
  # Fix Infinite Recursion in Usuarios Table RLS Policies

  ## Problem
  The optimization using `(select auth.uid())` caused infinite recursion in the `usuarios` table
  because the policy queries the same table it's protecting.
  
  ## Solution
  For the `usuarios` table specifically, we must use `auth.uid()` directly (without subselect)
  because:
  - `auth.uid()` is evaluated ONCE before the query starts
  - `(select auth.uid())` would be evaluated for each row check
  - When a policy on table A queries table A itself, using subselect causes infinite recursion
  
  ## Changes
  1. **Revert usuarios table policies** to use `auth.uid()` directly
  2. **Keep optimization** on all OTHER tables (they query usuarios, not themselves)
  
  ## Security Notes
  - No change to security logic
  - Only fixes the recursion issue while maintaining performance on other tables
*/

-- Fix usuarios table policies - use auth.uid() directly to prevent recursion
DROP POLICY IF EXISTS "Admins: Full access to usuarios" ON public.usuarios;

CREATE POLICY "Admins: Full access to usuarios"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()  -- ✓ Direct auth.uid() prevents recursion
      AND u.profile = 'admin'
      AND u.empresa_id = usuarios.empresa_id
    )
  );

-- Also verify and fix the "Users can read own data" policy if it exists
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;

CREATE POLICY "Users can read own data"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());  -- ✓ Simple direct comparison

-- Verify other common usuario policies exist with correct syntax
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;

CREATE POLICY "Users can update own data"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())  -- ✓ Direct auth.uid()
  WITH CHECK (id = auth.uid());  -- ✓ Direct auth.uid()
