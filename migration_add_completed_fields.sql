-- Add completed_at and completed_by columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_by VARCHAR;

-- Add comment to explain the columns
COMMENT ON COLUMN appointments.completed_at IS 'Timestamp when appointment was marked as completed';
COMMENT ON COLUMN appointments.completed_by IS 'User ID of the person who marked the appointment as completed (doctor/admin)';
