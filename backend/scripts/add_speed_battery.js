const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Adding speed and battery_level columns to users table...");

    db.run("ALTER TABLE users ADD COLUMN speed REAL DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Error adding speed:", err.message);
        } else {
            console.log("✅ speed column added (or already exists).");
        }
    });

    db.run("ALTER TABLE users ADD COLUMN battery_level INTEGER DEFAULT 100", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Error adding battery_level:", err.message);
        } else {
            console.log("✅ battery_level column added (or already exists).");
        }
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err);
        else console.log("Database closed.");
    });
}, 2000);
