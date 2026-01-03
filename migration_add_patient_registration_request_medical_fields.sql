-- Add additional medical fields to patient self-registration requests

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'patient_registration_requests'
			AND column_name = 'blood_type'
	) THEN
		ALTER TABLE patient_registration_requests
			ADD COLUMN blood_type VARCHAR;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'patient_registration_requests'
			AND column_name = 'allergies'
	) THEN
		ALTER TABLE patient_registration_requests
			ADD COLUMN allergies TEXT;
	END IF;
END $$;
