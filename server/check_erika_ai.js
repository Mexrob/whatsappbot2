const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('/home/roberto/Escritorio/Erika_AI/server/database.sqlite');
const settings = db.prepare('SELECT * FROM clinic_settings').all();
console.log('Settings Erika_AI:', JSON.stringify(settings, null, 2));
const lastMsg = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 5').all();
console.log('Last Messages Erika_AI:', JSON.stringify(lastMsg, null, 2));
