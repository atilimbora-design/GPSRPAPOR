const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Absolute path to guarantee we find it
const DB_PATH = 'c:/Users/user/Documents/Atilim/backend/database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

console.log("Checking DB at:", DB_PATH);

db.all("SELECT id, username, role, full_name, password_hash FROM users", (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log("Mevcut Kullanıcılar:", rows.map(r => ({ ...r, password_hash: 'HASHED' })));
    }
    db.close();
});
