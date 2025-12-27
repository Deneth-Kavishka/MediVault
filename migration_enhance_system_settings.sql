-- Migration: Add comprehensive system settings fields
-- Description: Enhances system_settings table with additional organization details
-- Date: 2024-12-28

-- Add new columns to system_settings table
ALTER TABLE system_settings 
  ADD COLUMN IF NOT EXISTS system_website VARCHAR,
  ADD COLUMN IF NOT EXISTS system_logo VARCHAR,
  ADD COLUMN IF NOT EXISTS system_description TEXT,
  ADD COLUMN IF NOT EXISTS license_number VARCHAR,
  ADD COLUMN IF NOT EXISTS established_year INTEGER,
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR,
  ADD COLUMN IF NOT EXISTS fax_number VARCHAR,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS working_days TEXT DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
  ADD COLUMN IF NOT EXISTS password_expiry_days INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS facebook_url VARCHAR,
  ADD COLUMN IF NOT EXISTS twitter_url VARCHAR,
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR,
  ADD COLUMN IF NOT EXISTS instagram_url VARCHAR;

-- Update existing records with default values for new fields
UPDATE system_settings 
SET 
  timezone = COALESCE(timezone, 'UTC'),
  currency = COALESCE(currency, 'USD'),
  language = COALESCE(language, 'en'),
  working_days = COALESCE(working_days, 'Monday,Tuesday,Wednesday,Thursday,Friday'),
  password_expiry_days = COALESCE(password_expiry_days, 90)
WHERE id IS NOT NULL;

-- Confirm migration
SELECT 'Enhanced system settings table with comprehensive organization fields' AS status;
