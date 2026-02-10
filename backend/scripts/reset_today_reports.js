const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = 'c:/Users/user/Documents/Atilim/backend/database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

const today = new Date().toISOString().split('T')[0];
console.log("Bugünün raporları siliniyor:", today);

db.run("DELETE FROM reports WHERE report_date = ?", [today], function (err) {
    if (err) {
        console.error("Silme hatası:", err);
    } else {
        console.log(`Toplam ${this.changes} adet rapor silindi. Tekrar rapor gönderebilirsiniz.`);
    }
    db.close();
});
