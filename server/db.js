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
    reminder_sent INTEGER DEFAULT 0,
    assigned_to INTEGER REFERENCES users(id)
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

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT,
    notes TEXT,
    last_interaction DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed initial data
  INSERT OR IGNORE INTO clinic_settings (id, clinic_name, services, clinic_logo) 
  VALUES (1, 'Wai Chatbot', 'Limpieza Facial, Botox, Rellenos, Peeling', '/wai-logo.jpg');

  INSERT OR IGNORE INTO users (email, password)
  VALUES ('${process.env.ADMIN_EMAIL || 'admin@clinica.com'}', '${process.env.ADMIN_PASSWORD || 'admin123'}');
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

try {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff'))").run();
  db.prepare("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'").run();

  // Update existing admin to have admin role
  db.prepare("UPDATE users SET role = 'admin', permissions = '{\"all\": true}' WHERE email = ?")
    .run(process.env.ADMIN_EMAIL || 'admin@clinica.com');
} catch (error) {
  // Columns likely already exist
}

// New profile columns (Separated to ensure they run even if role exists)
try {
  db.prepare("ALTER TABLE users ADD COLUMN name TEXT").run();
} catch (error) { }

try {
  db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
} catch (error) { }

try {
  db.prepare("ALTER TABLE users ADD COLUMN google_calendar_id TEXT").run();
} catch (error) { }

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

// Migration: Add enhanced CRM columns to customers table
try {
  db.prepare("ALTER TABLE customers ADD COLUMN category TEXT DEFAULT 'contact' CHECK(category IN ('prospect', 'client', 'contact'))").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived'))").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN company TEXT").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN position TEXT").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN source TEXT").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN assigned_to INTEGER REFERENCES users(id)").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN tags TEXT").run();
} catch (error) {
  // Column likely already exists
}

try {
  db.prepare("ALTER TABLE customers ADD COLUMN updated_at DATETIME").run();
} catch (error) {
  // Column likely already exists
}

// Create customer_notes table
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    note_type TEXT DEFAULT 'general' CHECK(note_type IN ('general', 'call', 'meeting', 'email', 'other')),
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create customer_attachments table
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    description TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create opportunities table
db.exec(`
  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    stage TEXT DEFAULT 'lead' CHECK(stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value REAL DEFAULT 0,
    probability INTEGER DEFAULT 0 CHECK(probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    assigned_to INTEGER,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );
`);

// Create opportunity_stage_history table
db.exec(`
  CREATE TABLE IF NOT EXISTS opportunity_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
  );
`);

module.exports = db;
