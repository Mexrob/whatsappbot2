#!/bin/bash

# Script de despliegue para Erika AI
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue de Erika AI..."

# Variables
APP_DIR="/home/erika/erika-ai"
BRANCH="main"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Actualizando código desde Git...${NC}"
cd $APP_DIR
git fetch origin
git reset --hard origin/$BRANCH

echo -e "${YELLOW}📚 Instalando dependencias...${NC}"
npm install --production
cd server && npm install --production && cd ..

echo -e "${YELLOW}🏗️  Construyendo frontend...${NC}"
npm run build

echo -e "${YELLOW}🔄 Reiniciando backend con PM2...${NC}"
pm2 restart erika-backend

echo -e "${YELLOW}🧹 Limpiando archivos temporales...${NC}"
pm2 flush

echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status
echo ""
echo "📝 Ver logs en tiempo real:"
echo "   pm2 logs erika-backend"
echo ""
echo "🌐 Tu aplicación está disponible en:"
echo "   https://tu-dominio.com"