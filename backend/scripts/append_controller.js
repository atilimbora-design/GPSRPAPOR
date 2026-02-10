const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../controllers/orderController.js');

const code = `
exports.deleteOrder = (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    if (now.getHours() >= 15) {
        return res.status(400).json({ success: false, error: "Saat 15:00'dan sonra sipariş silinemez" });
    }

    db.get('SELECT id, is_locked FROM orders WHERE user_id = ? AND order_date = ?', [userId, today], (err, order) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!order) return res.status(404).json({ success: false, error: 'Silinecek sipariş bulunamadı' });
        if (order.is_locked) return res.status(400).json({ success: false, error: 'Sipariş kilitli, silinemez' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run('DELETE FROM order_items WHERE order_id = ?', [order.id], (err) => {
                if(err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, error: err.message });
                }

                db.run('DELETE FROM orders WHERE id = ?', [order.id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    db.run('COMMIT');
                    if (req.io) req.io.emit('order_update', { date: today, user_id: userId });
                    res.json({ success: true, message: 'Sipariş başarıyla silindi' });
                });
            });
        });
    });
};
`;

fs.appendFileSync(filePath, code);
console.log('Appended deleteOrder to orderController.js');
