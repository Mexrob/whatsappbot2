const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clinic_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    clinic_name TEXT NOT NULL,
    clinic_address TEXT,
    clinic_phone TEXT,
    clinic_email TEXT,
    working_hours TEXT,
    services TEXT,
    about_clinic TEXT,
    whatsapp_webhook_url TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City'
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'assistant')),
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    appointment_date DATETIME NOT NULL,
    appointment_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    reminder_sent INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL
  );

  -- Seed initial data
  INSERT OR IGNORE INTO clinic_settings (id, clinic_name, services) 
  VALUES (1, 'Demo Clinic', 'Limpieza Facial, Botox, Rellenos, Peeling');

  INSERT OR IGNORE INTO users (email, password)
  VALUES ('admin@clinica.com', 'admin123');
`);

// Migration: Add bot_name if not exists
try {
  db.prepare("ALTER TABLE clinic_settings ADD COLUMN bot_name TEXT DEFAULT 'AI Assistant'").run();
} catch (error) {
  // Column likely already exists
}

module.exports = db;
