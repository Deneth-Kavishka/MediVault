-- Add Lab Facilities Table
CREATE TABLE IF NOT EXISTS lab_facilities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_technician_id VARCHAR REFERENCES lab_technicians(id),
  name VARCHAR NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  place_id VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  services_offered TEXT,
  operating_hours TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update Lab Tests Table with new columns
ALTER TABLE lab_tests 
ADD COLUMN IF NOT EXISTS lab_facility_id VARCHAR REFERENCES lab_facilities(id),
ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS sample_collection_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS test_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS technician_notes TEXT,
ADD COLUMN IF NOT EXISTS urgency VARCHAR DEFAULT 'normal';

-- Update status column to include 'approved' status
-- Note: This doesn't change the column type, just documents the new valid value

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_doctor_id ON lab_tests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_lab_facility_id ON lab_tests(lab_facility_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_lab_facilities_city ON lab_facilities(city);
CREATE INDEX IF NOT EXISTS idx_lab_facilities_is_active ON lab_facilities(is_active);
