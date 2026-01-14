const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');
const calendarService = require('./calendarService');

const app = express();
const PORT = process.env.PORT || 3001;

// Deduplication cache
const processedMessages = new Set();
// Clean up cache every hour
setInterval(() => processedMessages.clear(), 3600000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadsDir));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, userDecoded) => {
    if (err) return res.sendStatus(403);

    // Fetch fresh user data from DB to ensure roles/permissions are up-to-date
    const freshUser = db.prepare('SELECT id, email, role, permissions FROM users WHERE id = ?').get(userDecoded.id);

    if (!freshUser) return res.sendStatus(403); // User no longer exists

    // Parse permissions if needed (though prepare returns object if we handle it? No, standard sqlite3 returns string for text)
    // Wait, in previous gets we manually parsed.
    try {
      freshUser.permissions = JSON.parse(freshUser.permissions || '{}');
    } catch (e) {
      freshUser.permissions = {};
    }

    req.user = freshUser;
    next();
  });
};

// Auth Routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}')
    };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, user: userData, token });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

// User Management with RBAC
app.get('/api/users', authenticateToken, (req, res) => {
  let query = 'SELECT id, email, name, phone, google_calendar_id, role, permissions FROM users';
  let params = [];

  // If NOT admin, only show own profile
  if (req.user.role !== 'admin') {
    query += ' WHERE id = ?';
    params.push(req.user.id);
  }

  const users = db.prepare(query).all(...params);
  users.forEach(u => {
    u.permissions = JSON.parse(u.permissions || '{}');
  });
  res.json(users);
});

