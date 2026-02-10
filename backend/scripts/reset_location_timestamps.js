const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Resetting all last_location_update timestamps...");

    db.run("UPDATE users SET last_location_update = NULL WHERE role = 'personel'", function (err) {
        if (err) {
            console.error("Error:", err.message);
        } else {
            console.log(`✅ Reset ${this.changes} user location timestamps.`);
            console.log("Now only actively connected users will show as online.");
        }
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err);
        else console.log("Database closed.");
    });
}, 2000);
