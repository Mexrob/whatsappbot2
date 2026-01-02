#!/bin/bash
PASS="IdX86ci7"
IP="154.12.247.115"

echo "🚀 Deploying to Instance 1 (+523339819144)..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/index.js root@$IP:/root/whatsappbot2/server/index.js
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/db.js root@$IP:/root/whatsappbot2/server/db.js
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no root@$IP "pm2 restart erika-backend"

echo "🚀 Deploying to Instance 2 (+15558913126 - CardioTest)..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/index.js root@$IP:/root/whatsappbot2_inst2/server/index.js
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no server/db.js root@$IP:/root/whatsappbot2_inst2/server/db.js
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no root@$IP "pm2 restart erika-inst2"

echo "✅ Done!"
