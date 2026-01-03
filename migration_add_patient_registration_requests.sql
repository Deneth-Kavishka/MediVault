-- Patient self-registration requests + force password change flag

-- 1) Force password change on first login
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'users'
			AND column_name = 'must_change_password'
	) THEN
		ALTER TABLE users
			ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
	END IF;
END $$;

-- 2) Patient registration requests table
CREATE TABLE IF NOT EXISTS patient_registration_requests (
	id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
	email VARCHAR NOT NULL UNIQUE,
	first_name VARCHAR NOT NULL,
	last_name VARCHAR NOT NULL,
	nic VARCHAR NOT NULL UNIQUE,
	date_of_birth TIMESTAMP,
	gender VARCHAR,
	contact_info VARCHAR,
	address TEXT,
	status VARCHAR NOT NULL DEFAULT 'pending',
	admin_notes TEXT,
	assigned_health_id VARCHAR,
	assigned_rfid VARCHAR,
	approved_user_id VARCHAR REFERENCES users(id),
	reviewed_by VARCHAR REFERENCES users(id),
	submitted_at TIMESTAMP DEFAULT now(),
	reviewed_at TIMESTAMP
);
