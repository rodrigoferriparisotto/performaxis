/*
  # Add FCM v1 API fields to push_tokens table

  1. Changes
    - Add `api_version` column to track which API version is being used (default 'v1')
    - Add `fcm_error_code` column to store specific FCM error codes from v1 API
    - Add index on `is_active` and `error_count` for faster queries
    - Improve performance for token management queries

  2. Security
    - No RLS changes needed (existing policies remain)
    
  3. Notes
    - This migration supports the FCM Legacy to v1 API migration
    - Existing tokens will default to 'v1' api_version
    - fcm_error_code helps with debugging and monitoring token health
*/

-- Add api_version column to track FCM API version being used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'api_version'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN api_version varchar(10) DEFAULT 'v1';
  END IF;
END $$;

-- Add fcm_error_code column to store specific FCM v1 error codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'fcm_error_code'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN fcm_error_code varchar(50);
  END IF;
END $$;

-- Add composite index for faster queries on active tokens with low error counts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'push_tokens' AND indexname = 'idx_push_tokens_active_error_count'
  ) THEN
    CREATE INDEX idx_push_tokens_active_error_count ON push_tokens(is_active, error_count)
    WHERE is_active = true;
  END IF;
END $$;

-- Add index on fcm_error_code for analytics and monitoring
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'push_tokens' AND indexname = 'idx_push_tokens_fcm_error_code'
  ) THEN
    CREATE INDEX idx_push_tokens_fcm_error_code ON push_tokens(fcm_error_code)
    WHERE fcm_error_code IS NOT NULL;
  END IF;
END $$;

-- Update existing tokens to use v1 API version
UPDATE push_tokens SET api_version = 'v1' WHERE api_version IS NULL;
