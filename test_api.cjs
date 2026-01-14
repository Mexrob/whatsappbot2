const jwt = require('jsonwebtoken');
const db = require('./server/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

const user = db.prepare('SELECT * FROM users WHERE id = 1').get();
if (!user) {
    console.log('No user with ID 1 found');
    process.exit(1);
}

const userData = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: JSON.parse(user.permissions || '{}')
};

const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '8h' });
console.log('Generated Token:', token);

// Now simulate the /api/users request logic
let query = 'SELECT id, email, name, phone, google_calendar_id, role, permissions FROM users';
let params = [];

if (userData.role !== 'admin') {
    query += ' WHERE id = ?';
    params.push(userData.id);
}

const users = db.prepare(query).all(...params);
users.forEach(u => {
    u.permissions = JSON.parse(u.permissions || '{}');
});

console.log('API Response (users):', JSON.stringify(users, null, 2));