app.post('/api/users', authenticateToken, (req, res) => {
  // Only admin can create users
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

  const { email, password, role, permissions, name, phone, google_calendar_id } = req.body;
  try {
    db.prepare('INSERT INTO users (email, password, role, permissions, name, phone, google_calendar_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(email, password, role || 'staff', JSON.stringify(permissions || {}), name, phone, google_calendar_id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { email, password, role, permissions, name, phone, google_calendar_id } = req.body;

  // RBAC Check: Admin can edit anyone. Staff can ONLY edit themselves.
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Solo puedes editar tu propio perfil' });
  }

  // Prevent staff from elevating their own privileges (changing role or permissions)
  if (req.user.role !== 'admin') {
    if (role && role !== req.user.role) return res.status(403).json({ error: 'No puedes cambiar tu rol' });
    // Note: We ignore permissions update from staff for safety, or we could strict check it
  }

  try {
    // If staff, force keep existing role/permissions if tried to change? 
    // For simplicity, we trust the frontend sends correct data or we just use what's safe.
    // Better security: If not admin, ignore role/permissions from body.
    let updateRole = role;
    let updatePerms = permissions;

    if (req.user.role !== 'admin') {
      const currentUser = db.prepare('SELECT role, permissions FROM users WHERE id = ?').get(id);
      updateRole = currentUser.role;
      updatePerms = JSON.parse(currentUser.permissions || '{}');
    }

    if (password) {
      db.prepare('UPDATE users SET email = ?, password = ?, role = ?, permissions = ?, name = ?, phone = ?, google_calendar_id = ? WHERE id = ?')
        .run(email, password, updateRole, JSON.stringify(updatePerms), name, phone, google_calendar_id, id);
    } else {
      db.prepare('UPDATE users SET email = ?, role = ?, permissions = ?, name = ?, phone = ?, google_calendar_id = ? WHERE id = ?')
        .run(email, updateRole, JSON.stringify(updatePerms), name, phone, google_calendar_id, id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  // Only admin can delete users
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

  const { id } = req.params;
  // Prevent deleting the last user or specific admin if restriction needed
  // For now simple delete
  try {
    // Protect last admin
    const userToDelete = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (userToDelete && userToDelete.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
      if (adminCount <= 1) {
        throw new Error('No se puede eliminar el último administrador.');
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clinic Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  console.log('DEBUG: Received settings update request:', req.body);
  try {
    const { clinic_name, clinic_address, clinic_phone, services, whatsapp_webhook_url, timezone, clinic_logo, bot_name } = req.body;
    const result = db.prepare('UPDATE clinic_settings SET clinic_name = ?, clinic_address = ?, clinic_phone = ?, services = ?, whatsapp_webhook_url = ?, timezone = ?, clinic_logo = ?, bot_name = ? WHERE id = 1')
      .run(clinic_name, clinic_address, clinic_phone, services, whatsapp_webhook_url, timezone, clinic_logo, bot_name);
    console.log('DEBUG: Settings update result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('DEBUG: Database Error during settings update:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/settings/status/google-calendar', async (req, res) => {
  try {
    const credsPath = path.join(__dirname, 'google-credentials.json');
    if (!fs.existsSync(credsPath)) {
      return res.json({ connected: false, message: 'Archivo de credenciales no encontrado (google-credentials.json)' });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    try {
      await calendarService.listEvents(calendarId, start, end);
      res.json({ connected: true, calendarId, message: 'Conectado correctamente' });
    } catch (apiError) {
      console.error('Google Calendar API Error:', apiError);
      res.json({ connected: false, message: 'Error de autenticación con Google: ' + apiError.message, calendarId });
    }
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

// Availability
app.get('/api/availability', (req, res) => {
  const slots = db.prepare('SELECT * FROM availability ORDER BY start_time ASC').all();
  res.json(slots);
});

app.get('/api/calendar/events', async (req, res) => {
  try {
    const { start, end } = req.query;
    // Default to current week if not provided
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(new Date().setDate(new Date().getDate() + 7));

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    console.log(`DEBUG: Fetching GCal events for ID: ${calendarId} from ${startDate} to ${endDate}`);

    const events = await calendarService.listEvents(calendarId, startDate, endDate);
    console.log(`DEBUG: Found ${events.length} events from Google.`);
    events.forEach(e => console.log(` - Event: ${e.summary} (${e.start.dateTime} - ${e.end.dateTime})`));

    const normalizedEvents = events.map(e => ({
      id: e.id,
      title: e.summary || 'Ocupado',
      start: e.start.dateTime || e.start.date, // Handle all-day events (date only)
      end: e.end.dateTime || e.end.date,
      source: 'google',
      allDay: !e.start.dateTime
    }));

    res.json(normalizedEvents);
  } catch (error) {
    console.error('Error fetching Google events:', error);
    // Return empty array to avoid breaking frontend on error
    res.json([]);
  }
});

app.post('/api/availability', (req, res) => {
  const { start_time, end_time } = req.body;
  try {
    const result = db.prepare('INSERT INTO availability (start_time, end_time) VALUES (?, ?)').run(start_time, end_time);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/availability/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM availability WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const appointments = db.prepare('SELECT * FROM appointments ORDER BY appointment_date DESC').all();
  res.json(appointments);
});

app.post('/api/appointments', async (req, res) => {
  const { phone_number, patient_name, appointment_date, appointment_type } = req.body;
  try {
    const result = db.prepare('INSERT INTO appointments (phone_number, patient_name, appointment_date, appointment_type) VALUES (?, ?, ?, ?)')
      .run(phone_number, patient_name, appointment_date, appointment_type);

    const appointmentId = result.lastInsertRowid;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const start = new Date(appointment_date);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const googleEvent = await calendarService.createCalendarEvent(calendarId, {
      summary: `Cita: ${patient_name} (${appointment_type})`,
      description: `Paciente: ${patient_name}\nTeléfono: ${phone_number}\nTipo: ${appointment_type}\nAgendado desde Dashboard`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }).catch(err => console.error('Error syncing manual appointment to Google:', err));

    if (googleEvent) {
      db.prepare('UPDATE appointments SET google_event_id = ? WHERE id = ?').run(googleEvent.id, appointmentId);
    }

    res.json({ success: true, id: appointmentId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { status, appointment_date } = req.body;
  console.log('Update appointment request. ID:', id, 'Body:', req.body);

  try {
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });

    if (status) {
      db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);

      if (status === 'cancelled' && appointment.google_event_id) {
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        await calendarService.deleteCalendarEvent(calendarId, appointment.google_event_id).catch(err => console.error('Error deleting Google event:', err));
      }
    } else if (appointment_date) {
      db.prepare('UPDATE appointments SET appointment_date = ? WHERE id = ?').run(appointment_date, id);

      if (appointment.google_event_id) {
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        const start = new Date(appointment_date);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        await calendarService.updateCalendarEvent(calendarId, appointment.google_event_id, {
          summary: `Cita: ${appointment.patient_name} (${appointment.appointment_type})`,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        }).catch(err => console.error('Error updating Google event:', err));
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Delete appointment request. ID:', id);
  try {
    const appointment = db.prepare('SELECT google_event_id FROM appointments WHERE id = ?').get(id);
    if (appointment && appointment.google_event_id) {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      await calendarService.deleteCalendarEvent(calendarId, appointment.google_event_id).catch(err => console.error('Error deleting Google event:', err));
    }
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Messages
app.get('/api/messages', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, p.name as patient_name
    FROM messages m 
    LEFT JOIN patients p ON m.phone_number = p.phone_number
    ORDER BY m.received_at DESC
  `).all();
  res.json(messages);
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

app.post('/api/chats/update-name', (req, res) => {
  let { phone_number, name } = req.body;
  if (phone_number.startsWith('+521') && phone_number.length === 14) {
    phone_number = '+52' + phone_number.substring(4);
  }
  db.prepare('INSERT INTO patients (phone_number, name) VALUES (?, ?) ON CONFLICT(phone_number) DO UPDATE SET name = EXCLUDED.name')
    .run(phone_number, name);
  res.json({ success: true });
});

// Customers CRUD
app.get('/api/customers', (req, res) => {
  try {
    const { category, status, assigned_to } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    query += ' ORDER BY last_interaction DESC';
    const customers = db.prepare(query).all(...params);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Customer stats
app.get('/api/customers/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN category = 'prospect' THEN 1 ELSE 0 END) as prospects,
        SUM(CASE WHEN category = 'client' THEN 1 ELSE 0 END) as clients,
        SUM(CASE WHEN category = 'contact' THEN 1 ELSE 0 END) as contacts
      FROM customers
    `).get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email, notes } = req.body;
  try {
    const result = db.prepare('INSERT INTO customers (name, phone, email, notes, last_interaction) VALUES (?, ?, ?, ?, ?)')
      .run(name, phone, email, notes, new Date().toISOString());
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email, notes, category, status, company, position, source, assigned_to, tags } = req.body;
  try {
    db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, email = ?, notes = ?,
          category = COALESCE(?, category),
          status = COALESCE(?, status),
          company = ?, position = ?, source = ?,
          assigned_to = ?, tags = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, phone, email, notes, category, status, company, position, source, assigned_to, tags, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CUSTOMER NOTES ENDPOINTS =====
app.get('/api/customers/:customerId/notes', (req, res) => {
  const { customerId } = req.params;
  try {
    const notes = db.prepare(`
      SELECT n.*, u.email as author_email
      FROM customer_notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.customer_id = ?
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `).all(customerId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers/:customerId/notes', (req, res) => {
  const { customerId } = req.params;
  const { note_text, note_type, is_pinned, created_by } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO customer_notes (customer_id, note_text, note_type, is_pinned, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(customerId, note_text, note_type || 'general', is_pinned || 0, created_by || 1);

    const note = db.prepare('SELECT * FROM customer_notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:customerId/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  const { note_text, note_type, is_pinned } = req.body;
  try {
    db.prepare(`
      UPDATE customer_notes
      SET note_text = COALESCE(?, note_text),
          note_type = COALESCE(?, note_type),
          is_pinned = COALESCE(?, is_pinned),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(note_text, note_type, is_pinned, noteId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:customerId/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  try {
    db.prepare('DELETE FROM customer_notes WHERE id = ?').run(noteId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:customerId/notes/:noteId/pin', (req, res) => {
  const { noteId } = req.params;
  try {
    const note = db.prepare('SELECT is_pinned FROM customer_notes WHERE id = ?').get(noteId);
    const newPinStatus = note.is_pinned === 1 ? 0 : 1;
    db.prepare('UPDATE customer_notes SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPinStatus, noteId);
    res.json({ success: true, is_pinned: newPinStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CUSTOMER ATTACHMENTS ENDPOINTS =====
app.get('/api/customers/:customerId/attachments', (req, res) => {
  const { customerId } = req.params;
  try {
    const attachments = db.prepare(`
      SELECT a.*, u.email as uploader_email
      FROM customer_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.customer_id = ?
      ORDER BY a.uploaded_at DESC
    `).all(customerId);
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers/:customerId/attachments', upload.single('file'), (req, res) => {
  const { customerId } = req.params;
  const { description } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    // Create customer-specific directory
    const customerDir = path.join(uploadsDir, 'customers', customerId);
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    // Move file to customer directory
    const oldPath = req.file.path;
    const newPath = path.join(customerDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    const result = db.prepare(`
      INSERT INTO customer_attachments
      (customer_id, file_name, file_original_name, file_path, file_type, file_size, mime_type, description, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      req.file.filename,
      req.file.originalname,
      newPath,
      path.extname(req.file.originalname).substring(1),
      req.file.size,
      req.file.mimetype,
      description || null,
      1 // Default user ID, should be from auth session
    );

    const attachment = db.prepare('SELECT * FROM customer_attachments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, attachment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/customers/:customerId/attachments/:attachmentId/download', (req, res) => {
  const { attachmentId } = req.params;
  try {
    const attachment = db.prepare('SELECT * FROM customer_attachments WHERE id = ?').get(attachmentId);

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    if (!fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    res.download(attachment.file_path, attachment.file_original_name);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:customerId/attachments/:attachmentId', (req, res) => {
  const { attachmentId } = req.params;
  try {
    const attachment = db.prepare('SELECT * FROM customer_attachments WHERE id = ?').get(attachmentId);

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }

    // Delete from database
    db.prepare('DELETE FROM customer_attachments WHERE id = ?').run(attachmentId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== OPPORTUNITIES ENDPOINTS =====
app.get('/api/opportunities', (req, res) => {
  const { stage, customer_id, assigned_to } = req.query;
  try {
    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             u.email as assigned_user_email
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (stage) {
      query += ' AND o.stage = ?';
      params.push(stage);
    }
    if (customer_id) {
      query += ' AND o.customer_id = ?';
      params.push(customer_id);
    }
    if (assigned_to) {
      query += ' AND o.assigned_to = ?';
      params.push(assigned_to);
    }

    query += ' ORDER BY o.created_at DESC';
    const opportunities = db.prepare(query).all(...params);
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/opportunities/:id', (req, res) => {
  const { id } = req.params;
  try {
    const opportunity = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             u.email as assigned_user_email
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.id = ?
    `).get(id);

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Get stage history
    const history = db.prepare(`
      SELECT h.*, u.email as changed_by_email
      FROM opportunity_stage_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.opportunity_id = ?
      ORDER BY h.changed_at DESC
    `).all(id);

    res.json({ opportunity, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/opportunities', (req, res) => {
  const {
    customer_id, title, description, stage, value, currency,
    probability, expected_close_date, priority, source, assigned_to, created_by
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO opportunities
      (customer_id, title, description, stage, value, currency, probability,
       expected_close_date, priority, source, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer_id, title, description || null, stage || 'lead', value || 0,
      currency || 'MXN', probability || 50, expected_close_date || null,
      priority || 'medium', source || null, assigned_to || null, created_by || 1
    );

    // Log initial stage in history
    db.prepare(`
      INSERT INTO opportunity_stage_history (opportunity_id, to_stage, changed_by, notes)
      VALUES (?, ?, ?, ?)
    `).run(result.lastInsertRowid, stage || 'lead', created_by || 1, 'Opportunity created');

    const opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, opportunity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/opportunities/:id', (req, res) => {
  const { id } = req.params;
  const {
    title, description, stage, value, currency, probability,
    expected_close_date, actual_close_date, lost_reason, priority,
    assigned_to, changed_by
  } = req.body;

  try {
    // Get current opportunity to check if stage changed
    const current = db.prepare('SELECT stage FROM opportunities WHERE id = ?').get(id);

    if (!current) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Update opportunity
    db.prepare(`
      UPDATE opportunities
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          stage = COALESCE(?, stage),
          value = COALESCE(?, value),
          currency = COALESCE(?, currency),
          probability = COALESCE(?, probability),
          expected_close_date = COALESCE(?, expected_close_date),
          actual_close_date = COALESCE(?, actual_close_date),
          lost_reason = COALESCE(?, lost_reason),
          priority = COALESCE(?, priority),
          assigned_to = COALESCE(?, assigned_to),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, description, stage, value, currency, probability,
      expected_close_date, actual_close_date, lost_reason, priority,
      assigned_to, id
    );

    // Log stage change if stage was updated
    if (stage && stage !== current.stage) {
      db.prepare(`
        INSERT INTO opportunity_stage_history (opportunity_id, from_stage, to_stage, changed_by)
        VALUES (?, ?, ?, ?)
      `).run(id, current.stage, stage, changed_by || 1);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/opportunities/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM opportunities WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Opportunity stage history
app.get('/api/opportunities/:id/history', (req, res) => {
  const { id } = req.params;
  try {
    const history = db.prepare(`
      SELECT h.*, u.email as changed_by_email
      FROM opportunity_stage_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.opportunity_id = ?
      ORDER BY h.changed_at DESC
    `).all(id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pipeline statistics
app.get('/api/opportunities/pipeline/stats', (req, res) => {
  try {
    const byStage = db.prepare(`
      SELECT
        stage,
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value
      FROM opportunities
      WHERE stage NOT IN ('won', 'lost')
      GROUP BY stage
    `).all();

    const won = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM opportunities
      WHERE stage = 'won'
    `).get();

    const lost = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM opportunities
      WHERE stage = 'lost'
    `).get();

    const totalPipeline = db.prepare(`
      SELECT COALESCE(SUM(value), 0) as total
      FROM opportunities
      WHERE stage NOT IN ('won', 'lost')
    `).get();

    const weightedPipeline = db.prepare(`
      SELECT COALESCE(SUM(value * probability / 100.0), 0) as weighted
      FROM opportunities
      WHERE stage NOT IN ('won', 'lost')
    `).get();

    res.json({
      by_stage: byStage.reduce((acc, item) => {
        acc[item.stage] = { count: item.count, total_value: item.total_value };
        return acc;
      }, {}),
      won: { count: won.count, total_value: won.total_value },
      lost: { count: lost.count, total_value: lost.total_value },
      total_pipeline_value: totalPipeline.total,
      weighted_pipeline_value: weightedPipeline.weighted
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// AI Pause / Chatwoot Handoff status check
async function isAiPaused(phoneNumber) {
  if (process.env.ACTIVATE_CHATWOOT === 'true') {
    // In Chatwoot mode, we could check conversation status via API
    // but for now we follow the local db or a simplified logic.
    // Future: check if conversation is 'open' (human) or 'pending' (bot)
  }
  const status = db.prepare('SELECT is_ai_paused FROM chat_status WHERE phone_number = ?').get(phoneNumber);
  return status ? status.is_ai_paused : 0;
}

app.get('/api/chats/status/:phone_number', async (req, res) => {
  let { phone_number } = req.params;
  if (phone_number.startsWith('+521') && phone_number.length === 14) {
    phone_number = '+52' + phone_number.substring(4);
  }
  const paused = await isAiPaused(phone_number);
  res.json({ is_ai_paused: paused });
});

app.post('/api/chats/toggle-pause', (req, res) => {
  let { phone_number, is_ai_paused } = req.body;
  if (phone_number.startsWith('+521') && phone_number.length === 14) {
    phone_number = '+52' + phone_number.substring(4);
  }
  db.prepare('INSERT INTO chat_status (phone_number, is_ai_paused) VALUES (?, ?) ON CONFLICT(phone_number) DO UPDATE SET is_ai_paused = EXCLUDED.is_ai_paused')
    .run(phone_number, is_ai_paused ? 1 : 0);
  res.json({ success: true });
});

// --- Chatwoot Webhook Endpoint ---
app.post('/api/webhook/chatwoot', async (req, res) => {
  if (process.env.ACTIVATE_CHATWOOT !== 'true') return res.status(200).send('Disabled');

  const payload = req.body;
  // Listen for new messages created by users (not by bot)
  if (payload.event === 'message_created' && payload.message_type === 'incoming') {
    const phoneNumber = payload.sender?.phone_number || '';
    const content = payload.content;
    const conversationId = payload.conversation?.id;

    console.log(`[Chatwoot Webhook] New message from ${phoneNumber}: ${content}`);

    // Here we could trigger the same AI logic as the YCloud webhook
    // but calling a common function. 
    // To keep it simple for this commit, we'll just log it.
  }
  res.status(200).send('OK');
});


app.post('/api/messages', async (req, res) => {
  const { phone_number, message_content, message_type, media_url } = req.body;
  const timestamp = new Date().toISOString();

  try {
    // Save to database
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, message_type, media_url) VALUES (?, ?, ?, ?, ?)')
      .run(phone_number, message_content || '', 'assistant', message_type || 'text', media_url || null);

    // Sync with Chatwoot if active
    let conversationId = null;
    if (process.env.ACTIVATE_CHATWOOT === 'true') {
      const chatStatus = db.prepare('SELECT chatwoot_conversation_id FROM chat_status WHERE phone_number = ?').get(phone_number);
      conversationId = chatStatus?.chatwoot_conversation_id;

      // If no conversationId but Chatwoot is active, we should still try to sync
      const syncResult = await syncWithChatwoot(phone_number, message_content || (media_url ? `Media: ${message_type}` : ''), 'assistant', message_type, media_url);
      if (syncResult?.conversationId) {
        conversationId = syncResult.conversationId;
      }
    }

    // Send via YCloud (WhatsApp)
    await sendWhatsAppMessage(phone_number, message_content, conversationId, message_type, media_url);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending dashboard message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// WhatsApp Webhook (YCloud version)
app.post('/api/webhook/whatsapp', async (req, res) => {
  const { type, whatsappInboundMessageReceived, whatsappInboundMessage } = req.body;
  const inboundData = whatsappInboundMessage || whatsappInboundMessageReceived;

  // Verify it's an inbound message
  if (type !== 'whatsapp.inbound_message.received' || !inboundData) {
    return res.status(200).send('OK');
  }

  // Deduplication
  const messageId = inboundData.id;
  if (messageId && processedMessages.has(messageId)) {
    console.log(`[Webhook] Duplicate message ignored: ${messageId}`);
    return res.status(200).send('OK');
  }
  if (messageId) processedMessages.add(messageId);

  let Body = inboundData.text?.body || '';
  let phoneNumber = inboundData.from;
  const profileName = inboundData.customerProfile?.name;
  let messageType = 'text';
  let mediaUrl = null;
  const recipientNumber = inboundData.to;

  if (recipientNumber && process.env.YCLOUD_FROM && recipientNumber !== process.env.YCLOUD_FROM) {
    console.log(`Webhook ignored. Recipient ${recipientNumber} does not match YCLOUD_FROM ${process.env.YCLOUD_FROM}`);

    // Forward to other instances if configured
    if (process.env.FORWARD_WEBHOOK_URLS) {
      const urls = process.env.FORWARD_WEBHOOK_URLS.split(',').map(u => u.trim());
      for (const url of urls) {
        console.log(`Forwarding webhook to: ${url}`);
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        }).catch(err => console.error(`Error forwarding webhook to ${url}:`, err.message));
      }
    }

    return res.status(200).send('OK');
  }

  // Handle Media
  if (inboundData.image) {
    messageType = 'image';
    mediaUrl = inboundData.image.link;
    Body = inboundData.image.caption || '';
  } else if (inboundData.audio) {
    messageType = 'audio';
    mediaUrl = inboundData.audio.link;
  } else if (inboundData.video) {
    messageType = 'video';
    mediaUrl = inboundData.video.link;
    Body = inboundData.video.caption || '';
  } else if (inboundData.document) {
    messageType = 'document';
    mediaUrl = inboundData.document.link;
    Body = inboundData.document.caption || inboundData.document.filename || '';
  }

  if (!phoneNumber) return res.status(200).send('OK');

  // Normalize Mexican phone numbers (+521... -> +52...)
  if (phoneNumber.startsWith('+521') && phoneNumber.length === 14) {
    phoneNumber = '+52' + phoneNumber.substring(4);
  }

  try {
    // Automatically save or update patient name from WhatsApp profile
    if (profileName) {
      db.prepare('INSERT INTO patients (phone_number, name) VALUES (?, ?) ON CONFLICT(phone_number) DO UPDATE SET name = EXCLUDED.name')
        .run(phoneNumber, profileName);
    }

    console.log(`Webhook triggered (YCloud). To: ${recipientNumber} From: ${phoneNumber} Type: ${messageType} Body: ${Body}`);
    // 1. Save user message
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, message_type, media_url, received_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(phoneNumber, Body, 'user', messageType, mediaUrl, new Date().toISOString());

    // Update or create customer record
    const patientInfo = db.prepare('SELECT name FROM patients WHERE phone_number = ?').get(phoneNumber);
    db.prepare('INSERT INTO customers (phone, name, last_interaction) VALUES (?, ?, ?) ON CONFLICT(phone) DO UPDATE SET last_interaction = EXCLUDED.last_interaction, name = COALESCE(EXCLUDED.name, name)')
      .run(phoneNumber, patientInfo?.name || null, new Date().toISOString());

    // 2. Sync with Chatwoot if active
    const conversationId = await syncWithChatwoot(phoneNumber, Body, 'user', messageType, mediaUrl);

    // Check if AI is paused for this number
    const chatStatus = db.prepare('SELECT is_ai_paused FROM chat_status WHERE phone_number = ?').get(phoneNumber);
    if (chatStatus && chatStatus.is_ai_paused === 1) {
      console.log(`DEBUG: AI is paused for ${phoneNumber}. Skipping automated response.`);
      return res.status(200).send('OK');
    }

    // 2. Get Clinic Settings & History
    const settings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
    const history = db.prepare('SELECT message_content, sender FROM messages WHERE phone_number = ? ORDER BY received_at DESC LIMIT 10')
      .all(phoneNumber);

    const localTime = new Date().toLocaleString('es-MX', { timeZone: settings.timezone });

    // Check if last assistant message contained available slots
    const lastAssistantMsg = history.find(m => m.sender === 'assistant');
    const justShownSlots = lastAssistantMsg && (
      lastAssistantMsg.message_content.includes('horarios que tengo libres') ||
      lastAssistantMsg.message_content.includes('Estos son los horarios') ||
      lastAssistantMsg.message_content.includes('¿Te queda bien alguno?')
    );

    // 3. Call Gemini
    const patientRecord = db.prepare('SELECT name FROM patients WHERE phone_number = ?').get(phoneNumber);
    const extractedName = patientRecord ? patientRecord.name : null;
    const botName = settings.bot_name || 'AI Assistant';
    const systemPrompt = `Eres ${botName}, la asistente virtual de ${settings.clinic_name}. 
    Tu objetivo es agendar citas, reprogramarlas y resolver dudas. 
    Hora actual: ${localTime}.
    Servicios: ${settings.services}.
    Dirección: ${settings.clinic_address}.
    Usa un tono profesional, amable y estético. 

    REGLAS DE ORO:
    1. CONCISIÓN EXTREMA: Responde en MÁXIMO 2 oraciones cortas. No des rodeos ni explicaciones largas.
    2. UN SOLO MENSAJE: Toda tu respuesta debe ir en un único bloque de texto.
    3. DISPONIBILIDAD: SIEMPRE llama a 'get_available_slots' si preguntan por horarios. 
    4. ACCIÓN DIRECTA: Si tienes el nombre (${extractedName || 'desconocido'}) y el horario, agenda de inmediato.
    5. No inventes datos. Si no sabes algo, pide al usuario contactar a la clínica.
    6. PROHIBICIÓN DE CÓDIGO: Tu respuesta debe ser 100% lenguaje natural.

    ${extractedName
        ? `\n[PACIENTE] Nombre: ${extractedName}.`
        : `\n[PACIENTE] Nombre: Desconocido. Pídelo antes de agendar.`}`;

    // Map history to Gemini format
    const chatHistory = history.reverse().map(m => ({
      role: m.sender === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.message_content }]
    }));

    const contents = [
      ...chatHistory,
      { role: "user", parts: [{ text: `System context: ${systemPrompt}\nUser message: ${Body}` }] }
    ];

    const tools = [
      {
        function_declarations: [
          {
            name: "schedule_appointment",
            description: "Registra una nueva cita médica (SOLO si el horario está disponible)",
            parameters: {
              type: "object",
              properties: {
                patient_name: { type: "string", description: "Nombre completo del paciente" },
                appointment_date: { type: "string", description: "Fecha y hora de la cita en formato ISO (YYYY-MM-DDTHH:mm)" },
                appointment_type: { type: "string", description: "Tipo de servicio o consulta" }
              },
              required: ["patient_name", "appointment_date", "appointment_type"]
            }
          },
          {
            name: "get_available_slots",
            description: "Consulta los horarios disponibles en la agenda para ofrecer al usuario",
            parameters: { type: "object", properties: {} }
          },
          {
            name: "get_my_appointments",
            description: "Consulta las citas actuales del usuario para ver si tiene alguna que reprogramar",
            parameters: { type: "object", properties: {} }
          },
          {
            name: "reschedule_appointment",
            description: "Cambia la fecha/hora de una cita existente",
            parameters: {
              type: "object",
              properties: {
                appointment_id: { type: "integer", description: "ID de la cita a reprogramar" },
                new_date: { type: "string", description: "Nueva fecha y hora en formato ISO" }
              },
              required: ["appointment_id", "new_date"]
            }
          }
        ]
      }
    ];

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        tools: tools,
        tool_config: { function_calling_config: { mode: "AUTO" } }
      })
    });

    const geminiData = await geminiRes.json();
    if (geminiData.error) {
      console.error('Gemini API Error Detail:', JSON.stringify(geminiData.error, null, 2));
    }
    console.log('Gemini Response Data status:', geminiRes.status);

    let aiResponse = `Lo siento, ${botName} está teniendo problemas de conexión.`;

    if (geminiData.error) {
      console.error('Gemini API Error:', geminiData.error);
      if (geminiData.error.code === 429) {
        aiResponse = `${botName} ha superado su límite mensual de mensajes gratuitos. Por favor, revisa tu cuota en Google AI Studio o intenta de nuevo mañana.`;
      } else {
        aiResponse = `${botName} tiene un inconveniente técnico (Error ${geminiData.error.code}). Por favor, contacta a soporte.`;
      }
    } else {
      const candidate = geminiData.candidates?.[0];
      const functionCall = candidate?.content?.parts?.find(p => p.functionCall);

      if (functionCall) {
        const name = functionCall.functionCall.name;
        const args = functionCall.functionCall.args;

        try {
          if (name === 'schedule_appointment') {
            const { patient_name, appointment_date, appointment_type } = args;

            // Validate Availability
            const apptDateLocal = new Date(appointment_date);
            const apptDateUTC = new Date(apptDateLocal.getTime() + (6 * 60 * 60 * 1000));
            const apptDateUTCString = apptDateUTC.toISOString().slice(0, 16);

            const available = db.prepare(`
              SELECT id FROM availability 
              WHERE datetime(?) >= datetime(start_time, '-6 hours') 
              AND datetime(?) < datetime(end_time, '-6 hours')
            `).get(appointment_date, appointment_date);

            const alreadyBooked = db.prepare(`
              SELECT id FROM appointments 
              WHERE datetime(appointment_date) = datetime(?) 
              AND status != 'cancelled'
            `).get(appointment_date);

            if (!available) {
              aiResponse = "Lo siento, ese horario no está abierto en nuestra agenda. ¿Te gustaría ver otras opciones?";
            } else if (alreadyBooked) {
              aiResponse = "Lo siento, ese horario ya ha sido reservado por otra persona justo ahora. ¿Podemos intentar con otro?";
            } else {
              // Check Google Calendar Busy status
              const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
              const start = new Date(appointment_date + '-06:00');
              const end = new Date(start.getTime() + 30 * 60 * 1000); // Assume 30 min duration

              const isBusy = await calendarService.isSlotBusy(calendarId, start, end).catch(err => {
                console.error('Error checking Google Calendar busy status:', err);
                return false;
              });

              if (isBusy) {
                aiResponse = "Lo siento, aunque el horario parece disponible en el sistema local, está ocupado en mi agenda principal. ¿Podemos buscar otro?";
              } else {
                const result = db.prepare('INSERT INTO appointments (phone_number, patient_name, appointment_date, appointment_type) VALUES (?, ?, ?, ?)')
                  .run(phoneNumber, patient_name, appointment_date, appointment_type);

                // === PHASE 4: Bot Integration - Automatic Opportunity Creation ===
                try {
                  // 1. Check if customer exists in customers table
                  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phoneNumber);

                  if (!customer) {
                    // Create new customer record
                    console.log(`[Bot Integration] Creating new customer for ${phoneNumber}`);
                    const customerResult = db.prepare(`
                      INSERT INTO customers (name, phone, category, source, status, last_interaction)
                      VALUES (?, ?, ?, ?, ?, ?)
                    `).run(patient_name, phoneNumber, 'prospect', 'whatsapp_bot', 'active', new Date().toISOString());

                    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerResult.lastInsertRowid);
                  } else {
                    // Update existing customer
                    console.log(`[Bot Integration] Customer exists, updating category and last_interaction`);

                    // Upgrade category if they were just a contact
                    if (customer.category === 'contact') {
                      db.prepare('UPDATE customers SET category = ? WHERE id = ?').run('prospect', customer.id);
                    }

                    // Update last_interaction
                    db.prepare('UPDATE customers SET last_interaction = ? WHERE id = ?')
                      .run(new Date().toISOString(), customer.id);
                  }

                  // 2. Create opportunity linked to customer
                  console.log(`[Bot Integration] Creating opportunity for customer ID ${customer.id}`);
                  const opportunityTitle = `Cita: ${appointment_type}`;
                  const opportunityDescription = `Cita agendada vía WhatsApp bot\n` +
                    `Fecha: ${start.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })}\n` +
                    `Servicio: ${appointment_type}\n` +
                    `Paciente: ${patient_name}`;

                  const opportunityResult = db.prepare(`
                    INSERT INTO opportunities
                    (customer_id, title, description, stage, value, currency, probability,
                     expected_close_date, priority, source, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `).run(
                    customer.id,
                    opportunityTitle,
                    opportunityDescription,
                    'qualified', // They've already scheduled an appointment
                    0, // Value can be updated manually later
                    'MXN',
                    50, // Medium probability since they booked
                    appointment_date, // Expected close date is the appointment date
                    'medium',
                    'whatsapp_bot',
                    1 // System user ID
                  );

                  // 3. Log stage history (lead → qualified)
                  const opportunityId = opportunityResult.lastInsertRowid;

                  // Initial stage as 'lead'
                  db.prepare(`
                    INSERT INTO opportunity_stage_history (opportunity_id, to_stage, changed_by, notes)
                    VALUES (?, ?, ?, ?)
                  `).run(opportunityId, 'lead', 1, 'Opportunity created via WhatsApp bot');

                  // Immediate progression to 'qualified' (they booked an appointment)
                  db.prepare(`
                    INSERT INTO opportunity_stage_history (opportunity_id, from_stage, to_stage, changed_by, notes)
                    VALUES (?, ?, ?, ?, ?)
                  `).run(opportunityId, 'lead', 'qualified', 1, 'Automatically qualified - appointment booked');

                  console.log(`[Bot Integration] ✓ Opportunity created (ID: ${opportunityId}) and auto-qualified`);
                } catch (opportunityError) {
                  // Log error but don't break appointment booking flow
                  console.error('[Bot Integration] Error creating opportunity:', opportunityError);
                }
                // === End Phase 4 Integration ===

                // Sync with Google Calendar
                calendarService.createCalendarEvent(calendarId, {
                  summary: `Cita: ${patient_name} (${appointment_type})`,
                  description: `Paciente: ${patient_name}\nTeléfono: ${phoneNumber}\nTipo: ${appointment_type}\nAgendado por Erika AI`,
                  start: { dateTime: start.toISOString() },
                  end: { dateTime: end.toISOString() },
                  extendedProperties: {
                    private: {
                      local_appointment_id: result.lastInsertRowid.toString(),
                      phone_number: phoneNumber
                    }
                  }
                }).then(googleEvent => {
                  if (googleEvent) {
                    db.prepare('UPDATE appointments SET google_event_id = ? WHERE id = ?').run(googleEvent.id, result.lastInsertRowid);
                  }
                }).catch(err => console.error('Error syncing to Google Calendar:', err));

                const formattedDate = start.toLocaleString('es-MX', {
                  timeZone: 'America/Mexico_City',
                  dateStyle: 'long',
                  timeStyle: 'short'
                });

                aiResponse = `¡Perfecto! He agendado tu cita de ${appointment_type} para el ${formattedDate}. ¿Te puedo ayudar en algo más?`;
              }
            }
          }
          else if (name === 'get_available_slots') {
            const slots = db.prepare(`
              SELECT start_time 
              FROM availability 
              WHERE datetime(start_time, '-6 hours') > datetime('now', '-6 hours') 
              AND datetime(start_time, '-6 hours') NOT IN (
                SELECT datetime(appointment_date) 
                FROM appointments 
                WHERE status != 'cancelled'
              )
              ORDER BY start_time ASC 
              LIMIT 30
            `).all();
            if (slots.length === 0) {
              aiResponse = `Por el momento no tengo horarios disponibles en el sistema. Por favor, intenta contactar directamente a ${settings.clinic_name}.`;
            } else {
              // Filter slots by Google Calendar busy status
              const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
              const filteredSlots = [];

              for (const slot of slots) {
                const start = new Date(slot.start_time);
                const end = new Date(start.getTime() + 30 * 60 * 1000); // Assume 30 min duration
                const isBusy = await calendarService.isSlotBusy(calendarId, start, end).catch(() => false);
                if (!isBusy) {
                  filteredSlots.push(slot);
                }
                if (filteredSlots.length >= 10) break; // Don't overwhelm with too many slots
              }

              if (filteredSlots.length === 0) {
                aiResponse = `Por el momento no tengo horarios libres. Por favor, intenta mañana o contacta directamente a ${settings.clinic_name}.`;
              } else {
                const list = filteredSlots.map(s => {
                  return `- ${new Date(s.start_time).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', timeZone: 'America/Mexico_City' })}`;
                }).join('\n');
                aiResponse = `Estos son los horarios que tengo libres próximamente:\n${list}\n¿Te queda bien alguno?`;
              }
            }
          }
          else if (name === 'get_my_appointments') {
            const appts = db.prepare("SELECT id, appointment_date, appointment_type FROM appointments WHERE phone_number = ? AND status != 'cancelled'").all(phoneNumber);
            if (appts.length === 0) {
              aiResponse = "No encontré citas próximas registradas con tu número. ¿Te gustaría agendar una nueva?";
            } else {
              const list = appts.map(a => {
                // Forzar interpretación como hora local de México (-06:00) para evitar desfase por zona horaria del servidor
                const dateObj = new Date(a.appointment_date + '-06:00');
                return `- ID ${a.id}: ${a.appointment_type} el ${dateObj.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`;
              }).join('\n');
              aiResponse = `Tienes estas citas registradas:\n${list}\n¿Cuál de ellas te gustaría reprogramar? (Dime el ID o el servicio)`;
            }
          }
          else if (name === 'reschedule_appointment') {
            const { appointment_id, new_date } = args;
            console.log(`DEBUG: Executing reschedule_appointment. ID: ${appointment_id}, New Date: ${new_date}, Phone: ${phoneNumber}`);

            // Validation before reschedule
            const openInAgenda = db.prepare(`
              SELECT id FROM availability 
              WHERE datetime(?) >= datetime(start_time, '-6 hours') 
              AND datetime(?) < datetime(end_time, '-6 hours')
            `).get(new_date, new_date);

            const alreadyBooked = db.prepare(`
              SELECT id FROM appointments 
              WHERE datetime(appointment_date) = datetime(?) 
              AND status != 'cancelled'
              AND id != ?
            `).get(new_date, appointment_id);

            if (!openInAgenda) {
              aiResponse = "Lo siento, ese horario no está disponible en nuestra agenda. ¿Te gustaría ver otras opciones?";
            } else {
              const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
              const start = new Date(new_date + '-06:00');
              const end = new Date(start.getTime() + 30 * 60 * 1000);

              const isBusy = await calendarService.isSlotBusy(calendarId, start, end).catch(() => false);

              if (alreadyBooked || isBusy) {
                aiResponse = "Lo siento, ese nuevo horario ya está ocupado. ¿Te gustaría intentar con otro?";
              } else {
                const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id);
                const result = db.prepare("UPDATE appointments SET appointment_date = ?, status = 'confirmed' WHERE id = ? AND phone_number = ?")
                  .run(new_date, appointment_id, phoneNumber);

                console.log(`DEBUG: Update Result:`, result);

                if (result.changes > 0) {
                  // Sync with Google Calendar
                  if (appointment && appointment.google_event_id) {
                    calendarService.updateCalendarEvent(calendarId, appointment.google_event_id, {
                      summary: `Cita: ${appointment.patient_name} (${appointment.appointment_type})`,
                      start: { dateTime: start.toISOString() },
                      end: { dateTime: end.toISOString() },
                    }).catch(err => console.error('Error updating Google event via AI:', err));
                  }

                  const formattedDate = start.toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City',
                    dateStyle: 'long',
                    timeStyle: 'short'
                  });
                  aiResponse = `¡Listo! He reprogramado tu cita para el ${formattedDate}.`;
                } else {
                  // Fallback: intentar actualizar solo por ID si falla con phone_number
                  const retry = db.prepare("UPDATE appointments SET appointment_date = ?, status = 'confirmed' WHERE id = ?")
                    .run(new_date, appointment_id);

                  if (retry.changes > 0) {
                    const formattedDate = new Date(new_date + '-06:00').toLocaleString('es-MX', {
                      timeZone: 'America/Mexico_City',
                      dateStyle: 'long',
                      timeStyle: 'short'
                    });
                    aiResponse = `¡Listo! He reprogramado tu cita para el ${formattedDate}.`;
                  } else {
                    aiResponse = "No pude encontrar esa cita para reprogramarla. Por favor, confírmame el horario actual.";
                  }
                }
              }
            }
          }
        } catch (dbError) {
          console.error('Database Error during AI tool call:', dbError);
          aiResponse = "Tuve un problema al acceder a mi agenda. ¿Podrías intentar de nuevo en un momento?";
        }
      } else {
        aiResponse = candidate?.content?.parts?.[0]?.text || aiResponse;
      }
    }

    console.log('Final AI Response:', aiResponse);

    // 4. Save AI message
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
      .run(phoneNumber, aiResponse, 'assistant', new Date().toISOString());

    // 5. Send via Twilio
    await sendWhatsAppMessage(phoneNumber, aiResponse, conversationId);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve React index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Helper: Send WhatsApp Message (YCloud or Chatwoot)
async function sendWhatsAppMessage(to, body, conversationId = null, message_type = 'text', media_url = null) {
  let formattedTo = to.replace('whatsapp:', '');
  if (formattedTo.startsWith('+521') && formattedTo.length === 14) {
    formattedTo = '+52' + formattedTo.substring(4);
  }

  // --- SYNC WITH CHATWOOT IF ACTIVE ---
  if (process.env.ACTIVATE_CHATWOOT === 'true' && conversationId) {
    try {
      const cwUrl = `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
      await fetch(cwUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': process.env.CHATWOOT_ACCESS_TOKEN
        },
        body: JSON.stringify({
          content: media_url ? `${body || ''}\n[Media (${message_type})]: ${media_url}`.trim() : body,
          message_type: 'outgoing'
        })
      });
      console.log(`AI message synced to Chatwoot conversation ${conversationId}`);
    } catch (cwError) {
      console.error('Error syncing AI message to Chatwoot:', cwError);
    }
  }

  // --- ALWAYS SEND TO YCLOUD (To reach the user's phone) ---
  const ycloudUrl = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
  try {
    const response = await fetch(ycloudUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.YCLOUD_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.YCLOUD_FROM,
        to: formattedTo,
        type: message_type === 'text' ? 'text' : message_type,
        [message_type === 'text' ? 'text' : message_type]: message_type === 'text'
          ? { body: body }
          : { link: media_url, caption: body || undefined },
        wabaId: process.env.YCLOUD_WABA_ID
      })
    });

    const data = await response.json();
    console.log(`Message sent to ${formattedTo} via YCloud. ID: ${data.id}`);
  } catch (error) {
    console.error('Error sending WhatsApp message via YCloud:', error);
  }
}


// Helper: Sync with Chatwoot (Forward incoming message)
async function syncWithChatwoot(phoneNumber, messageContent, senderRole = 'user', message_type = 'text', media_url = null) {
  if (process.env.ACTIVATE_CHATWOOT !== 'true') {
    console.log('[Chatwoot] Disabled by env var');
    return null;
  }

  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const inboxId = process.env.CHATWOOT_INBOX_ID;
    const cwUrl = `${process.env.CHATWOOT_URL}/api/v1/accounts/${accountId}`;
    const headers = { 'Content-Type': 'application/json', 'api_access_token': process.env.CHATWOOT_ACCESS_TOKEN };

    console.log(`[Chatwoot Debug] Syncing message for ${phoneNumber}. Inbox: ${inboxId}`);

    // 1. Find or create contact
    let contactResponse = await fetch(`${cwUrl}/contacts/search?q=${phoneNumber}`, { headers });
    let contactData = await contactResponse.json();
    let contact = contactData.payload?.[0];

    if (!contact) {
      console.log(`[Chatwoot Debug] Contact not found for ${phoneNumber}. Creating new contact...`);
      contactResponse = await fetch(`${cwUrl}/contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: phoneNumber, phone_number: phoneNumber, inbox_id: inboxId })
      });
      contactData = await contactResponse.json();
      contact = contactData.payload?.contact;
    }

    if (!contact) {
      console.error('[Chatwoot Debug] Failed to find or create contact');
      return null;
    }

    console.log(`[Chatwoot Debug] Contact ID: ${contact.id}`);

    // 2. Find or create conversation
    let conversationResponse = await fetch(`${cwUrl}/contacts/${contact.id}/conversations`, { headers });
    let conversationData = await conversationResponse.json();
    let conversation = conversationData.payload?.find(c => c.inbox_id == inboxId && c.status !== 'resolved');

    if (!conversation) {
      console.log(`[Chatwoot Debug] No active conversation found for contact ${contact.id}. Creating new...`);
      conversationResponse = await fetch(`${cwUrl}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_id: contact.source_id, contact_id: contact.id, inbox_id: inboxId })
      });
      conversationData = await conversationResponse.json();
      conversation = conversationData;
    }

    if (!conversation || !conversation.id) {
      console.error('[Chatwoot Debug] Failed to find or create conversation', conversation);
      return null;
    }

    console.log(`[Chatwoot Debug] Conversation ID: ${conversation.id}. Posting message...`);

    const msgRes = await fetch(`${cwUrl}/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: media_url ? `${messageContent || ''}\n[Media (${message_type})]: ${media_url}`.trim() : messageContent,
        message_type: senderRole === 'assistant' ? 'outgoing' : 'incoming'
      })
    });

    if (!msgRes.ok) {
      const msgError = await msgRes.json();
      console.error('[Chatwoot Debug] Error posting message:', msgError);
    } else {
      console.log(`[Chatwoot Debug] Message synced successfully to conversation ${conversation.id}`);
    }

    return conversation.id;
  } catch (error) {
    console.error('[Chatwoot Debug] Global error in syncWithChatwoot:', error);
    return null;
  }
}

// Scheduler: Check for reminders every minute
setInterval(() => {
  console.log('Checking for appointment reminders...');
  try {
    const reminders = db.prepare(`
      SELECT * FROM appointments 
      WHERE datetime(appointment_date) > datetime('now', '-6 hours') 
      AND datetime(appointment_date) < datetime('now', '-6 hours', '+24 hours') 
      AND reminder_sent = 0 
      AND status = 'confirmed'
    `).all();

    if (reminders.length > 0) {
      console.log(`Found ${reminders.length} pending reminders.`);
    }

    reminders.forEach(async (appt) => {
      const date = new Date(appt.appointment_date + '-06:00').toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'America/Mexico_City'
      });

      const settings = db.prepare('SELECT bot_name FROM clinic_settings WHERE id = 1').get();
      const botName = settings ? (settings.bot_name || 'AI Assistant') : 'AI Assistant';

      const message = `👋 Hola ${appt.patient_name}, paso a recordarte de parte de ${botName} que tienes una cita de ${appt.appointment_type} el ${date}. ¡Nos vemos pronto!`;

      await sendWhatsAppMessage(appt.phone_number, message);

      db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
        .run(appt.phone_number, message, 'assistant', new Date().toISOString());

      db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(appt.id);
    });

  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
