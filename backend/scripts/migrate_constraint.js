const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/user/Documents/Atilim/backend/database/atilim.db');

db.serialize(() => {
    console.log("Migration baslatiliyor: UNIQUE constraint kaldirilacak...");

    // 1. Transaction Başlat
    db.run("BEGIN TRANSACTION");

    // 2. Tablo adini degistir
    db.run("ALTER TABLE reports RENAME TO reports_old", (err) => {
        if (err) {
            console.error("Tablo adi degistirilemedi:", err);
            db.run("ROLLBACK");
            return;
        }

        // 3. Yeni tabloyu CONSTRAINT OLMADAN olustur
        // Dikkat: UNIQUE(user_id, report_date) kismini kaldirdim.
        db.run(`
            CREATE TABLE reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                report_date TEXT NOT NULL,
                vehicle_plate TEXT,
                start_km REAL,
                end_km REAL,
                fuel_expense REAL DEFAULT 0,
                fuel_receipt TEXT,
                maintenance_expense REAL DEFAULT 0,
                maintenance_receipt TEXT,
                maintenance_description TEXT,
                toll_expense REAL DEFAULT 0,
                cash_amount REAL DEFAULT 0,
                credit_card_amount REAL DEFAULT 0,
                check_amount REAL DEFAULT 0,
                eft_amount REAL DEFAULT 0,
                accounting_delivered REAL DEFAULT 0,
                cash_difference_reason TEXT,
                pdf_path TEXT,
                status TEXT DEFAULT 'pending',
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) {
                console.error("Yeni tablo olusturulamadi:", err);
                db.run("ROLLBACK");
                return;
            }

            // 4. Verileri kopyala
            db.run(`
                INSERT INTO reports (
                    id, user_id, report_date, vehicle_plate, start_km, end_km, 
                    fuel_expense, fuel_receipt, maintenance_expense, maintenance_receipt, maintenance_description, 
                    toll_expense, cash_amount, credit_card_amount, check_amount, eft_amount, 
                    accounting_delivered, cash_difference_reason, pdf_path, status, submitted_at
                )
                SELECT 
                    id, user_id, report_date, vehicle_plate, start_km, end_km, 
                    fuel_expense, fuel_receipt, maintenance_expense, maintenance_receipt, maintenance_description, 
                    toll_expense, cash_amount, credit_card_amount, check_amount, eft_amount, 
                    accounting_delivered, cash_difference_reason, pdf_path, status, submitted_at
                FROM reports_old
            `, (err) => {
                if (err) {
                    console.error("Veri kopyalanamadi:", err);
                    db.run("ROLLBACK");
                    return;
                }

                // 5. Eski tabloyu sil
                db.run("DROP TABLE reports_old", (err) => {
                    if (err) {
                        console.error("Eski tablo silinemedi:", err);
                        db.run("ROLLBACK");
                        return;
                    }

                    // 6. Basarili
                    db.run("COMMIT");
                    console.log("✅ BASARILI! Veritabani guncellendi. Artik gunde birden fazla rapor girilebilir.");
                    db.close();
                });
            });
        });
    });
});
