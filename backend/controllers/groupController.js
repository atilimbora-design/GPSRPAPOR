const db = require('../config/database');
const Joi = require('joi');
const fs = require('fs');

const createGroupSchema = Joi.object({
    name: Joi.string().required(),
    member_ids: Joi.string().required() // Comes as JSON string from FormData
});

exports.createGroup = (req, res) => {
    // Validate basic fields
    // File is in req.file if uploaded
    const { error } = createGroupSchema.validate(req.body);
    if (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: error.details[0].message });
    }

    let memberIds = [];
    try {
        memberIds = JSON.parse(req.body.member_ids);
        if (!Array.isArray(memberIds)) throw new Error();
    } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'member_ids geçerli bir JSON array olmalı' });
    }

    const { name } = req.body;
    const creatorId = req.user.id;

    // Format photo path if exists
    const photoPath = req.file ? req.file.path.replace(/\\/g, '/') : null;
    // Note: We could compress group photo here similar to reports if needed.

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(`INSERT INTO chat_groups (name, photo, created_by) VALUES (?, ?, ?)`, [name, photoPath, creatorId], function (err) {
            if (err) {
                db.run('ROLLBACK');
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(500).json({ success: false, error: err.message });
            }

            const groupId = this.lastID;

            // Add Creator as Admin
            const stmt = db.prepare(`INSERT INTO chat_group_members (group_id, user_id, role) VALUES (?, ?, ?)`);
            stmt.run([groupId, creatorId, 'admin']);

            // Add Members
            // Note: Assuming memberIds doesn't include creator, or using INSERT OR IGNORE
            memberIds.forEach(uid => {
                if (parseInt(uid) !== creatorId) {
                    stmt.run([groupId, uid, 'member']);
                }
            });

            stmt.finalize((err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, error: err.message });
                }

                db.run('COMMIT');

                // Return Group Data
                res.json({
                    success: true,
                    group: {
                        id: groupId,
                        name,
                        photo: photoPath,
                        created_by: creatorId,
                        member_count: memberIds.length + (memberIds.includes(creatorId) ? 0 : 1)
                    }
                });
            });
        });
    });
};

exports.getGroupDetails = (req, res) => {
    const { groupId } = req.params;

    db.get(`SELECT * FROM chat_groups WHERE id = ?`, [groupId], (err, group) => {
        if (err || !group) return res.status(404).json({ success: false, error: 'Grup bulunamadı' });

        db.all(`
            SELECT u.id as user_id, u.full_name, u.profile_photo, gm.role, gm.joined_at 
            FROM chat_group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = ?
        `, [groupId], (err, members) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            res.json({
                success: true,
                group: {
                    ...group,
                    member_count: members.length,
                    members
                }
            });
        });
    });
};

exports.addMembers = (req, res) => {
    const { groupId } = req.params;
    const { user_ids } = req.body; // Array of IDs

    // Check Admin Permission
    db.get(`SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?`, [groupId, req.user.id], (err, mem) => {
        if (err || !mem || mem.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sadece grup yöneticisi üye ekleyebilir' });
        }

        const stmt = db.prepare(`INSERT OR IGNORE INTO chat_group_members (group_id, user_id, role) VALUES (?, ?, 'member')`);
        user_ids.forEach(uid => stmt.run([groupId, uid]));
        stmt.finalize(() => {
            res.json({ success: true, message: 'Üyeler eklendi' });
        });
    });
};

exports.leaveGroup = (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    db.run(`DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId], function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Gruptan ayrıldınız' });

        // Cleanup: If group empty, delete group (Optional but good)
        db.get(`SELECT COUNT(*) as count FROM chat_group_members WHERE group_id = ?`, [groupId], (err, row) => {
            if (row && row.count === 0) {
                db.run(`DELETE FROM chat_groups WHERE id = ?`, [groupId]);
            }
        });
    });
};

exports.removeMember = (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body; // User to be removed

    // Check Admin Permission
    db.get(`SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?`, [groupId, req.user.id], (err, mem) => {
        if (err || !mem || mem.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sadece grup yöneticisi üye çıkarabilir' });
        }

        db.run(`DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: 'Üye çıkarıldı' });
        });
    });
};

exports.updateGroupStatus = (req, res) => {
    const { groupId } = req.params;
    const { is_active } = req.body; 

    db.get('SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, mem) => {
        const isGroupAdmin = mem && mem.role === 'admin';
        const isSystemAdmin = req.user.role === 'admin';

        if (!isGroupAdmin && !isSystemAdmin) {
             return res.status(403).json({ success: false, error: 'Authorization failed' });
        }

        db.run('UPDATE chat_groups SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, groupId], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
             res.json({ success: true, message: 'Updated' });
        });
    });
};

exports.deleteGroup = (req, res) => {
    const { groupId } = req.params;

    db.get('SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, mem) => {
        const isGroupAdmin = mem && mem.role === 'admin';
        const isSystemAdmin = req.user.role === 'admin';

        if (!isGroupAdmin && !isSystemAdmin) {
             return res.status(403).json({ success: false, error: 'Authorization failed' });
        }

        db.run('DELETE FROM chat_groups WHERE id = ?', [groupId], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
             res.json({ success: true, message: 'Group deleted' });
        });
    });
};
