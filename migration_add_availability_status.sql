-- Migration: Add status and reactivation fields to doctor_availability table

-- Add status column (active, inactive, finished)
ALTER TABLE doctor_availability 
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active';

-- Add reactivation request tracking
ALTER TABLE doctor_availability 
ADD COLUMN IF NOT EXISTS reactivation_requested BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE doctor_availability 
ADD COLUMN IF NOT EXISTS reactivation_requested_at TIMESTAMP;

-- Update existing records to set status based on isActive and date
UPDATE doctor_availability 
SET status = CASE 
  WHEN available_date < CURRENT_DATE THEN 'finished'
  WHEN is_active = true THEN 'active'
  ELSE 'inactive'
END
WHERE status = 'active';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_availability_status ON doctor_availability(status);
CREATE INDEX IF NOT EXISTS idx_availability_reactivation ON doctor_availability(reactivation_requested);
