const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    // ID=2 olan kullanıcıya İzmir konumu ata
    const lat = 38.4192;
    const lng = 27.1287;

    db.run("UPDATE users SET latitude = ?, longitude = ? WHERE id = 2", [lat, lng], function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`User 2 updated with location: ${lat}, ${lng}`);
            console.log("Changes: " + this.changes);
        }
    });
});

db.close();
