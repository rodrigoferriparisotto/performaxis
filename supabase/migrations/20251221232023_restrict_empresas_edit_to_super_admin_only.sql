/*
  # Restrict Empresas Edit Access to Super Admin Only

  1. Changes
    - Drop existing UPDATE policies for empresas table
    - Create new UPDATE policy that only allows super_admin to edit
    - Keep SELECT policies unchanged (admin, gestor can still view)
    - Keep INSERT policies unchanged (for initial company creation)

  2. Security
    - Only users with profile = 'super_admin' can UPDATE empresas records
    - This includes editing modulos_contratados field
    - Admin users can view but NOT edit company settings
    - Gestor users can view but NOT edit company settings

  3. Notes
    - Super admin has full control over all companies
    - Regular admin loses edit access but maintains view access
    - This ensures centralized control of module contracts
*/

-- Drop existing UPDATE policies for empresas if they exist
DROP POLICY IF EXISTS "Admins can update their company" ON empresas;
DROP POLICY IF EXISTS "Admin can update own company" ON empresas;
DROP POLICY IF EXISTS "Users can update their company" ON empresas;
DROP POLICY IF EXISTS "Only super admin can update empresas" ON empresas;

-- Create new UPDATE policy: only super_admin can edit
CREATE POLICY "Only super admin can update empresas"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'super_admin'
    )
  );