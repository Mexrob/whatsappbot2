const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Auth Routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    res.json({ success: true, user: { email: user.email, role: user.role, permissions: JSON.parse(user.permissions || '{}') } });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

// User Management
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, email, role, permissions FROM users').all();
  users.forEach(u => {
    u.permissions = JSON.parse(u.permissions || '{}');
  });
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { email, password, role, permissions } = req.body;
  try {
    db.prepare('INSERT INTO users (email, password, role, permissions) VALUES (?, ?, ?, ?)').run(email, password, role || 'staff', JSON.stringify(permissions || {}));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { email, password, role, permissions } = req.body;

  try {
    if (password) {
      db.prepare('UPDATE users SET email = ?, password = ?, role = ?, permissions = ? WHERE id = ?')
        .run(email, password, role, JSON.stringify(permissions), id);
    } else {
      db.prepare('UPDATE users SET email = ?, role = ?, permissions = ? WHERE id = ?')
        .run(email, role, JSON.stringify(permissions), id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
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

// Availability
app.get('/api/availability', (req, res) => {
  const slots = db.prepare('SELECT * FROM availability ORDER BY start_time ASC').all();
  res.json(slots);
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

app.post('/api/appointments', (req, res) => {
  const { phone_number, patient_name, appointment_date, appointment_type } = req.body;
  db.prepare('INSERT INTO appointments (phone_number, patient_name, appointment_date, appointment_type) VALUES (?, ?, ?, ?)')
    .run(phone_number, patient_name, appointment_date, appointment_type);
  res.json({ success: true });
});

app.put('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status, appointment_date } = req.body;
  console.log('Update appointment request. ID:', id, 'Body:', req.body);

  if (status) {
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
  } else if (appointment_date) {
    db.prepare('UPDATE appointments SET appointment_date = ? WHERE id = ?').run(appointment_date, id);
  }

  res.json({ success: true });
});

app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  console.log('Delete appointment request. ID:', id);
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  res.json({ success: true });
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
    return res.status(200).send('OK'); // Acknowledge other event types (deliveries, etc.)
  }

  let Body = inboundData.text?.body || '';
  let phoneNumber = inboundData.from;
  const profileName = inboundData.customerProfile?.name;
  let messageType = 'text';
  let mediaUrl = null;

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

    console.log('Webhook triggered (YCloud). From:', phoneNumber, 'Type:', messageType, 'Body:', Body);
    // 1. Save user message
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, message_type, media_url, received_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(phoneNumber, Body, 'user', messageType, mediaUrl, new Date().toISOString());

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

    REGLAS CRÍTICAS DE AGENDAMIENTO:
    1. DISPONIBILIDAD (REGLA DE ORO): NUNCA repitas horarios que viste en mensajes anteriores del chat. La agenda cambia constantemente. SIEMPRE que el usuario pregunte por horarios o disponibilidad, DEBES llamar a 'get_available_slots' de nuevo. Considera que cualquier lista de horarios en el historial de mensajes es OBSOLETA E INVÁLIDA. Solo el resultado de la función que llames AHORA es real.
    
    2. AGENDAMIENTO (NUEVA CITA):
       - Si el usuario confirma un horario Y ya tienes su nombre (${extractedName || 'desconocido'}): Llama a 'schedule_appointment' inmediatamente. No pidas confirmación, solo agenda.
       - Si no tienes el nombre: Pídelo.
    
    3. REPROGRAMACIÓN:
       - Usa 'get_my_appointments' para ver qué citas tiene el usuario.
       - Usa 'reschedule_appointment' en cuanto tengas el ID y la nueva fecha.
    
    4. ACCIÓN OBLIGATORIA: Tienes PROHIBIDO decir "Estos son los horarios" o "He agendado" sin haber llamado a la función correspondiente en este turno. Si no aparece una llamada a función en tu respuesta, no puedes listar horarios.
    
    5. No inventes IDs de citas ni nombres de pacientes.
    
    6. La fecha debe estar en formato ISO (YYYY-MM-DDTHH:mm).
    
    7. PROHIBICIÓN DE CÓDIGO: Tu respuesta debe ser 100% lenguaje natural. SIEMPRE ejecuta las funciones, no las menciones.
    
    8. REGLA DE ENLACES: El enlace debe terminar con un espacio o un salto de línea.
    
    9. Sé concisa y natural. Ignora listas de horarios previas.
    
    ${extractedName
        ? `\n[DATOS DEL PACIENTE] Nombre: ${extractedName}. YA TIENES EL NOMBRE. ÚSALO para agendar automáticamente.`
        : `\n[DATOS DEL PACIENTE] Nombre: Desconocido. Pídelo antes de agendar.`}`;

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

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        tools: tools,
        tool_config: { function_calling_config: { mode: "AUTO" } }
      })
    });

    const geminiData = await geminiRes.json();
    console.log('Gemini Response Data:', JSON.stringify(geminiData));

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
              db.prepare('INSERT INTO appointments (phone_number, patient_name, appointment_date, appointment_type) VALUES (?, ?, ?, ?)')
                .run(phoneNumber, patient_name, appointment_date, appointment_type);

              const apptDate = new Date(appointment_date + '-06:00');
              const formattedDate = apptDate.toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                dateStyle: 'long',
                timeStyle: 'short'
              });

              aiResponse = `¡Perfecto! He agendado tu cita de ${appointment_type} para el ${formattedDate}. ¿Te puedo ayudar en algo más?`;
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
              const list = slots.map(s => {
                return `- ${new Date(s.start_time).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', timeZone: 'America/Mexico_City' })}`;
              }).join('\n');
              aiResponse = `Estos son los horarios que tengo libres próximamente:\n${list}\n¿Te queda bien alguno?`;
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
            } else if (alreadyBooked) {
              aiResponse = "Lo siento, ese nuevo horario ya está ocupado. ¿Te gustaría intentar con otro?";
            } else {
              const result = db.prepare("UPDATE appointments SET appointment_date = ?, status = 'confirmed' WHERE id = ? AND phone_number = ?")
                .run(new_date, appointment_id, phoneNumber);

              console.log(`DEBUG: Update Result:`, result);

              if (result.changes > 0) {
                const formattedDate = new Date(new_date + '-06:00').toLocaleString('es-MX', {
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
  if (process.env.ACTIVATE_CHATWOOT !== 'true') return null;

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
