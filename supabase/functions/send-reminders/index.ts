import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req: Request) => {
  try {
    // 1. Find appointments for tomorrow that haven't sent a reminder
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('appointment_date', `${tomorrowStr}T00:00:00`)
      .lte('appointment_date', `${tomorrowStr}T23:59:59`)

    if (error) throw error

    for (const appt of appointments || []) {
      const message = `Hola ${appt.patient_name}, te recordamos tu cita de ${appt.appointment_type} para mañana a las ${new Date(appt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`
      
      // Logic to send via Twilio would go here
      console.log(`Enviando recordatorio a ${appt.phone_number}: ${message}`)

      // 2. Mark as sent
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id)
    }

    return new Response(JSON.stringify({ success: true, count: appointments?.length }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
