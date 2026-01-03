-- Adds publish + availability scheduling support for lab facilities
-- Safe to run multiple times.

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'lab_facilities'
			AND column_name = 'is_published'
	) THEN
		ALTER TABLE lab_facilities
			ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'lab_facilities'
			AND column_name = 'is_available'
	) THEN
		ALTER TABLE lab_facilities
			ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'lab_facilities'
			AND column_name = 'availability_schedule'
	) THEN
		ALTER TABLE lab_facilities
			ADD COLUMN availability_schedule TEXT;
	END IF;
END $$;

-- Helpful index for filtering visible labs
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_indexes
		WHERE tablename = 'lab_facilities'
			AND indexname = 'idx_lab_facilities_visibility'
	) THEN
		CREATE INDEX idx_lab_facilities_visibility
			ON lab_facilities (is_active, is_published, is_available);
	END IF;
END $$;
