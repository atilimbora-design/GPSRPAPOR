const db = require('../config/database');
const fs = require('fs');

// Helper: Ensure io access somehow, or just store in DB and let socket client pull?
// Better: We can attach io to req in server.js middleware, OR require server.js export if compatible.
// But circular dependency risk.
// Simple way: user connects socket -> joins 'user_ID' room.
// Backend REST API -> sends DB insert -> but how to emit?
// Workaround: We will skip direct emit from controller for now to keep architecture simple,
// OR usually one passes 'io' instance to controllers.
// Let's assume the frontend re-fetches or we handle socket separately. 
// WAIT: The prompt explicitly says "Socket.io ile real-time gönder".
// I'll grab the `io` object by exporting a Function from this module or attaching to `req` in server.js.
// Since server.js is entry point, let's attach Io to req in a middleware there.
// I will assume `req.io` exists for now and add middleware in server.js later.

exports.sendMessage = (req, res) => {
    // req.body: receiver_id, group_id, message_type, content
    // req.file: if image/file

    const senderId = req.user.id;
    const { receiver_id, group_id, message_type, content } = req.body;

    // Validation
    if (!receiver_id && !group_id) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'Alıcı veya Grup seçilmeli' });
    }

    let finalContent = content;
    let fileSize = null;
    let thumbnail = null;

    if (message_type === 'image' || message_type === 'file') {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
        }
        finalContent = req.file.path.replace(/\\/g, '/');
        fileSize = req.file.size;

        // If image, maybe thumbnail logic? Skipped for speed, full path used.
    }

    const sql = `
        INSERT INTO messages 
        (sender_id, receiver_id, group_id, message_type, content, file_size, thumbnail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [senderId, receiver_id || null, group_id || null, message_type || 'text', finalContent, fileSize, thumbnail], function (err) {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ success: false, error: err.message });
        }

        const messageId = this.lastID;
        const messageData = {
            id: messageId,
            sender_id: senderId,
            receiver_id,
            group_id,
            message_type,
            content: finalContent,
            created_at: new Date().toISOString(),
            sender_name: req.user.full_name, // Helper for frontend
            sender_photo: req.user.profile_photo
        };

        // Emit Socket Event
        // Note: I will need to add "app.use((req,res,next)=>{req.io=io; next()})" in server.js
        if (req.io) {
            if (group_id) {
                req.io.to(`group_${group_id}`).emit('new_group_message', messageData);
            } else {
                req.io.to(`user_${receiver_id}`).emit('new_message', messageData);
                // Also emit to sender (for multiple devices sync)
                req.io.to(`user_${senderId}`).emit('new_message', { ...messageData, is_mine: true });
            }
        }

        res.json({ success: true, message: messageData });
    });
};

exports.getConversations = (req, res) => {
    const userId = req.user.id;

    // Complex query to get last message of each conversation
    // 1. Direct Messages
    // 2. Group Messages
    // This is a bit heavy for SQLite without distinct ON or window functions easily. 
    // Implementation Strategy:
    // Fetch all groups user is in.
    // Fetch all users user has messaged with.
    // Get last message for each.
    // Sort by timestamp.

    // Simplified approach: Get Groups and Recent DMs separately and merge.

    const conversations = [];

    // 1. Groups
    const groupPromise = new Promise((resolve) => {
        db.all(`
            SELECT g.id as group_id, g.name as group_name, g.photo as group_photo,
            (SELECT COUNT(*) FROM chat_group_members WHERE group_id = g.id) as member_count,
            (SELECT COUNT(*) FROM messages WHERE group_id = g.id AND is_read = 0 AND sender_id != ?) as unread_count
            FROM chat_groups g
            JOIN chat_group_members gm ON gm.group_id = g.id
            WHERE gm.user_id = ?
        `, [userId, userId], async (err, groups) => {
            if (err) return resolve([]);

            // Get last message for each group
            for (let g of groups) {
                const lastMsg = await new Promise(res => {
                    db.get(`SELECT * FROM messages WHERE group_id = ? ORDER BY created_at DESC LIMIT 1`, [g.group_id], (e, r) => res(r));
                });

                conversations.push({
                    type: 'group',
                    ...g,
                    last_message: lastMsg,
                    sort_time: lastMsg ? lastMsg.created_at : '1970-01-01'
                });
            }
            resolve();
        });
    });

    // 2. Direct Messages (Pairs)
    const dmPromise = new Promise((resolve) => {
        // Find unique users communicated with
        db.all(`
            SELECT DISTINCT 
                CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id
            FROM messages 
            WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL
        `, [userId, userId, userId], async (err, rows) => {
            if (err) return resolve([]);

            for (let r of rows) {
                const otherUser = await new Promise(res => db.get(`SELECT id, full_name, profile_photo FROM users WHERE id = ?`, [r.other_id], (e, u) => res(u)));
                const lastMsg = await new Promise(res => db.get(`SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC LIMIT 1`, [userId, r.other_id, r.other_id, userId], (e, m) => res(m)));
                const unread = await new Promise(res => db.get(`SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`, [r.other_id, userId], (e, c) => res(c ? c.c : 0)));

                if (otherUser) {
                    conversations.push({
                        type: 'direct',
                        user_id: otherUser.id,
                        full_name: otherUser.full_name,
                        profile_photo: otherUser.profile_photo,
                        last_message: lastMsg,
                        unread_count: unread,
                        sort_time: lastMsg ? lastMsg.created_at : '1970-01-01'
                    });
                }
            }
            resolve();
        });
    });

    Promise.all([groupPromise, dmPromise]).then(() => {
        // Sort by time
        conversations.sort((a, b) => new Date(b.sort_time) - new Date(a.sort_time));
        res.json({ success: true, conversations });
    });
};

exports.getDirectMessages = (req, res) => {
    const userId = req.user.id;
    const otherId = req.params.userId;
    const limit = 50;

    db.all(`
        SELECT * FROM messages 
        WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        AND group_id IS NULL
        ORDER BY created_at DESC 
        LIMIT ?
    `, [userId, otherId, otherId, userId, limit], (err, messages) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Mark as read (Async)
        db.run(`UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`, [otherId, userId]);

        // Map is_mine
        const mapped = messages.map(m => ({
            ...m,
            is_mine: m.sender_id === userId
        }));

        res.json({ success: true, messages: mapped });
    });
};

exports.getGroupMessages = (req, res) => {
    const userId = req.user.id;
    const { groupId } = req.params;
    const limit = 50;

    // Check membership
    db.get(`SELECT * FROM chat_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId], (err, mem) => {
        if (err || !mem) return res.status(403).json({ success: false, error: 'Bu grupta değilsiniz' });

        db.all(`
            SELECT m.*, u.full_name as sender_name, u.profile_photo as sender_photo 
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.group_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `, [groupId, limit], (err, messages) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            const mapped = messages.map(m => ({
                ...m,
                is_mine: m.sender_id === userId
            }));

            res.json({ success: true, messages: mapped });
        });
    });
};
