-- Add profile change requests table for sensitive field updates
-- This supports: user requests -> admin approve/reject -> apply DB update + email

CREATE TABLE IF NOT EXISTS profile_change_requests (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id VARCHAR NOT NULL REFERENCES users(id),
  role            VARCHAR NOT NULL,
  field           VARCHAR NOT NULL,
  old_value       TEXT,
  new_value       TEXT NOT NULL,
  reason          TEXT,
  status          VARCHAR NOT NULL DEFAULT 'pending',
  reviewed_by     VARCHAR REFERENCES users(id),
  reviewed_at     TIMESTAMP,
  admin_notes     TEXT,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

-- Basic indexes for admin queues and user history
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status
  ON profile_change_requests(status);

CREATE INDEX IF NOT EXISTS idx_profile_change_requests_requester
  ON profile_change_requests(requester_user_id);

CREATE INDEX IF NOT EXISTS idx_profile_change_requests_created_at
  ON profile_change_requests(created_at);
