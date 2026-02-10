const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || './database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

async function resetPassword() {
    const passwordHash = await bcrypt.hash('1234', 10);
    const username = 'bora';

    db.run(`UPDATE users SET password_hash = ? WHERE username = ?`, [passwordHash, username], function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Password for user '${username}' reset to '1234'. Changes: ${this.changes}`);
            if (this.changes === 0) {
                // User might not exist, let's create it
                db.run(`INSERT INTO users (username, full_name, role, password_hash) VALUES (?, ?, ?, ?)`,
                    [username, 'Bora Atılım', 'admin', passwordHash], (err) => {
                        if (err) console.error("Insert failed", err);
                        else console.log("User created.");
                    });
            }
        }
        db.close();
    });
}

resetPassword();
