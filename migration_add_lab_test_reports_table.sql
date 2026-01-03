-- Add lab test reports table (supports multiple uploaded report documents per test)

CREATE TABLE IF NOT EXISTS lab_test_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_test_id VARCHAR NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,

  file_path TEXT NOT NULL,
  file_name VARCHAR,
  file_mime VARCHAR,
  file_size INTEGER,

  uploaded_by_user_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_test_reports_lab_test_id
  ON lab_test_reports(lab_test_id);
