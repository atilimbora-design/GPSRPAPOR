const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Adding last_location_update column to users table...");

    db.run("ALTER TABLE users ADD COLUMN last_location_update DATETIME", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Error adding last_location_update:", err.message);
        } else {
            console.log("✅ last_location_update column added (or already exists).");
        }
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err);
        else console.log("Database closed.");
    });
}, 2000);
