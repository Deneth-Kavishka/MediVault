-- Add QR codes to existing prescriptions that don't have them
UPDATE prescriptions
SET 
  qr_code = 'RX-' || UPPER(SUBSTRING(id::text, 1, 8)) || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
  updated_at = NOW()
WHERE qr_code IS NULL OR qr_code = '';

-- Verify the update
SELECT 
  id,
  qr_code,
  status,
  date_issued
FROM prescriptions
ORDER BY date_issued DESC
LIMIT 10;
