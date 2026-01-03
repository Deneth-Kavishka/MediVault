-- Add lab test report file storage metadata
-- Keeps result_file_url as a public, app-served URL (e.g. /api/lab-tests/:id/report)
-- Stores the actual on-disk path + metadata separately for secure access control.

ALTER TABLE lab_tests
  ADD COLUMN IF NOT EXISTS result_file_path TEXT,
  ADD COLUMN IF NOT EXISTS result_file_name VARCHAR,
  ADD COLUMN IF NOT EXISTS result_file_mime VARCHAR,
  ADD COLUMN IF NOT EXISTS result_file_size INTEGER;
