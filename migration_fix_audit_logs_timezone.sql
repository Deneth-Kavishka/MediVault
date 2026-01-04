
-- Fix audit_logs.created_at timezone handling.
--
-- Problem:
-- - created_at was a TIMESTAMP WITHOUT TIME ZONE.
-- - The JS driver may parse it as UTC, and then the UI formats it again for
--   Asia/Colombo, resulting in an incorrect +05:30 shift.
--
-- Solution:
-- - Convert audit_logs.created_at to TIMESTAMPTZ.
-- - Interpret existing values as Asia/Colombo local time during conversion.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'audit_logs'
			AND column_name = 'created_at'
			AND data_type = 'timestamp without time zone'
	) THEN
		ALTER TABLE public.audit_logs
			ALTER COLUMN created_at
			TYPE timestamptz
			USING created_at AT TIME ZONE 'Asia/Colombo';
	END IF;
END $$;

