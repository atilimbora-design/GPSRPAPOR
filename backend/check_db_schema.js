const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/atilim.db');

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    // Check tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) console.error(err);
        console.log("Tables:", tables);
    });

    // Check products
    db.all("SELECT count(*) as count FROM products", [], (err, row) => {
        if (err) console.log("Products error:", err.message); // Likely 'no such table'
        else console.log("Product count:", row[0].count);
    });
});

setTimeout(() => db.close(), 1000);
