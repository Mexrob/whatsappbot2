import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

Deno.serve(async (req) => {
  try {
    const formData = await req.formData()
    const body = formData.get('Body')
    const from = formData.get('From')

    if (!body || !from) {
      return new Response('Missing Body or From', { status: 400 })
    }

    const phoneNumber = from.replace('whatsapp:', '')

    // 1. Save user message
    await supabase.from('messages').insert({
      phone_number: phoneNumber,
      message_content: body,
      sender: 'user'
    })

    // 2. Get Clinic Settings & History
    const { data: settings } = await supabase.from('clinic_settings').select('*').single()
    const { data: history } = await supabase
      .from('messages')
      .select('message_content, sender')
      .eq('phone_number', phoneNumber)
      .order('received_at', { ascending: false })
      .limit(10)

    const localTime = new Date().toLocaleString('es-MX', { timeZone: settings.timezone })

    // 3. Call Gemini (Real API fetch)
    const systemPrompt = `Eres Erika, la asistente virtual de la clínica ${settings.clinic_name}. 
    Tu objetivo es agendar citas y resolver dudas. 
    Hora actual de la clínica: ${localTime}.
    Servicios: ${settings.services}.
    Dirección: ${settings.clinic_address}.
    Usa un tono profesional, amable y estético. 
    Si el usuario quiere agendar, indícale los servicios y confirma su interés.`

    const contents = [
      ...history.reverse().map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.message_content }]
      })),
      { role: 'user', parts: [{ text: `System context: ${systemPrompt}\nUser message: ${body}` }] }
    ]

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    const geminiData = await geminiRes.json()
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías repetirlo?"

    // 4. Save AI message
    await supabase.from('messages').insert({
      phone_number: phoneNumber,
      message_content: aiResponse,
      sender: 'assistant'
    })

    // 5. Send via Twilio (Real API call)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

    await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: from,
        From: TWILIO_PHONE_NUMBER,
        Body: aiResponse
      })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
