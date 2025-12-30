-- Migration: Add pharmacist-specific fields to prescriptions table
-- Description: Adds fields for pharmacist dispensing workflow including notes, substitutions, and counseling

-- Add pharmacist notes field
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS pharmacist_notes TEXT;

-- Add substituted medications field (stores JSON of medication substitutions)
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS substituted_medications TEXT;

-- Add counseling notes field
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS counseling_notes TEXT;

-- Add diagnosis field if not exists
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS diagnosis TEXT;

-- Add special instructions field if not exists
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add scanned count field if not exists
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS scanned_count INTEGER DEFAULT 0;

-- Add last scanned at timestamp
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;

-- Add last scanned by pharmacist reference
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS last_scanned_by INTEGER REFERENCES pharmacists(id);

-- Add dispensed by pharmacist reference
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS dispensed_by INTEGER REFERENCES pharmacists(id);

-- Add dispensed at timestamp
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP;

-- Update status column to use new status values if needed
-- Status values: 'issued', 'dispensed', 'expired', 'cancelled'
ALTER TABLE prescriptions 
ALTER COLUMN status TYPE VARCHAR(20);

-- Create index for faster QR code lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_qr_code ON prescriptions(qr_code);

-- Create index for pharmacist queries
CREATE INDEX IF NOT EXISTS idx_prescriptions_last_scanned_by ON prescriptions(last_scanned_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_by ON prescriptions(dispensed_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

COMMENT ON COLUMN prescriptions.pharmacist_notes IS 'Dispensing instructions and notes from pharmacist';
COMMENT ON COLUMN prescriptions.substituted_medications IS 'JSON string of medication substitutions made during dispensing';
COMMENT ON COLUMN prescriptions.counseling_notes IS 'Patient counseling notes provided by pharmacist';
COMMENT ON COLUMN prescriptions.last_scanned_by IS 'Last pharmacist who scanned this prescription';
COMMENT ON COLUMN prescriptions.dispensed_by IS 'Pharmacist who dispensed the prescription';
