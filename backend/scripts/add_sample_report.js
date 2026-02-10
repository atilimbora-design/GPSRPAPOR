const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || './database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

const today = new Date().toISOString().split('T')[0];

async function addSampleReport() {
    // 1. Find User
    db.get("SELECT id, full_name FROM users WHERE full_name LIKE '%Dinçer%'", async (err, user) => {
        if (err) { console.error(err); return; }

        let userId;
        if (!user) {
            console.log("User Dinçer not found, creating...");
            // Create dummy user
            const bcrypt = require('bcrypt');
            const hash = await bcrypt.hash('1234', 10);
            await new Promise((resolve) => {
                db.run("INSERT INTO users (username, full_name, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?)",
                    ['dincer', 'Dinçer Öztürk', 'personel', hash, 1], function (e) {
                        userId = this.lastID;
                        resolve();
                    });
            });
            console.log("Created user Dinçer Öztürk with ID:", userId);
        } else {
            console.log("Found user:", user.full_name);
            userId = user.id;
        }

        // 2. Insert Report
        const report = {
            user_id: userId,
            report_date: today,
            vehicle_plate: '35 DIN 35',
            start_km: 15000,
            end_km: 15120,
            fuel_expense: 500,
            maintenance_expense: 0,
            toll_expense: 45.50,
            cash_amount: 12500,
            credit_card_amount: 5400,
            check_amount: 0,
            eft_amount: 2000,
            accounting_delivered: 12500, // No diff
            status: 'submitted'
        };

        const stmt = db.prepare(`
            INSERT INTO reports (
                user_id, report_date, vehicle_plate, start_km, end_km,
                fuel_expense, maintenance_expense, toll_expense,
                cash_amount, credit_card_amount, check_amount, eft_amount,
                accounting_delivered, status, submitted_at, pdf_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `);

        stmt.run([
            report.user_id, report.report_date, report.vehicle_plate,
            report.start_km, report.end_km,
            report.fuel_expense, report.maintenance_expense, report.toll_expense,
            report.cash_amount, report.credit_card_amount, report.check_amount, report.eft_amount,
            report.accounting_delivered, report.status, 'uploads/reports/dummy_dincer.pdf'
        ], function (err) {
            if (err) console.error("Insert failed:", err);
            else console.log("Sample report added for Dinçer.");
            db.close();
        });
        stmt.finalize();
    });
}

addSampleReport();
