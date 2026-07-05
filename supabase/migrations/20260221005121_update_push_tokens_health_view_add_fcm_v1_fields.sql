/*
  # Update push_tokens_health view to include FCM v1 fields

  1. Changes
    - Drop existing view
    - Recreate with `api_version` column
    - Add `fcm_error_code` column
    - Add `device_info` column for better debugging
    - Include all new fields from FCM v1 migration
  
  2. Benefits
    - Better monitoring and analytics of FCM v1 tokens
    - Track which API version is in use per token
    - View specific FCM error codes for debugging
    - Complete visibility of token health status
*/

-- Drop existing view
DROP VIEW IF EXISTS push_tokens_health;

-- Recreate the view with new FCM v1 fields
CREATE VIEW push_tokens_health AS
SELECT 
  pt.id,
  pt.usuario_id,
  u.name as usuario_nome,
  u.empresa_id,
  pt.token,
  pt.is_active,
  pt.error_count,
  pt.last_error,
  pt.last_success_at,
  pt.api_version,
  pt.fcm_error_code,
  pt.device_info,
  pt.created_at,
  pt.updated_at,
  pt.last_used_at,
  CASE 
    WHEN pt.error_count = 0 THEN 'healthy'
    WHEN pt.error_count < 3 THEN 'warning'
    WHEN pt.error_count < 5 THEN 'critical'
    ELSE 'failed'
  END as health_status,
  CASE
    WHEN NOT pt.is_active THEN 'inactive'
    WHEN pt.last_success_at IS NULL THEN 'never_sent'
    WHEN pt.last_success_at > now() - interval '7 days' THEN 'active'
    WHEN pt.last_success_at > now() - interval '30 days' THEN 'stale'
    ELSE 'very_stale'
  END as activity_status
FROM push_tokens pt
LEFT JOIN usuarios u ON u.id = pt.usuario_id
ORDER BY pt.updated_at DESC;
