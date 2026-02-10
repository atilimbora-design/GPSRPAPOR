const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../controllers/groupController.js');

const code = `
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
`;

fs.appendFileSync(filePath, code);
console.log('Appended updateGroupStatus');
