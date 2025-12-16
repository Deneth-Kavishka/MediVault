-- Migration: Add place_id column to doctor_availability table
-- Date: 2025-12-16

-- Add place_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctor_availability' 
    AND column_name = 'place_id'
  ) THEN
    ALTER TABLE doctor_availability 
    ADD COLUMN place_id VARCHAR;
  END IF;
END $$;

-- Update available_date column to be timestamp if it's not already
-- This ensures compatibility with the date-based scheduling
ALTER TABLE doctor_availability 
ALTER COLUMN available_date TYPE TIMESTAMP 
USING available_date::TIMESTAMP;

-- Create index on available_date for faster queries
CREATE INDEX IF NOT EXISTS idx_doctor_availability_date 
ON doctor_availability(available_date);

-- Create index on place_id for location lookups
CREATE INDEX IF NOT EXISTS idx_doctor_availability_place_id 
ON doctor_availability(place_id);
