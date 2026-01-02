# Guía de Configuración: Google Calendar API

Para que Erika AI pueda gestionar tu calendario, necesitas crear una "Cuenta de Servicio" (Service Account) en Google Cloud. Sigue estos pasos:

## 1. Crear un Proyecto en Google Cloud
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Haz clic en el selector de proyectos (arriba a la izquierda) y selecciona **"Nuevo proyecto"**.
3. Ponle un nombre (ej. `Erika-AI-Calendar`) y dale a **"Crear"**.

## 2. Habilitar la API de Google Calendar
1. En el buscador de arriba, escribe **"Google Calendar API"**.
2. Selecciónala en los resultados y haz clic en el botón azul **"Habilitar"**.

## 3. Crear la Cuenta de Servicio
1. En el menú lateral izquierdo, ve a **"APIs y servicios"** > **"Credenciales"**.
2. Haz clic en **"+ Crear credenciales"** (arriba) y elige **"Cuenta de servicio"**.
3. Rellena los detalles básicos:
   - Nombre: `erika-bot`
   - ID: Se generará solo (guárdalo, parece un email: `erika-bot@tu-proyecto.iam.gserviceaccount.com`).
4. Haz clic en **"Crear y continuar"**.
5. (Opcional) En el paso de roles, puedes omitirlo o poner "Editor". Haz clic en **"Listo"**.

## 4. Descargar el archivo JSON (La Llave)
1. En la misma pantalla de "Credenciales", busca abajo la sección **"Cuentas de servicio"** y haz clic en el email que acabas de crear.
2. Ve a la pestaña superior que dice **"Claves"** (Keys).
3. Haz clic en **"Agregar clave"** > **"Crear clave nueva"**.
4. Selecciona el formato **JSON** y haz clic en **"Crear"**.
5. Se descargará un archivo `.json` a tu computadora. **¡Guárdalo bien!**
6. Cambia el nombre del archivo a `google-credentials.json` y muévelo a la carpeta `/server/` de este proyecto.

## 5. ¡Paso Crítico! Compartir tu Calendario
Para que el bot tenga permiso de escribir en TU calendario personal:
1. Abre tu [Google Calendar](https://calendar.google.com/) personal.
2. En la lista de la izquierda, busca tu calendario principal, haz clic en los 3 puntos y elige **"Configuración y uso compartido"**.
3. Baja hasta la sección **"Compartir con personas o grupos específicos"**.
4. Haz clic en **"Agregar personas"**.
5. Pega el **Email de la Cuenta de Servicio** que anotaste en el paso 3 (ej. `erika-bot@...`).
6. En permisos, asegúrate de seleccionar **"Realizar cambios y gestionar el uso compartido"**.
7. Haz clic en **"Enviar"**.

---
*Una vez hecho esto, reinicia el servidor y Erika AI estará lista para agendar citas.*
