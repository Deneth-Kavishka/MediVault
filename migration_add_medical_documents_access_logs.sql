-- Migration: Add Medical Documents and Access Logs tables for RBAC
-- Created: 2025-12-27

-- ============================================================================
-- MEDICAL DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS medical_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id VARCHAR REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id VARCHAR REFERENCES appointments(id) ON DELETE SET NULL,
  medical_record_id VARCHAR REFERENCES medical_records(id) ON DELETE SET NULL,
  document_type VARCHAR NOT NULL CHECK (document_type IN ('lab_report', 'prescription', 'diagnosis', 'consultation_note', 'medical_image', 'other')),
  title VARCHAR NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx')),
  file_size INTEGER,
  uploaded_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by_role VARCHAR NOT NULL CHECK (uploaded_by_role IN ('doctor', 'patient', 'admin')),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_medical_documents_patient_id ON medical_documents(patient_id);
CREATE INDEX idx_medical_documents_doctor_id ON medical_documents(doctor_id);
CREATE INDEX idx_medical_documents_appointment_id ON medical_documents(appointment_id);
CREATE INDEX idx_medical_documents_document_type ON medical_documents(document_type);
CREATE INDEX idx_medical_documents_created_at ON medical_documents(created_at DESC);

-- ============================================================================
-- MEDICAL ACCESS LOGS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS medical_access_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role VARCHAR NOT NULL CHECK (user_role IN ('patient', 'doctor', 'pharmacist', 'lab_technician', 'admin')),
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  access_type VARCHAR NOT NULL CHECK (access_type IN ('view', 'download', 'upload', 'modify', 'delete')),
  resource_type VARCHAR NOT NULL CHECK (resource_type IN ('medical_record', 'document', 'prescription', 'lab_report', 'patient_info')),
  resource_id VARCHAR,
  ip_address VARCHAR,
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit queries
CREATE INDEX idx_medical_access_logs_user_id ON medical_access_logs(user_id);
CREATE INDEX idx_medical_access_logs_patient_id ON medical_access_logs(patient_id);
CREATE INDEX idx_medical_access_logs_access_type ON medical_access_logs(access_type);
CREATE INDEX idx_medical_access_logs_accessed_at ON medical_access_logs(accessed_at DESC);
CREATE INDEX idx_medical_access_logs_resource_type ON medical_access_logs(resource_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE medical_documents IS 'Stores all medical documents including lab reports, prescriptions, and medical files uploaded by doctors or patients';
COMMENT ON TABLE medical_access_logs IS 'Audit trail for all access to medical records and documents for compliance and security';

COMMENT ON COLUMN medical_documents.is_public IS 'If true, patient can view this document. Used for doctor-uploaded files that should be shared with patient';
COMMENT ON COLUMN medical_documents.uploaded_by_role IS 'Role of the user who uploaded the document for permission validation';
COMMENT ON COLUMN medical_access_logs.access_type IS 'Type of access: view, download, upload, modify, or delete';
COMMENT ON COLUMN medical_access_logs.resource_type IS 'Type of resource accessed for granular audit tracking';
