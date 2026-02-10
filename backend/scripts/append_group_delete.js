const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../controllers/groupController.js');

const code = `
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
`;

fs.appendFileSync(filePath, code);
console.log('Appended deleteGroup');
