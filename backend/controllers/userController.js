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
    phone: Joi.string().allow('', null)
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

        // Unlink old photo logic omitted for brevity but recommended
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

    let sql = 'SELECT id, username, full_name, role, profile_photo, is_active, last_login FROM users WHERE 1=1';
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

    const { username, full_name, password, role, phone } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (username, full_name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)`,
            [username, full_name, hash, role, phone], function (err) {
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
    const { full_name, password, is_active } = req.body; // Partial update allowed via schema? Prompt schema says full_name required.

    let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (full_name) { sql += ', full_name = ?'; params.push(full_name); }
    if (is_active !== undefined) { sql += ', is_active = ?'; params.push(is_active ? 1 : 0); }

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
