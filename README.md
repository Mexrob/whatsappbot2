# ROM IA - Gestión de reservaciones por whatsapp con inteligencia artificial 

ROM IA es una plataforma de gestión de reservaciones por whatsapp con inteligencia artificial que incluye un dashboard administrativo y un bot de WhatsApp inteligente.

## Características

- 📊 **Dashboard Administrativo**: Gestiona citas, mensajes y configuración de la empresa.
- 🤖 **Bot de WhatsApp**: Integración con Gemini AI para agendar citas automáticamente.
- 📱 **Diseño Responsive**: Interfaz moderna y optimizada.

## Estructura del Proyecto

- `src/`: Frontend en React + Vite + Tailwind CSS.
- `server/`: Backend local en Node.js + Express + SQLite.

## Configuración

1. **Backend Local**:
   - El dashboard usa un servidor local en el puerto 3001.
   - Los datos se guardan en `server/database.sqlite`.

2. **Variables de Entorno**:
   - Crea un archivo `.env` en la raíz (usa `.env.example` como base si existe) y rellena las claves de Gemini y YCloud.
   - **GEMINI_API_KEY**: Tu clave de Google AI Studio.
   - **YCLOUD_API_KEY**: Tu clave de API de YCloud.
   - **YCLOUD_FROM**: Tu número o Sender ID de WhatsApp en YCloud.
   - **YCLOUD_WABA_ID**: Tu WhatsApp Business Account ID.

3. **Ejecución**:
   ```bash
   npm run dev
   ```
   Esto iniciará tanto el frontend (5173) como el backend (3001).

4. **Integración con WhatsApp (YCloud)**:
   - Configura el Webhook en tu panel de YCloud apuntando a: `http://TU_IP_VPS:3001/api/webhook/whatsapp`.
   - Asegúrate de que el puerto 3001 esté abierto en el firewall de tu VPS.
