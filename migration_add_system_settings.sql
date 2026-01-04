-- Migration: Add system_settings table
-- Description: Stores global system configuration settings
-- Date: 2024-12-28

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR NOT NULL DEFAULT 'MediVault Healthcare',
    system_email VARCHAR NOT NULL DEFAULT 'admin@medivault.com',
    system_phone VARCHAR,
    system_address TEXT,
    appointment_duration INTEGER DEFAULT 30,
    appointment_slot_interval INTEGER DEFAULT 15,
    max_appointments_per_day INTEGER DEFAULT 20,
    working_hours_start VARCHAR DEFAULT '09:00',
    working_hours_end VARCHAR DEFAULT '17:00',
    enable_email_notifications BOOLEAN DEFAULT TRUE,
    enable_sms_notifications BOOLEAN DEFAULT FALSE,
    enable_appointment_reminders BOOLEAN DEFAULT TRUE,
    reminder_hours_before INTEGER DEFAULT 24,
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    backup_frequency VARCHAR DEFAULT 'daily',
    session_timeout INTEGER DEFAULT 30,
    max_login_attempts INTEGER DEFAULT 5,
    enable_two_factor_auth BOOLEAN DEFAULT FALSE,
    data_retention_days INTEGER DEFAULT 365,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR
);

-- Insert default settings if table is empty
INSERT INTO system_settings (
    system_name,
    system_email,
    system_phone,
    system_address,
    appointment_duration,
    appointment_slot_interval,
    max_appointments_per_day,
    working_hours_start,
    working_hours_end,
    enable_email_notifications,
    enable_sms_notifications,
    enable_appointment_reminders,
    reminder_hours_before,
    auto_backup_enabled,
    backup_frequency,
    session_timeout,
    max_login_attempts,
    enable_two_factor_auth,
    data_retention_days
)
SELECT 
    'MediVault Healthcare',
    'admin@medivault.com',
    '+94 76 914 6080',
    '123 Healthcare Ave, Medical City',
    30,
    15,
    20,
    '09:00',
    '17:00',
    TRUE,
    FALSE,
    TRUE,
    24,
    TRUE,
    'daily',
    30,
    5,
    FALSE,
    365
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

-- Confirm migration
SELECT 'System settings table created and initialized successfully' AS status;
