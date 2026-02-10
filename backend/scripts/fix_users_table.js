const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Migration: Adding latitude/longitude to users table...");

    // Sütunların varlığını kontrol etmeden direkt eklemeyi dene (zaten yoksa hata verir, catch ederiz veya yok sayarız ama sqlite add column if not exists desteklemez, try-catch ile yapacagiz)

    // SQLite'da ALTER TABLE IF NOT EXISTS yok, ama aynı sütunu eklemeye çalışırsan hata verir.
    // Biz hata almayı göze alarak çalıştıralım.

    db.run("ALTER TABLE users ADD COLUMN latitude REAL DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Latitude eklenirken hata:", err.message);
        } else {
            console.log("Latitude sütunu eklendi (veya zaten vardı).");
        }
    });

    db.run("ALTER TABLE users ADD COLUMN longitude REAL DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("Longitude eklenirken hata:", err.message);
        } else {
            console.log("Longitude sütunu eklendi (veya zaten vardı).");
        }
    });

    db.run("ALTER TABLE users ADD COLUMN last_daily_login DATETIME", (err) => {
        if (err && !err.message.includes("duplicate column")) {
            console.error("last_daily_login eklenirken hata:", err.message);
        } else {
            console.log("last_daily_login sütunu eklendi (veya zaten vardı).");
        }
    });
});

// Biraz bekle sonra kapat (async islemlerin bitmesi icin)
setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err);
        else console.log("Database connection closed.");
    });
}, 2000);
