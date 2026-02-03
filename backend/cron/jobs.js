const cron = require('node-cron');
const db = require('../config/database');
const leaderboardController = require('../controllers/leaderboardController');

// Helper to log with timestamp
const log = (msg) => console.log(`[CRON ${new Date().toLocaleTimeString()}] ${msg}`);

exports.startAll = () => {
    // 1. Update Leaderboard Cache (Every Hour)
    // Run at minute 0 of every hour
    cron.schedule('0 * * * *', async () => {
        log('Updating Leaderboards...');
        try {
            // Update Daily, Weekly, Monthly
            await leaderboardController.updateCacheInternal('daily');
            await leaderboardController.updateCacheInternal('weekly');
            await leaderboardController.updateCacheInternal('monthly');
            log('Leaderboards updated successfully.');
        } catch (e) {
            console.error('Leaderboard update failed:', e);
        }
    });

    // 2. Lock Orders (Every Day at 15:00)
    // "locked" status and "is_locked" flag
    cron.schedule('0 15 * * *', () => {
        log('Locking orders...');
        const today = new Date().toISOString().split('T')[0];

        db.run(`
            UPDATE orders 
            SET is_locked = 1, status = 'locked', locked_at = CURRENT_TIMESTAMP
            WHERE order_date = ? AND is_locked = 0
        `, [today], function (err) {
            if (err) console.error('Order lock failed:', err);
            else log(`${this.changes} orders locked.`);
        });
    });

    // 3. Clean Old GPS Data (Every Night at 04:00)
    // Keep last 30 days
    cron.schedule('0 4 * * *', () => {
        log('Cleaning old GPS data...');
        const retentionDays = 30; // Configurable

        db.run(`
            DELETE FROM gps_locations 
            WHERE timestamp < datetime('now', '-${retentionDays} days')
        `, function (err) {
            if (err) console.error('GPS cleanup failed:', err);
            else log(`${this.changes} old GPS records deleted.`);
        });
    });

    // 4. Reset Daily Connection Status (Optional check)
    // If server crashes, some users might stay 'online'. 
    // Maybe run every 10 mins to set offline if no update in 2 mins?
    cron.schedule('*/10 * * * *', () => {
        // Reset users who haven't sent GPS in 5 mins
        db.run(`
           UPDATE gps_locations 
           SET is_online = 0 
           WHERE is_online = 1 
           AND timestamp < datetime('now', '-5 minutes')
       `);
    });

    log('All jobs started.');
};
