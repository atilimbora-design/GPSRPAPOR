const db = require('../config/database');
const Joi = require('joi');

const gpsUpdateSchema = Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    speed: Joi.number().default(0),
    battery_level: Joi.number().integer().min(0).max(100),
    accuracy: Joi.number().default(0),
    timestamp: Joi.date().iso()
});

exports.updateLocation = (req, res) => {
    const { error } = gpsUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { latitude, longitude, speed, battery_level, accuracy, timestamp } = req.body;
    const user_id = req.user.id;

    // Insert into DB (History)
    db.run(`
        INSERT INTO gps_locations 
        (user_id, latitude, longitude, speed, battery_level, accuracy, timestamp, is_online)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [user_id, latitude, longitude, speed, battery_level, accuracy, timestamp || new Date().toISOString()]);

    // Update Users Table (Current Status)
    db.run(`
        UPDATE users 
        SET latitude = ?, longitude = ?, speed = ?, battery_level = ?, last_location_update = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [latitude, longitude, speed || 0, battery_level || 100, user_id], (err) => {
        if (err) {
            console.error("User Status Update Error:", err.message);
        }

        // Broadcast to admins via Socket.io
        if (req.io) {
            req.io.to('admin_gps').emit('gps_updated', {
                user_id: user_id,
                latitude,
                longitude,
                speed: speed || 0,
                battery_level: battery_level || 100,
                is_online: true,
                timestamp: new Date().toISOString(),
                source: 'http'
            });
        }

        res.json({
            success: true,
            message: 'Konum güncellendi'
        });
    });
};

exports.getLiveLocations = (req, res) => {
    // Admin only - handled by route middleware
    const { active_only } = req.query;

    let sql = `
    SELECT 
        u.id as user_id, 
        u.full_name, 
        u.profile_photo,
        u.latitude, 
        u.longitude, 
        COALESCE(u.speed, 0) as speed, 
        COALESCE(u.battery_level, 100) as battery_level, 
        0 as accuracy, 
        CASE 
            WHEN u.last_location_update IS NOT NULL 
            AND datetime(u.last_location_update) > datetime('now', '-5 minutes')
            THEN 1 
            ELSE 0 
        END as is_online,
        u.last_location_update as last_update
    FROM users u
    WHERE u.role = 'personel'
  `;

    if (active_only === 'true') {
        sql += ` AND datetime(u.last_location_update) > datetime('now', '-5 minutes')`;
    }

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        // Standardize timestamps with 'Z' for UTC
        const processedRows = rows.map(row => {
            if (row.last_update) {
                // SQLite's CURRENT_TIMESTAMP is like "2024-02-11 12:00:00"
                // Parse it as UTC and convert to ISO
                const utcDate = new Date(row.last_update + ' Z');
                row.last_update = utcDate.toISOString();
            }
            return row;
        });

        res.json({ success: true, locations: processedRows });
    });
};

exports.getHistory = (req, res) => {
    const { userId } = req.params;
    const { start_date, end_date, limit } = req.query;

    let sql = `SELECT * FROM gps_locations WHERE user_id = ?`;
    const params = [userId];

    if (start_date) {
        sql += ` AND timestamp >= ?`;
        params.push(start_date);
    }

    if (end_date) {
        sql += ` AND timestamp <= ?`;
        params.push(end_date);
    }

    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit || 1000);

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, history: rows });
    });
};
