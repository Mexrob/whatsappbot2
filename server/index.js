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

app.post('/api/messages', async (req, res) => {
  console.log('DEBUG: Received message save request:', req.body);
  let { phone_number, message_content, sender } = req.body;

  // Normalize Mexican phone numbers (+521... -> +52...)
  if (phone_number.startsWith('+521') && phone_number.length === 14) {
    phone_number = '+52' + phone_number.substring(4);
  }

  try {
    // Save message to database
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
      .run(phone_number, message_content, sender, new Date().toISOString());

    // If sender is assistant (admin), send via WhatsApp
    if (sender === 'assistant') {
      await sendWhatsAppMessage(phone_number, message_content);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('DEBUG: Database Error during message save:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// WhatsApp Webhook (Local version)
app.post('/api/webhook/whatsapp', async (req, res) => {
  const { Body, From } = req.body;
  let phoneNumber = From.replace('whatsapp:', '');

  // Normalize Mexican phone numbers (+521... -> +52...)
  if (phoneNumber.startsWith('+521') && phoneNumber.length === 14) {
    phoneNumber = '+52' + phoneNumber.substring(4);
  }

  try {
    console.log('Webhook triggered. From:', From, 'Body:', Body, '(Normalized to:', phoneNumber, ')');
    // 1. Save user message
    db.prepare('INSERT INTO messages (phone_number, message_content, sender, received_at) VALUES (?, ?, ?, ?)')
      .run(phoneNumber, Body, 'user', new Date().toISOString());

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
    const systemPrompt = `Eres Erika, la asistente virtual de la clínica ${settings.clinic_name}. 
    Tu objetivo es agendar citas, reprogramarlas y resolver dudas. 
    Hora actual de la clínica: ${localTime}.
    Servicios: ${settings.services}.
    Dirección: ${settings.clinic_address}.
    Usa un tono profesional, amable y estético. 

    REGLAS CRÍTICAS DE AGENDAMIENTO:
    1. FLUJO NORMAL DE AGENDAMIENTO:
       a) Primera vez: Usa 'get_available_slots' para mostrar horarios disponibles
       b) Usuario elige horario: Responde SOLO CON TEXTO pidiendo su nombre (NO llames ninguna función)
       c) Usuario da su nombre: Usa 'schedule_appointment' para confirmar la cita
    
    2. ${justShownSlots ? '⚠️ ACABAS DE MOSTRAR HORARIOS EN TU ÚLTIMO MENSAJE. Si el usuario confirma uno (ej: "Sí, sábado 27 a las 11"), NO llames get_available_slots de nuevo. Solo pide su nombre con texto.' : 'Si necesitas mostrar horarios, usa get_available_slots.'}
    
    3. NUNCA llames funciones cuando solo necesitas pedir información al usuario (como su nombre).
    
    4. Para agendar usa 'schedule_appointment' SOLO cuando:
       - Ya tengas el nombre completo del paciente
       - Ya tengas el horario específico que el usuario eligió
       - El horario coincida con un slot disponible que mostraste
    
    5. Si el usuario dice algo como "sí", "sí me queda bien", "sábado 27 a las 11", etc., después de ver horarios:
       - NO llames ninguna función
       - Responde con texto: "¡Perfecto! ¿Cuál es tu nombre completo?"
    
    6. Si el usuario quiere CAMBIAR, MOVER o REPROGRAMAR una cita:
       - SIEMPRE usa 'get_my_appointments' PRIMERO para obtener los IDs de las citas.
       - Una vez tengas el ID y la nueva fecha, usa 'reschedule_appointment'.
    
    7. La fecha debe estar en formato ISO (YYYY-MM-DDTHH:mm).
    
    8. NUNCA uses placeholders como "[Nombre del paciente]" - siempre usa el nombre real.
    
    9. PROHIBICIÓN DE CÓDIGO: NUNCA muestres código, nombres de funciones o sintaxis de programación (como print(), default_api, python, etc.) al usuario. Tu respuesta debe ser 100% lenguaje natural. SIEMPRE ejecuta las funciones, no las menciones.
    
    10. REGLA DE ENLACES: NUNCA añadas puntos, comas o cualquier signo de puntuación inmediatamente después de una URL (ej: usa "aquí: https://enlace" en lugar de "aquí: https://enlace."). El enlace debe terminar con un espacio o un salto de línea.
    
    11. Sé concisa y natural en tus respuestas.
    
    ${extractedName
        ? `\n[DATOS DEL PACIENTE] Nombre: ${extractedName}. YA TIENES EL NOMBRE. No lo pidas de nuevo. Si vas a agendar, usa este nombre exactamente.`
        : `\n[DATOS DEL PACIENTE] Nombre: Desconocido. Si el usuario elige un horario, DEBES pedir su nombre completo antes de usar 'schedule_appointment'.`}`;

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
            const apptDateLocal = new Date(appointment_date);
            const apptDateUTC = new Date(apptDateLocal.getTime() + (6 * 60 * 60 * 1000));
            const apptDateUTCString = apptDateUTC.toISOString().slice(0, 16);

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

            // FIXED SQL: Using single quotes for 'confirmed' string literal
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

  let formattedTo = to;
  if (to.startsWith('+52') && !to.startsWith('+521') && to.length === 13) {
    formattedTo = '+521' + to.substring(3);
    console.log(`Normalizing Mexican number for Twilio: ${to} -> ${formattedTo}`);
  }

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: `whatsapp:${formattedTo}`,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: body
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio API Error Details:', data);
      throw new Error(`Twilio API Error: ${data.message || response.statusText}`);
    }
    console.log(`Message successfully sent to ${formattedTo}. SID: ${data.sid}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
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

      const message = `👋 Hola ${appt.patient_name}, paso a recordarte de parte de Erika AI que tienes una cita de ${appt.appointment_type} el ${date}. ¡Nos vemos pronto!`;

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
