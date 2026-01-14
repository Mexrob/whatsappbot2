#!/bin/bash
PASS="IdX86ci7"
IP="154.12.247.115"
USER="root"

echo "📦 Preparing files..."

deploy_to_path() {
    local PATH_NAME=$1
    local PM2_NAME=$2
    local TARGET_USER=$3
    
    echo "🚀 Deploying to $PM2_NAME ($PATH_NAME) as $TARGET_USER..."
    
    # Sync dist folder
    sshpass -p "$PASS" scp -o StrictHostKeyChecking=no -r dist $USER@$IP:$PATH_NAME/
    
    # Sync server files
    sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/index.js $USER@$IP:$PATH_NAME/server/
    sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/db.js $USER@$IP:$PATH_NAME/server/
    sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/package.json $USER@$IP:$PATH_NAME/server/
    
    # Restart
    if [ "$TARGET_USER" == "root" ]; then
        sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$IP "pm2 restart $PM2_NAME || echo 'Warning: PM2 process $PM2_NAME not found for root'"
    else
        sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$IP "sudo -u $TARGET_USER pm2 restart $PM2_NAME || echo 'Warning: PM2 process $PM2_NAME not found for $TARGET_USER'"
    fi
}

# Deploy to all known locations
deploy_to_path "/root/whatsappbot2" "erika-backend" "root"
deploy_to_path "/root/whatsappbot2_inst2" "erika-inst2" "root"
deploy_to_path "/home/erika/erika-ai" "erika-backend" "erika"

echo "✅ All instances updated and restarted!"
