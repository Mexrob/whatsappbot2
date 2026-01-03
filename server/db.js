const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

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
    timezone TEXT DEFAULT 'America/Mexico_City',
    clinic_logo TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'assistant')),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    media_url TEXT,
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

  CREATE TABLE IF NOT EXISTS patients (
    phone_number TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_status (
    phone_number TEXT PRIMARY KEY,
    is_ai_paused INTEGER DEFAULT 0,
    chatwoot_conversation_id INTEGER
  );

  -- Seed initial data
  INSERT OR IGNORE INTO clinic_settings (id, clinic_name, services) 
  VALUES (1, 'Rom AI Bot', 'Limpieza Facial, Botox, Rellenos, Peeling');

  INSERT OR IGNORE INTO users (email, password)
  VALUES ('admin@clinica.com', 'admin123');
`);

// Migration: Add bot_name if not exists
try {
  db.prepare("ALTER TABLE clinic_settings ADD COLUMN bot_name TEXT DEFAULT 'AI Assistant'").run();
} catch (error) {
  // Column likely already exists
}

// Migration: Add clinic_logo if not exists
try {
  db.prepare("ALTER TABLE clinic_settings ADD COLUMN clinic_logo TEXT").run();
} catch (error) {
  // Column likely already exists
}

// Migration: Add role and permissions to users if not exists
try {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff'))").run();
  db.prepare("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'").run();

  // Update existing admin to have admin role
  db.prepare("UPDATE users SET role = 'admin', permissions = '{\"all\": true}' WHERE email = 'admin@clinica.com'").run();
} catch (error) {
  // Columns likely already exist
}

// Migration: Add message_type and media_url to messages if not exists
try {
  db.prepare("ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'document', 'audio', 'video'))").run();
  db.prepare("ALTER TABLE messages ADD COLUMN media_url TEXT").run();
} catch (error) {
  // Columns likely already exist
}

// Migration: Add google_event_id to appointments if not exists
try {
  db.prepare("ALTER TABLE appointments ADD COLUMN google_event_id TEXT").run();
} catch (error) {
  // Column likely already exists
}

module.exports = db;
