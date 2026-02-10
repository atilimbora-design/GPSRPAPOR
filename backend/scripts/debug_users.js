const db = require('../config/database');

console.log('Checking users...');

setTimeout(() => {
    db.get("SELECT * FROM users WHERE id = 1", [], (err, row) => {
        if (err) console.error(err);
        else console.log('User 1:', row);
    });
}, 1000);
