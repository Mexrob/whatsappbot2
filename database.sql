-- Create tables for Erika IA

-- 1. Clinic Settings
CREATE TABLE clinic_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    clinic_name TEXT NOT NULL,
    clinic_address TEXT,
    clinic_phone TEXT,
    clinic_email TEXT,
    working_hours JSONB, -- Store as JSON for flexibility
    services TEXT[], -- Array of services
    about_clinic TEXT,
    whatsapp_webhook_url TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City',
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Messages
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'assistant')),
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments
CREATE TABLE appointments (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    appointment_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Data
INSERT INTO clinic_settings (id, clinic_name, services)
VALUES (1, 'Erika Aesthetic Clinic', ARRAY['Limpieza Facial', 'Botox', 'Rellenos', 'Peeling']);

-- 4. Cron Job for Daily Reminders
-- Note: This requires pg_cron and pg_net extensions enabled in Supabase/Postgres
SELECT cron.schedule(
  'enviar-recordatorios-diarios',
  '0 8 * * *', -- Every day at 8:00 AM
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  ) AS request_id;
  $$
);
