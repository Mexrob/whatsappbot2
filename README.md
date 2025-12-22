# Erika IA - Gestión de Clínica Estética

Erika IA es una plataforma de gestión para clínicas estéticas que incluye un dashboard administrativo y un bot de WhatsApp inteligente.

## Características

- 📊 **Dashboard Administrativo**: Gestiona citas, mensajes y configuración de la clínica.
- 🤖 **Bot de WhatsApp**: Integración con Gemini AI para agendar citas automáticamente.
- 📱 **Diseño Responsive**: Interfaz moderna y optimizada.

## Estructura del Proyecto

- `src/`: Frontend en React + Vite + Tailwind CSS.
- `server/`: Backend local en Node.js + Express + SQLite.
- `supabase/`: Funciones Edge de Supabase para la integración con WhatsApp.

## Configuración

1. **Backend Local**:
   - El dashboard usa un servidor local en el puerto 3001.
   - Los datos se guardan en `server/database.sqlite`.

2. **Variables de Entorno**:
   - Copia `.env.example` a `.env` y rellena las claves de Gemini y Twilio.

3. **Ejecución**:
   ```bash
   npm run dev
   ```
   Esto iniciará tanto el frontend (5173) como el backend (3001).

4. **Integración con WhatsApp**:
   - Debes configurar el webhook de Twilio hacia la función de Supabase o exponer tu servidor local mediante `ngrok`.
