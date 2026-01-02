const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));
const settings = db.prepare('SELECT * FROM clinic_settings').all();
console.log('Settings:', JSON.stringify(settings, null, 2));
const lastMsg = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 5').all();
console.log('Last Messages:', JSON.stringify(lastMsg, null, 2));
