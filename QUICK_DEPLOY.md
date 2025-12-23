# 🚀 Despliegue Rápido (Resumen)

## Pre-requisitos
- ✅ VPS con Ubuntu 22.04
- ✅ Dominio registrado
- ✅ Acceso SSH al VPS

---

## 🎯 Comandos Rápidos

### 1️⃣ Preparar VPS (5 min)
```bash
# Conectar
ssh root@TU_IP_VPS

# Instalar todo lo necesario
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
npm install -g pm2

# Crear usuario
adduser erika
usermod -aG sudo erika
su - erika
```

### 2️⃣ Clonar y configurar (3 min)
```bash
cd /home/erika
git clone https://github.com/tu-usuario/erika-ai.git
cd erika-ai

# Instalar dependencias
npm install
cd server && npm install && cd ..

# Configurar variables de entorno
cp .env.production.example .env
nano .env  # Editar con tus API keys

# Build
npm run build
```

### 3️⃣ Configurar Nginx (2 min)
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/erika-ai
sudo nano /etc/nginx/sites-available/erika-ai  # Cambiar "tu-dominio.com"
sudo ln -s /etc/nginx/sites-available/erika-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4️⃣ Iniciar con PM2 (1 min)
```bash
pm2 start server/index.js --name "erika-backend"
pm2 save
pm2 startup  # Ejecutar el comando que muestra
```

### 5️⃣ Configurar SSL (2 min)
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
# Seguir las instrucciones (email, aceptar términos, redirect HTTP->HTTPS)
```

### 6️⃣ Configurar Firewall (1 min)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 7️⃣ Actualizar Twilio
1. Ve a: https://console.twilio.com/
2. Messaging → WhatsApp Sandbox Settings
3. Webhook URL: `https://tu-dominio.com/api/webhook/whatsapp`
4. Save

---

## ✅ Verificar

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs erika-backend

# Probar API
curl https://tu-dominio.com/api/settings
```

**Visita:** https://tu-dominio.com

---

## 🔄 Actualizar después de cambios

```bash
cd /home/erika/erika-ai
./deploy.sh
```

---

## 📊 Comandos útiles

```bash
pm2 status              # Ver estado
pm2 logs erika-backend  # Ver logs
pm2 restart all        # Reiniciar
pm2 stop all          # Detener
pm2 delete all        # Eliminar
```

---

## 🎉 ¡Listo!

Tu aplicación está en producción sin ngrok 🚀

**Tiempo total:** ~15 minutos