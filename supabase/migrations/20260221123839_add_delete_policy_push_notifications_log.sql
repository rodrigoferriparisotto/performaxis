/*
  # Add DELETE Policy for Push Notifications Log

  1. Changes
    - Add DELETE policy to `push_notifications_log` table
    - Only admin users can delete push notification logs
  
  2. Security
    - Ensures only admin users can delete push notification logs
    - Required for broadcast message deletion functionality
*/

-- Policy: Admin can delete push logs
CREATE POLICY "Admin can delete push logs"
  ON push_notifications_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );
