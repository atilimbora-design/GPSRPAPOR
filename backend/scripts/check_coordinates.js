const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    // Tüm personeli ve lat/long değerlerini listele
    db.all("SELECT id, username, role, latitude, longitude FROM users WHERE role = 'personel'", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("PERSONEL LISTESI ve KONUMLARI:");
        console.table(rows);
    });
});

db.close();
