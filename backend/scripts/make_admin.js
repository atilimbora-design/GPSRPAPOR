const db = require('../config/database');

console.log('Updating user role...');

setTimeout(() => {
    db.run("UPDATE users SET role = 'admin' WHERE id = 1", [], function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Row(s) updated: ${this.changes}`);
            console.log('User 1 is now ADMIN.');
        }
    });
}, 1000);
