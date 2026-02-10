const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = 'c:/Users/user/Documents/Atilim/backend/database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

const PASSWORD = '1234';

async function resetUser() {
    const hash = await bcrypt.hash(PASSWORD, 10);

    db.serialize(() => {
        // 1. Check if user exists
        db.get("SELECT * FROM users WHERE username = 'dincer'", (err, row) => {
            if (row) {
                console.log("User 'dincer' exists. Updating password...");
                db.run("UPDATE users SET password_hash = ?, role = 'personel' WHERE username = 'dincer'", [hash], (updateErr) => {
                    if (updateErr) console.error(updateErr);
                    else console.log("Password updated to '1234' for user 'dincer'.");
                });
            } else {
                console.log("User 'dincer' NOT found. Creating...");
                db.run("INSERT INTO users (username, full_name, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?)",
                    ['dincer', 'Dinçer Öztürk', 'personel', hash, 1], (createErr) => {
                        if (createErr) console.error(createErr);
                        else console.log("User 'dincer' created with password '1234'.");
                    });
            }
        });
    });

    // Check one more time to be sure
    setTimeout(() => {
        db.get("SELECT * FROM users WHERE username = 'dincer'", (err, row) => {
            console.log("Final User Check:", row);
            db.close();
        });
    }, 1000);
}

resetUser();
