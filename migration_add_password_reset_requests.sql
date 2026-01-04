-- Add password reset requests table for admin-approved password recovery
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  full_name VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  temporary_password VARCHAR, -- Hashed temporary password (set when approved)
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by VARCHAR REFERENCES users(id), -- Admin who processed the request
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_requested_at ON password_reset_requests(requested_at);
