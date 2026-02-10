const db = require('../config/database');

console.log('Checking recent orders...');

setTimeout(() => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Recent Orders:', JSON.stringify(rows, null, 2));
        }
    });

    // Also check order items
    db.all("SELECT * FROM order_items ORDER BY id DESC LIMIT 5", [], (err, rows) => {
        if (err) console.error(err);
        else console.log('Recent Items:', JSON.stringify(rows, null, 2));
    });

}, 1000); // Wait for db connection
