# 🚀 Guía Completa: Reemplazar Ngrok por VPS Permanente

## 📋 Tabla de Contenidos
1. [Por qué reemplazar Ngrok](#por-qué-reemplazar-ngrok)
2. [Requisitos Previos](#requisitos-previos)
3. [Paso 1: Preparar el VPS](#paso-1-preparar-el-vps)
4. [Paso 2: Configurar Dominio](#paso-2-configurar-dominio)
5. [Paso 3: Modificar el Proyecto](#paso-3-modificar-el-proyecto)
6. [Paso 4: Desplegar el Backend](#paso-4-desplegar-el-backend)
7. [Paso 5: Configurar Nginx](#paso-5-configurar-nginx)
8. [Paso 6: Configurar SSL](#paso-6-configurar-ssl)
9. [Paso 7: Actualizar Twilio](#paso-7-actualizar-twilio)
10. [Paso 8: Verificación](#paso-8-verificación)

---

## 🤔 Por qué reemplazar Ngrok

### Ngrok (Desarrollo) ❌
- ✗ URL cambia cada vez que reinicias
- ✗ Límite de conexiones (40/min en plan gratuito)
- ✗ Sesiones expiran
- ✗ No profesional para producción
- ✗ Dependencia de servicio externo

### VPS + Dominio (Producción) ✅
- ✓ URL permanente y personalizada
- ✓ Sin límites de conexiones
- ✓ Control total del servidor
- ✓ Profesional y confiable
- ✓ SSL/HTTPS incluido

---

## 📦 Requisitos Previos

### 1. VPS Contratado
- **Providers recomendados:** DigitalOcean, Linode, Vultr, AWS Lightsail
- **Specs mínimas:** 1GB RAM, 1 vCPU, 20GB disco
- **OS:** Ubuntu 22.04 LTS

### 2. Dominio Registrado
- **Providers:** Namecheap, GoDaddy, Cloudflare, Google Domains
- **Ejemplo:** `tu-clinica.com` o `erika-ai.com`

### 3. Acceso SSH al VPS
```bash
ssh root@154.12.247.115
```

---

## 🔧 Paso 1: Preparar el VPS

### 1.1 Conectar al VPS
```bash
ssh root@154.12.247.115
```

### 1.2 Actualizar el sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Crear usuario no-root (seguridad)
```bash
adduser erika
usermod -aG sudo erika
su - erika
```

### 1.4 Instalar Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
node --version  # Verificar instalación
```

### 1.5 Instalar PM2 (Gestor de procesos)
```bash
sudo npm install -g pm2
```

### 1.6 Instalar Git
```bash
sudo apt install -y git
```

---

## 🌐 Paso 2: Configurar Dominio

### 2.1 Obtener IP de tu VPS
```bash
curl ifconfig.me
# Ejemplo: 123.45.67.89
```

### 2.2 Configurar DNS (en tu proveedor de dominio)

Ve a tu proveedor de dominio y agrega estos registros DNS:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | 154.12.247.115 | 3600 |
| A | www | 154.12.247.115 | 3600 |
| CNAME | api | tu-dominio.com | 3600 |

**Ejemplo con Cloudflare:**
```
A     @      154.12.247.115    Auto
A     www    154.12.247.115    Auto
```

### 2.3 Verificar propagación DNS (espera 5-30 minutos)
```bash
# En tu computadora local
ping tu-dominio.com
# Debe responder con la IP de tu VPS
```

---

## 🛠️ Paso 3: Modificar el Proyecto

### 3.1 Eliminar referencia a ngrok en package.json

**ANTES:**
```json
"scripts": {
  "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\" \"npm run dev:tunnel\"",
  "dev:client": "vite",
  "dev:server": "cd server && npx nodemon index.js",
  "dev:tunnel": "cd server && ./ngrok http 3001",
  "build": "vite build"
}
```

**DESPUÉS:**
```json
"scripts": {
  "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
  "dev:client": "vite",
  "dev:server": "cd server && npx nodemon index.js",
  "build": "vite build",
  "start": "node server/index.js"
}
```

### 3.2 Actualizar .env para producción

**Crear `/server/.env` en el VPS:**
```bash
# Google Gemini API
GEMINI_API_KEY=tu_api_key_real_de_gemini

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=tu_sid_real
TWILIO_AUTH_TOKEN=tu_token_real
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Puerto (Nginx hará proxy a este puerto)
PORT=3001

# Node Environment
NODE_ENV=production
```

### 3.3 Modificar server/index.js (opcional - mejoras de producción)

Agregar después de la línea 9:

```javascript
// Configuración para producción
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

---

## 📤 Paso 4: Desplegar el Backend en VPS

### 4.1 Subir el proyecto al VPS

**Opción A: Usando Git (Recomendado)**
```bash
# En el VPS
cd /home/erika
git clone https://github.com/tu-usuario/erika-ai.git
cd erika-ai
```

**Opción B: Usando SCP (desde tu computadora local)**
```bash
# En tu computadora local
scp -r /ruta/del/proyecto erika@TU_IP_VPS:/home/erika/erika-ai
```

### 4.2 Instalar dependencias
```bash
# En el VPS, dentro de /home/erika/erika-ai
npm install

# Instalar dependencias del servidor
cd server
npm install
cd ..
```

### 4.3 Crear archivo .env
```bash
# En el VPS
cd /home/erika/erika-ai
nano .env
# Pega tus variables de entorno
# Guarda con Ctrl+X, luego Y, luego Enter
```

### 4.4 Build del frontend
```bash
npm run build
```

### 4.5 Iniciar con PM2
```bash
pm2 start server/index.js --name "erika-backend"
pm2 save
pm2 startup
# Copia y ejecuta el comando que te muestra PM2
```

### 4.6 Verificar que está corriendo
```bash
pm2 status
pm2 logs erika-backend
```

---

## 🌐 Paso 5: Configurar Nginx

### 5.1 Instalar Nginx
```bash
sudo apt install -y nginx
```

### 5.2 Crear configuración de Nginx
```bash
sudo nano /etc/nginx/sites-available/erika-ai
```

**Pega esta configuración:**

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Logs
    access_log /var/log/nginx/erika-access.log;
    error_log /var/log/nginx/erika-error.log;

    # Aumentar tamaño máximo de body (para uploads)
    client_max_body_size 10M;

    # API Backend (proxy reverso)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts (importante para webhooks)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend estático
    location / {
        root /home/erika/erika-ai/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Archivos estáticos con cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/erika/erika-ai/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.3 Activar la configuración
```bash
sudo ln -s /etc/nginx/sites-available/erika-ai /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar sintaxis
sudo systemctl restart nginx
```

### 5.4 Configurar Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## 🔒 Paso 6: Configurar SSL (HTTPS)

### 6.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtener certificado SSL
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

**Responde las preguntas:**
- Email: tu-email@ejemplo.com
- Términos: A (Aceptar)
- Redirect HTTP to HTTPS: 2 (Sí)

### 6.3 Verificar renovación automática
```bash
sudo certbot renew --dry-run
```

### 6.4 Verificar HTTPS
```bash
# Visita en tu navegador:
https://tu-dominio.com
# Debe mostrar candado verde 🔒
```

---

## 📱 Paso 7: Actualizar Twilio

### 7.1 Ir a Twilio Console
1. Ve a: https://console.twilio.com/
2. Navega a: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. O ve directo a: **Develop** → **Messaging** → **Settings** → **WhatsApp Sandbox**

### 7.2 Actualizar Webhook URL

**ANTES (con ngrok):**
```
https://abc123.ngrok-free.app/api/webhook/whatsapp
```

**DESPUÉS (con tu dominio):**
```
https://tu-dominio.com/api/webhook/whatsapp
```

### 7.3 Configurar:
- **When a message comes in:** `https://tu-dominio.com/api/webhook/whatsapp`
- **Method:** `POST`
- **Save** ✅

---

## ✅ Paso 8: Verificación

### 8.1 Verificar que el backend responde
```bash
curl https://tu-dominio.com/api/settings
# Debe retornar JSON con configuración de la clínica
```

### 8.2 Verificar el frontend
```bash
# Visita en navegador:
https://tu-dominio.com
# Debe cargar la landing page
```

### 8.3 Probar el webhook de WhatsApp
```
1. Envía un mensaje al número de WhatsApp configurado
2. Verifica que Erika responde
3. Revisa logs en el VPS:
   pm2 logs erika-backend
```

### 8.4 Verificar logs de Nginx
```bash
sudo tail -f /var/log/nginx/erika-access.log
sudo tail -f /var/log/nginx/erika-error.log
```

---

## 🎯 Resumen de Cambios

### Antes (Desarrollo con Ngrok)
```
Cliente WhatsApp
    ↓
Twilio
    ↓
https://abc123.ngrok-free.app/api/webhook/whatsapp
    ↓
Ngrok → localhost:3001 (tu computadora)
    ↓
Backend Node.js
```

### Después (Producción con VPS)
```
Cliente WhatsApp
    ↓
Twilio
    ↓
https://tu-dominio.com/api/webhook/whatsapp
    ↓
VPS → Nginx (puerto 80/443)
    ↓
Proxy → localhost:3001
    ↓
Backend Node.js (PM2)
```

---

## 🔧 Comandos Útiles de Mantenimiento

```bash
# Ver logs en tiempo real
pm2 logs erika-backend

# Reiniciar el backend
pm2 restart erika-backend

# Ver estado
pm2 status

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/erika-error.log

# Actualizar código desde Git
cd /home/erika/erika-ai
git pull
npm run build
pm2 restart erika-backend
```

---

## 🚨 Troubleshooting

### Problema: "502 Bad Gateway"
```bash
# Verificar que el backend está corriendo
pm2 status
pm2 logs erika-backend

# Reiniciar
pm2 restart erika-backend
```

### Problema: "Cannot connect to database"
```bash
# Verificar que database.sqlite existe
ls -la /home/erika/erika-ai/server/database.sqlite

# Verificar permisos
chmod 644 /home/erika/erika-ai/server/database.sqlite
```

### Problema: "Twilio webhook failing"
```bash
# Verificar URL en Twilio Console
# Debe ser: https://tu-dominio.com/api/webhook/whatsapp

# Probar manualmente
curl -X POST https://tu-dominio.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"Body":"Hola","From":"whatsapp:+5215551234567"}'
```

---

## 🎉 ¡Listo!

Ahora tu aplicación está:
- ✅ Desplegada en un VPS permanente
- ✅ Con dominio personalizado
- ✅ HTTPS habilitado (SSL)
- ✅ Sin depender de ngrok
- ✅ Lista para producción

**URL de acceso:** https://tu-dominio.com
**Webhook Twilio:** https://tu-dominio.com/api/webhook/whatsapp
