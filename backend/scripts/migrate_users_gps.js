const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Checking users table schema...");

    // Check if latitude column exists
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error(err);
            return;
        }

        const hasLat = columns.some(c => c.name === 'latitude');

        if (!hasLat) {
            console.log("Adding latitude and longitude columns to users table...");
            db.run("ALTER TABLE users ADD COLUMN latitude REAL DEFAULT 0");
            db.run("ALTER TABLE users ADD COLUMN longitude REAL DEFAULT 0");
            console.log("Columns added.");
        } else {
            console.log("Columns already exist.");
        }
    });

    // Also need to check if we need to clean up any old 'gps_locations' table if we are moving to users table?
    // No, maybe keep it for history if needed later.
});

db.close();
