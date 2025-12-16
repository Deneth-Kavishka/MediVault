-- Update prescriptions table to support appointment completion workflow
-- Add appointment_id and validity_days columns

ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS appointment_id VARCHAR REFERENCES appointments(id),
ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 90;

-- Add comment for documentation
COMMENT ON COLUMN prescriptions.appointment_id IS 'Links prescription to the appointment where it was created';
COMMENT ON COLUMN prescriptions.validity_days IS 'Number of days the prescription remains valid (default: 90 days)';

-- Update prescription_items table to support direct medicine names
-- Make medicine_id optional and add medicine_name field

ALTER TABLE prescription_items
ALTER COLUMN medicine_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS medicine_name VARCHAR;

-- Update existing records to have medicine_name from medicines table if linked
UPDATE prescription_items pi
SET medicine_name = m.name
FROM medicines m
WHERE pi.medicine_id = m.id AND pi.medicine_name IS NULL;

-- Make medicine_name required after migration
ALTER TABLE prescription_items
ALTER COLUMN medicine_name SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN prescription_items.medicine_id IS 'Optional link to medicines inventory table';
COMMENT ON COLUMN prescription_items.medicine_name IS 'Medicine name as written in prescription (required)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status ON prescriptions(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_expiry ON prescriptions(expiry_date) WHERE status = 'active';
