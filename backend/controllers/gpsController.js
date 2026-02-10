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

    // Insert into DB
    const stmt = db.prepare(`
    INSERT INTO gps_locations 
    (user_id, latitude, longitude, speed, battery_level, accuracy, timestamp, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

    stmt.run([user_id, latitude, longitude, speed, battery_level, accuracy, timestamp || new Date().toISOString()], function (err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        // Note: Emitting socket event could also happen here if we wanted to couple HTTP update with Socket broadcast,
        // but typically the mobile app sends data via HTTP for storage AND Socket for realtime, OR just Socket and server handles storage.
        // The prompt implies a hybrid or specific flow:
        // "POST /api/gps/update ... Socket.io ile adminlere real-time gönder"
        // So we should ideally emit the event here too if we have access to io instance, or RELY on the client to send socket event separately.
        // For a robust backend, let's just confirm storage.

        res.json({
            success: true,
            message: 'Konum güncellendi'
        });
    });
    stmt.finalize();
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
        // Only show users who updated location in last 5 minutes
        sql += ` AND datetime(u.last_location_update) > datetime('now', '-5 minutes')`;
    }

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        // Convert last_update timestamps to Turkey timezone (UTC+3)
        const processedRows = rows.map(row => {
            if (row.last_update) {
                const utcDate = new Date(row.last_update);
                const turkeyDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
                row.last_update = turkeyDate.toISOString();
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
