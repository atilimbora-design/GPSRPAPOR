const db = require('../config/database');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const fs = require('fs');
const sharp = require('sharp');

// Schemas
const userCreateSchema = Joi.object({
    username: Joi.string().required(),
    full_name: Joi.string().required(),
    password: Joi.string().required(),
    role: Joi.string().valid('personel', 'admin').required(),
    phone: Joi.string().allow('', null),
    is_active: Joi.boolean().default(true)
});

const userUpdateSchema = Joi.object({
    full_name: Joi.string().required(),
    password: Joi.string().allow('', null),
    is_active: Joi.boolean(),
    phone: Joi.string().allow('', null)
});

// Helper: Compress Profile Photo
async function compressProfilePhoto(filePath) {
    try {
        const tempPath = filePath + '.tmp';
        await sharp(filePath)
            .resize(500, 500, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(tempPath);

        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        return filePath;
    } catch (e) {
        return filePath;
    }
}

// Get Statistics (Daily, Weekly, Monthly)
exports.getUserStats = (req, res) => {
    const userId = req.user.id;
    const now = new Date();

    // 1. Daily (Today)
    const today = now.toISOString().split('T')[0];

    // 2. Weekly (Last 7 Days or Start of Week - Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 is Sunday
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStr = startOfWeek.toISOString().split('T')[0];

    // 3. Monthly (Start of Month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = startOfMonth.toISOString().split('T')[0];

    // Query 1: Orders (Quantity * Price)
    const getOrderTotal = (dateStr) => {
        return new Promise((resolve) => {
            const sql = `
                SELECT 
                    SUM(COALESCE(oi.quantity, 0) * COALESCE(p.price, 0)) as total_value
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.user_id = ? AND o.order_date >= ?
            `;
            db.get(sql, [userId, dateStr], (err, row) => {
                if (err) console.error("Order Stats Error:", err);
                resolve(row && row.total_value ? row.total_value : 0);
            });
        });
    };

    // Query 2: Reports (Cash + CC + Check + EFT)
    const getReportTotal = (dateStr) => {
        return new Promise((resolve) => {
            // Check if table exists first (safeguard) but assuming it does based on file view
            const sql = `
                SELECT 
                    SUM(COALESCE(cash_amount, 0) + COALESCE(credit_card_amount, 0) + COALESCE(check_amount, 0) + COALESCE(eft_amount, 0)) as total_collected
                FROM reports
                WHERE user_id = ? AND report_date >= ?
            `;
            db.get(sql, [userId, dateStr], (err, row) => {
                if (err) console.error("Report Stats Error:", err);
                resolve(row && row.total_collected ? row.total_collected : 0);
            });
        });
    };

    const getPeriodTotal = async (dateStr) => {
        // User requested ONLY "Tahsilat" (Collections) which matches the Reports data.
        // "sadece nakit tahsilat gözüküyor... ama bugün toplam tahsilat 17100"
        // 17100 matches the report data. The previous 23500 was 17100 (Report) + 6400 (Orders).
        // Removing Orders from this total.
        const reportTotal = await getReportTotal(dateStr);
        return reportTotal;
    };

    Promise.all([
        getPeriodTotal(today),
        getPeriodTotal(weekStr),
        getPeriodTotal(monthStr)
    ]).then(([daily, weekly, monthly]) => {
        res.json({
            success: true,
            stats: {
                daily,
                weekly,
                monthly
            }
        });
    }).catch(err => {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, error: "İstatistikler alınamadı: " + err.message });
    });
};

// Get Own Profile
exports.getMe = (req, res) => {
    db.get('SELECT id, username, full_name, role, profile_photo, phone, is_active, last_login, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, error: 'Kullanıcı bulunamadı' });
        res.json({ success: true, user });
    });
};

// Update Own Profile
exports.updateMe = async (req, res) => {
    // photo in req.file, phone in body
    const userId = req.user.id;
    const { phone } = req.body;

    // If photo
    let photoPath = null;
    if (req.file) {
        await compressProfilePhoto(req.file.path);
        photoPath = req.file.path.replace(/\\/g, '/');
    }

    // Dynamic SQL
    let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (phone !== undefined) {
        sql += ', phone = ?';
        params.push(phone);
    }
    if (photoPath) {
        sql += ', profile_photo = ?';
        params.push(photoPath);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Profil güncellendi', user: { profile_photo: photoPath } });
    });
};

// Admin: Get All Users
exports.getAllUsers = (req, res) => {
    const { role, search, active_only } = req.query;

    let sql = 'SELECT id, username, full_name, role, profile_photo, is_active, last_login, phone FROM users WHERE 1=1';
    const params = [];

    if (role) { sql += ' AND role = ?'; params.push(role); }
    if (search) { sql += ' AND (full_name LIKE ? OR username LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (active_only === 'true') { sql += ' AND is_active = 1'; }

    db.all(sql, params, (err, users) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Map boolean
        const usersMapped = users.map(u => ({ ...u, is_active: !!u.is_active }));
        res.json({ success: true, users: usersMapped });
    });
};

// Admin: Create User
exports.createUser = async (req, res) => {
    const { error } = userCreateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { username, full_name, password, role, phone, is_active } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (username, full_name, password_hash, role, phone, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
            [username, full_name, hash, role, phone, is_active === undefined ? 1 : (is_active ? 1 : 0)], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, error: 'Bu kullanıcı adı kullanımda' });
                    return res.status(500).json({ success: false, error: err.message });
                }
                res.json({ success: true, message: 'Kullanıcı oluşturuldu', user: { id: this.lastID, username, full_name } });
            });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// Admin: Update User
exports.updateUser = async (req, res) => {
    const { userId } = req.params;
    const { full_name, password, is_active, username, role, phone } = req.body;

    let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (full_name) { sql += ', full_name = ?'; params.push(full_name); }
    if (username) { sql += ', username = ?'; params.push(username); } // Allow username update if needed
    if (phone !== undefined) { sql += ', phone = ?'; params.push(phone); }
    if (is_active !== undefined) { sql += ', is_active = ?'; params.push(is_active ? 1 : 0); }
    if (role) { sql += ', role = ?'; params.push(role); }

    if (password) {
        const hash = await bcrypt.hash(password, 10);
        sql += ', password_hash = ?';
        params.push(hash);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        res.json({ success: true, message: 'Kullanıcı güncellendi' });
    });
};

// Admin: Delete User
exports.deleteUser = (req, res) => {
    const { userId } = req.params;

    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        res.json({ success: true, message: 'Kullanıcı silindi' });
    });
};
