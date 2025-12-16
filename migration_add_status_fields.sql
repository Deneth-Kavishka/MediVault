-- Migration: Add comprehensive status tracking fields to doctor_availability
-- Date: 2025-12-16
-- Purpose: Add deletedAt, deletedBy, deactivatedBy, and deactivatedAt fields for full status lifecycle management

-- Add new columns if they don't exist
ALTER TABLE doctor_availability 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS deactivated_by VARCHAR(20),
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;

-- Update existing records: ensure status reflects is_active correctly
UPDATE doctor_availability 
SET status = CASE 
    WHEN is_active = true THEN 'active'
    WHEN is_active = false THEN 'inactive'
    ELSE 'active'
END
WHERE status IS NULL OR status = '';

-- Update finished status for past availabilities
UPDATE doctor_availability 
SET status = 'finished'
WHERE available_date < CURRENT_DATE 
  AND status NOT IN ('deleted', 'finished');

-- Add comments for documentation
COMMENT ON COLUMN doctor_availability.deleted_at IS 'Timestamp when the availability was permanently deleted by doctor';
COMMENT ON COLUMN doctor_availability.deleted_by IS 'Who deleted the availability: doctor or admin';
COMMENT ON COLUMN doctor_availability.deactivated_by IS 'Who deactivated the availability (admin)';
COMMENT ON COLUMN doctor_availability.deactivated_at IS 'Timestamp when the availability was deactivated by admin';
COMMENT ON COLUMN doctor_availability.status IS 'Status: active, inactive, finished, deleted';
