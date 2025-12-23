const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// Auth Routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    res.json({ success: true, user: { email: user.email } });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

// User Management
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, email FROM users').all();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { email, password } = req.body;
  try {
    db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, password);
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
    const { clinic_name, clinic_address, clinic_phone, services, whatsapp_webhook_url, timezone } = req.body;
    const result = db.prepare('UPDATE clinic_settings SET clinic_name = ?, clinic_address = ?, clinic_phone = ?, services = ?, whatsapp_webhook_url = ?, timezone = ? WHERE id = 1')
      .run(clinic_name, clinic_address, clinic_phone, services, whatsapp_webhook_url, timezone);
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
  const messages = db.prepare('SELECT * FROM messages ORDER BY received_at DESC').all();
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  console.log('DEBUG: Received message save request:', req.body);
  const { phone_number, message_content, sender } = req.body;
  try {
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
      .run(phone_number, message_content, sender, new Date().toISOString());
    console.log('DEBUG: Message save result:', result);
    res.json({ success: true });
  } catch (error) {
    console.error('DEBUG: Database Error during message save:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// WhatsApp Webhook (Local version)
app.post('/api/webhook/whatsapp', async (req, res) => {
  const { Body, From } = req.body;
  const phoneNumber = From.replace('whatsapp:', '');

  try {
    console.log('Webhook triggered. From:', From, 'Body:', Body);
    // 1. Save user message
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
      .run(phoneNumber, Body, 'user', new Date().toISOString());

    // 2. Get Clinic Settings & History
    const settings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
    const history = db.prepare('SELECT message_content, sender FROM messages WHERE phone_number = ? ORDER BY received_at DESC LIMIT 10')
      .all(phoneNumber);

    const localTime = new Date().toLocaleString('es-MX', { timeZone: settings.timezone });

    // 3. Call Gemini
    const systemPrompt = `Eres Erika, la asistente virtual de la clínica ${settings.clinic_name}. 
    Tu objetivo es agendar citas, reprogramarlas y resolver dudas. 
    Hora actual de la clínica: ${localTime}.
    Servicios: ${settings.services}.
    Dirección: ${settings.clinic_address}.
    Usa un tono profesional, amable y estético. 

    REGLAS DE AGENDAMIENTO:
    1. ANTES de ofrecer horarios por primera vez, usa 'get_available_slots' para saber qué hay libre.
    2. Si YA mostraste los horarios disponibles en el mensaje anterior, NO los vuelvas a mostrar.
    3. Si el usuario menciona un día/hora que acabas de mostrar, interpreta que quiere ese horario y procede a agendar.
    4. ANTES de agendar, SIEMPRE pregunta el nombre completo del paciente si no lo sabes.
    5. Para agendar usa 'schedule_appointment' SOLO si:
       - Tienes el nombre completo del paciente
       - El horario coincide con un slot disponible que mostraste
    6. Si el usuario dice algo como "el sábado" o "sábado 27 a las 12", interpreta la hora en formato de 12 horas (12:00 PM).
    7. Si el usuario quiere CAMBIAR, MOVER o REPROGRAMAR una cita:
       - Primero usa 'get_my_appointments' para ver qué citas tiene activas.
       - Si tiene citas, pregúntale cuál quiere cambiar o usa 'reschedule_appointment' si hay una clara para cambiar.
    8. La fecha debe estar en formato ISO (YYYY-MM-DDTHH:mm).
    9. NUNCA uses placeholders como "[Nombre del paciente]" - siempre usa el nombre real que te dé el usuario.
    10. Sé concisa. Si el usuario ya eligió un horario, solo pide el nombre y agenda.`;

    const contents = [
      ...history.reverse().map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.message_content }]
      })),
      { role: 'user', parts: [{ text: `System context: ${systemPrompt}\nUser message: ${Body}` }] }
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

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        tools: tools,
        tool_config: { function_calling_config: { mode: "ANY" } }
      })
    });

    const geminiData = await geminiRes.json();
    console.log('Gemini Response Data:', JSON.stringify(geminiData));

    let aiResponse = "Lo siento, Erika está teniendo problemas de conexión.";

    if (geminiData.error) {
      console.error('Gemini API Error:', geminiData.error);
      if (geminiData.error.code === 429) {
        aiResponse = "Erika ha superado su límite mensual de mensajes gratuitos. Por favor, revisa tu cuota en Google AI Studio o intenta de nuevo mañana.";
      } else {
        aiResponse = `Erika tiene un inconveniente técnico (Error ${geminiData.error.code}). Por favor, contacta a soporte.`;
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
            // appointment_date comes from AI in CDMX local time (e.g., "2025-12-27T13:00")
            // But availability slots are stored in UTC
            // CDMX is UTC-6, so we need to add 6 hours to convert to UTC
            const apptDateLocal = new Date(appointment_date);
            const apptDateUTC = new Date(apptDateLocal.getTime() + (6 * 60 * 60 * 1000));
            const apptDateUTCString = apptDateUTC.toISOString().slice(0, 16); // "2025-12-27T19:00"

            const valid = db.prepare(`
              SELECT id FROM availability 
              WHERE datetime(?) >= datetime(start_time) 
              AND datetime(?) < datetime(end_time)
            `).get(apptDateUTCString, apptDateUTCString);

            if (!valid) {
              aiResponse = "Lo siento, ese horario ya no está disponible o no está abierto en nuestra agenda. ¿Te gustaría ver otras opciones?";
            } else {
              db.prepare('INSERT INTO appointments (phone_number, patient_name, appointment_date, appointment_type) VALUES (?, ?, ?, ?)')
                .run(phoneNumber, patient_name, appointment_date, appointment_type);

              // Format the date correctly for CDMX timezone
              // appointment_date comes as "2025-12-27T13:00" (naive, no timezone)
              // We need to interpret it as CDMX time and display it as such
              const apptDate = new Date(appointment_date + '-06:00'); // Explicitly mark as CDMX (UTC-6)
              const formattedDate = apptDate.toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                dateStyle: 'long',
                timeStyle: 'short'
              });

              aiResponse = `¡Perfecto! He agendado tu cita de ${appointment_type} para el ${formattedDate}. ¿Te puedo ayudar en algo más?`;
            }
          }
          else if (name === 'get_available_slots') {
            const slots = db.prepare("SELECT start_time FROM availability WHERE start_time > datetime('now', '-6 hours') ORDER BY start_time ASC LIMIT 10").all();
            if (slots.length === 0) {
              aiResponse = "Por el momento no tengo horarios disponibles en el sistema. Por favor, intenta contactar directamente a la clínica.";
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
              const list = appts.map(a => `- ID ${a.id}: ${a.appointment_type} el ${new Date(a.appointment_date).toLocaleString('es-MX')}`).join('\n');
              aiResponse = `Tienes estas citas registradas:\n${list}\n¿Cuál de ellas te gustaría reprogramar?`;
            }
          }
          else if (name === 'reschedule_appointment') {
            const { appointment_id, new_date } = args;
            const result = db.prepare('UPDATE appointments SET appointment_date = ? WHERE id = ? AND phone_number = ?')
              .run(new_date, appointment_id, phoneNumber);

            if (result.changes > 0) {
              aiResponse = `¡Listo! He reprogramado tu cita para el ${new Date(new_date).toLocaleString('es-MX')}.`;
            } else {
              aiResponse = "No pude encontrar esa cita para reprogramarla. Por favor, confírmame el horario actual.";
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
    // Convert 'From' (e.g. whatsapp:+123) to plain number if helper expects it, 
    // but helper expects 'to' and prepends 'whatsapp:'. 
    // Wait, helper expects `to` to be JUST the number in `whatsapp:${to}` line.
    // The `phoneNumber` var already has 'whatsapp:' stripped (line 135).
    await sendWhatsAppMessage(phoneNumber, aiResponse);

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

// Helper: Send WhatsApp Message
async function sendWhatsAppMessage(to, body) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: `whatsapp:${to}`,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: body
      })
    });

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${response.statusText}`);
    }
    console.log(`Message sent to ${to}: ${body.substring(0, 20)}...`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

// Scheduler: Check for reminders every minute
setInterval(() => {
  console.log('Checking for appointment reminders...');
  try {
    // Logic: Catch-up mode adjusted for CDMX (-6h) and Format Normalization ('T' vs space).
    // Stored dates are CDMX (e.g., 2025-12-23T14:00).
    // Server time is UTC. We shift server time by -6h to compare apples to apples.
    // We also use datetime(appointment_date) to ensure consistent format for comparison string-wise.
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
      // Format: "lunes, 23 de diciembre, 02:00 p. m."
      const date = new Date(appt.appointment_date).toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'America/Mexico_City'
      });

      const message = `👋 Hola ${appt.patient_name}, paso a recordarte de parte de Erika AI que tienes una cita de ${appt.appointment_type} el ${date}. ¡Nos vemos pronto!`;

      // Send Message
      await sendWhatsAppMessage(appt.phone_number, message);

      // Save as system message in chat history
      db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
        .run(appt.phone_number, message, 'assistant', new Date().toISOString());

      // Mark as sent
      db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(appt.id);
    });

  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}, 60 * 1000); // Run every minute

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
