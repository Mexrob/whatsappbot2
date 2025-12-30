#!/bin/bash

# Configuration
VPS_IP="154.12.247.115"
VPS_USER="root"
VPS_PASS="IdX86ci7"
APP_NAME="erika-ai"
REMOTE_DIR="/home/erika/erika-ai"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Starting Automated Deployment to $VPS_IP...${NC}"

# Check for sshpass
if ! command -v sshpass &> /dev/null; then
    echo "sshpass could not be found. Please install it."
    exit 1
fi

echo -e "${YELLOW}📦 1. Preparing Remote VPS (Installing Node, Nginx, PM2, and creating user 'erika')...${NC}"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
    set -e
    
    # Update System
    export DEBIAN_FRONTEND=noninteractive
    apt-get update && apt-get upgrade -y
    
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs nginx git
    
    # Install PM2
    npm install -g pm2
    
    # Create user erika if not exists
    if ! id "erika" &>/dev/null; then
        adduser --disabled-password --gecos "" erika
        usermod -aG sudo erika
    fi
    
    # Setup Directory
    mkdir -p /home/erika/erika-ai
    chown -R erika:erika /home/erika
    
    # Enable Firewall
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    ufw --force enable
EOF

echo -e "${YELLOW}📁 2. Uploading Project Files...${NC}"
# Create a temporary tarball excluding node_modules and git
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf deploy_package.tar.gz .

# Upload tarball
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no deploy_package.tar.gz $VPS_USER@$VPS_IP:/home/erika/

# Extract on server
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
    cd /home/erika
    tar -xzf deploy_package.tar.gz -C erika-ai
    rm deploy_package.tar.gz
    chown -R erika:erika erika-ai
EOF

# Cleanup local tarball
rm deploy_package.tar.gz

echo -e "${YELLOW}🏗️  3. Installing Dependencies & Building (Remote)...${NC}"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
    su - erika -c "cd erika-ai && npm install"
    su - erika -c "cd erika-ai/server && npm install"
    
    # Setup .env if not exists (Copy example)
    if [ ! -f /home/erika/erika-ai/.env ]; then
        echo "Creating default .env..."
        cp /home/erika/erika-ai/.env.example /home/erika/erika-ai/.env 2>/dev/null || touch /home/erika/erika-ai/.env
        # Ensure PORT is 3001
        echo "PORT=3001" >> /home/erika/erika-ai/.env
    fi
    
    # Build Frontend
    su - erika -c "cd erika-ai && npm run build"
EOF

echo -e "${YELLOW}🚀 4. Starting Application...${NC}"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
    su - erika -c "pm2 stop erika-backend 2>/dev/null || true"
    su - erika -c "cd erika-ai && pm2 start server/index.js --name 'erika-backend'"
    su - erika -c "pm2 save"
EOF

echo -e "${YELLOW}🌐 5. Configuring Nginx...${NC}"
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
    # Copy Nginx config
    cp /home/erika/erika-ai/nginx.conf.example /etc/nginx/sites-available/erika-ai
    
    # Basic modification for IP-based access if domain not ready
    sed -i 's/tu-dominio.com/154.12.247.115 _/g' /etc/nginx/sites-available/erika-ai
    
    # Enable site
    ln -sf /etc/nginx/sites-available/erika-ai /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t
    systemctl restart nginx
EOF

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "Access your app at: http://$VPS_IP"
