-- Add prescription scan tracking fields
ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS scanned_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_scanned_by VARCHAR,
ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dispensed_by VARCHAR;

-- Add comments
COMMENT ON COLUMN prescriptions.scanned_count IS 'Number of times the prescription QR code has been scanned';
COMMENT ON COLUMN prescriptions.last_scanned_at IS 'Timestamp of the last QR code scan';
COMMENT ON COLUMN prescriptions.last_scanned_by IS 'User ID of the pharmacist who last scanned';
COMMENT ON COLUMN prescriptions.dispensed_at IS 'Timestamp when prescription was dispensed';
COMMENT ON COLUMN prescriptions.dispensed_by IS 'User ID of the pharmacist who dispensed';
