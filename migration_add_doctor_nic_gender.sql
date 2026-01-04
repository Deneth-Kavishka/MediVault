-- Add NIC + gender fields for doctors
-- Keeps columns nullable to avoid breaking existing data.

ALTER TABLE doctors
	ADD COLUMN IF NOT EXISTS nic VARCHAR;

ALTER TABLE doctors
	ADD COLUMN IF NOT EXISTS gender VARCHAR;

-- Ensure NIC is unique when provided (Postgres unique allows multiple NULLs).
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'doctors_nic_unique'
	) THEN
		ALTER TABLE doctors
			ADD CONSTRAINT doctors_nic_unique UNIQUE (nic);
	END IF;
END $$;
