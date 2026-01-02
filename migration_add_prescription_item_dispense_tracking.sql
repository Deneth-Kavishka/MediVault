-- Add per-prescription-item dispense tracking
-- This enables pharmacists to mark each medicine as dispensed / not dispensed.

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'prescription_items'
			AND column_name = 'dispensed'
	) THEN
		ALTER TABLE prescription_items
			ADD COLUMN dispensed boolean NOT NULL DEFAULT false;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'prescription_items'
			AND column_name = 'dispensed_at'
	) THEN
		ALTER TABLE prescription_items
			ADD COLUMN dispensed_at timestamp;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'prescription_items'
			AND column_name = 'dispensed_by'
	) THEN
		ALTER TABLE prescription_items
			ADD COLUMN dispensed_by varchar;
	END IF;
END $$;

-- Optional FK to pharmacists(id) for integrity (only if pharmacists table exists)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_name = 'pharmacists'
	) THEN
		BEGIN
			ALTER TABLE prescription_items
				ADD CONSTRAINT prescription_items_dispensed_by_fkey
				FOREIGN KEY (dispensed_by)
				REFERENCES pharmacists(id);
		EXCEPTION
			WHEN duplicate_object THEN
				-- ignore
		END;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id
	ON prescription_items(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_items_dispensed
	ON prescription_items(dispensed);
