-- Add enhanced completion fields to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS actual_visit_time VARCHAR,
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS prescription_needed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lab_tests_needed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN appointments.actual_visit_time IS 'Actual time the patient was seen by the doctor (HH:MM format)';
COMMENT ON COLUMN appointments.completion_notes IS 'Doctor notes from the visit including diagnosis and treatment plan';
COMMENT ON COLUMN appointments.prescription_needed IS 'Whether a prescription is required for this patient';
COMMENT ON COLUMN appointments.lab_tests_needed IS 'Whether lab tests are required for this patient';
