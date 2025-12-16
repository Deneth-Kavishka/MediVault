-- Add cancelled_by field to track who cancelled the appointment
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR;

-- Add comment for documentation
COMMENT ON COLUMN appointments.cancelled_by IS 'Who cancelled the appointment: patient, doctor, or admin';

-- Update existing cancelled appointments to set cancelled_by if cancellation_reason exists
-- Assume doctor cancelled if there's a cancellation_reason but no cancelled_by
UPDATE appointments
SET cancelled_by = 'doctor'
WHERE status = 'cancelled' 
AND cancellation_reason IS NOT NULL 
AND cancelled_by IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_by ON appointments(cancelled_by) WHERE status = 'cancelled';
