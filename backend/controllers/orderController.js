const db = require('../config/database');
const Joi = require('joi');
const ExcelJS = require('exceljs');

const orderItemSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(0).required()
});

const orderSchema = Joi.object({
    items: Joi.array().items(orderItemSchema).min(1).required(),
    notes: Joi.string().allow('', null)
});

exports.todaysOrder = (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    db.get(`SELECT * FROM orders WHERE user_id = ? AND order_date = ?`, [userId, today], (err, order) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!order) return res.json({ success: true, order: null });

        db.all(`
            SELECT oi.*, p.code as product_code, p.name as product_name, p.unit 
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        `, [order.id], (err, items) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            res.json({
                success: true,
                order: {
                    ...order,
                    is_locked: !!order.is_locked,
                    items
                }
            });
        });
    });
};

exports.saveOrder = (req, res) => {
    // 15:00 Check
    const now = new Date();
    // Assuming server time is Turkey time (GMT+3) as per ENV TZ
    // Simple hour check
    if (now.getHours() >= 15) {
        // Check if update is allowed logic: "active: 15:00'dan önce düzenlenebilir"
        // If creating NEW order after 15:00? Maybe allowed but locked immediately? 
        // Prompt says: "Saat 15:00'dan sonra sipariş düzenleme YOK"
        // Let's enforce strictly.
        return res.status(400).json({ success: false, error: "Saat 15:00'dan sonra sipariş düzenlenemez" });
    }

    const { error } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { items, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Transaction-like wrapper
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Check existing order
        db.get(`SELECT id, is_locked FROM orders WHERE user_id = ? AND order_date = ?`, [userId, today], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row && row.is_locked) {
                db.run('ROLLBACK');
                return res.status(400).json({ success: false, error: 'Kilitli sipariş düzenlenemez' });
            }

            const activeItems = items.filter(i => i.quantity > 0);
            const totalItems = activeItems.length;

            if (row) {
                // Update
                const orderId = row.id;
                db.run(`UPDATE orders SET total_items = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [totalItems, notes, orderId], (err) => {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ success: false, error: err.message }); }

                        // Delete old items
                        db.run(`DELETE FROM order_items WHERE order_id = ?`, [orderId], (err) => {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ success: false, error: err.message }); }

                            // Insert new items
                            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`);
                            activeItems.forEach(item => {
                                stmt.run([orderId, item.product_id, item.quantity]);
                            });
                            stmt.finalize(() => {
                                db.run('COMMIT');
                                req.io.emit('order_update', { date: today, user_id: userId });
                                res.json({ success: true, message: 'Sipariş güncellendi', order: { id: orderId, order_date: today, total_items: totalItems } });
                            });
                        });
                    });
            } else {
                // Create
                db.run(`INSERT INTO orders (user_id, order_date, total_items, notes) VALUES (?, ?, ?, ?)`,
                    [userId, today, totalItems, notes], function (err) {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ success: false, error: err.message }); }

                        const orderId = this.lastID;
                        const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`);
                        activeItems.forEach(item => {
                            stmt.run([orderId, item.product_id, item.quantity]);
                        });
                        stmt.finalize(() => {
                            db.run('COMMIT');
                            req.io.emit('order_update', { date: today, user_id: userId });
                            res.json({ success: true, message: 'Sipariş oluşturuldu', order: { id: orderId, order_date: today, total_items: totalItems } });
                        });
                    });
            }
        });
    });
};

exports.getHistory = (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM orders WHERE user_id = ?`;
    const params = [userId];

    if (start_date) { sql += ` AND order_date >= ?`; params.push(start_date); }
    if (end_date) { sql += ` AND order_date <= ?`; params.push(end_date); }

    sql += ` ORDER BY order_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Count total for pagination
        db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ?`, [userId], (err, countRow) => {
            res.json({
                success: true,
                orders: rows.map(r => ({ ...r, is_locked: !!r.is_locked })),
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil((countRow ? countRow.count : 0) / limit),
                    total_count: countRow ? countRow.count : 0,
                    limit: parseInt(limit)
                }
            });
        });
    });
};

exports.getAllOrders = (req, res) => {
    // Admin only
    const { date, user_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const fs = require('fs');
    try { fs.appendFileSync('debug.log', `[${new Date().toISOString()}] getAllOrders params: date=${date} target=${targetDate} user=${user_id}\n`); } catch (e) { }

    let sql = `
        SELECT o.*, u.full_name, u.username 
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.order_date = ?
    `;
    const params = [targetDate];

    if (user_id) {
        sql += ` AND o.user_id = ?`;
        params.push(user_id);
    }

    db.all(sql, params, async (err, orders) => {
        if (err) {
            try { fs.appendFileSync('debug.log', `getAllOrders ERROR: ${err.message}\n`); } catch (e) { }
            return res.status(500).json({ success: false, error: err.message });
        }
        try { fs.appendFileSync('debug.log', `getAllOrders found ${orders.length} orders\n`); } catch (e) { }

        // Populate items for each order
        // Doing this in loop for simplicity, can be optimized with one big JOIN
        const ordersWithItems = [];
        for (const order of orders) {
            const items = await new Promise((resolve) => {
                db.all(`
                    SELECT oi.quantity, p.code as product_code, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = ?
                `, [order.id], (err, rows) => resolve(rows || []));
            });
            ordersWithItems.push({ ...order, items });
        }

        res.json({ success: true, orders: ordersWithItems });
    });
};

exports.exportExcel = async (req, res) => {
    // Admin only
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Siparişler');

        // Fetch Data
        // 1. Get List of Products (Rows)
        const products = await new Promise((resolve, reject) => {
            db.all(`SELECT id, name FROM products ORDER BY sort_order ASC`, [], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // 2. Get List of Users who ordered (Columns)
        const users = await new Promise((resolve, reject) => {
            db.all(`
                 SELECT DISTINCT u.id, u.full_name 
                 FROM orders o 
                 JOIN users u ON u.id = o.user_id 
                 WHERE o.order_date = ?
                 ORDER BY u.full_name ASC
             `, [targetDate], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // 3. Get All Order Items
        const orderItems = await new Promise((resolve, reject) => {
            db.all(`
                SELECT o.user_id, oi.product_id, oi.quantity 
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.order_date = ?
            `, [targetDate], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // Construct Grid
        // Headers: Product Name | User 1 | User 2 | ... | TOTAL
        const headers = ['Ürün', ...users.map(u => u.full_name), 'TOPLAM'];
        sheet.addRow(headers);

        // Styling Headers
        sheet.getRow(1).font = { bold: true };

        // Data Rows
        products.forEach(p => {
            const row = [p.name];
            let productTotal = 0;

            users.forEach(u => {
                const item = orderItems.find(oi => oi.product_id === p.id && oi.user_id === u.id);
                const qty = item ? item.quantity : 0;
                row.push(qty > 0 ? qty : '');
                productTotal += qty;
            });

            row.push(productTotal); // Total Column
            sheet.addRow(row);
        });

        // Footer Row: Totals per User
        const footer = ['TOPLAM'];
        users.forEach(u => {
            // Calculate user total items
            const userTotal = orderItems.filter(oi => oi.user_id === u.id).reduce((sum, i) => sum + i.quantity, 0);
            footer.push(userTotal);
        });
        // Grand Total
        const grandTotal = orderItems.reduce((sum, i) => sum + i.quantity, 0);
        footer.push(grandTotal);

        const footerRow = sheet.addRow(footer);
        footerRow.font = { bold: true };

        // Send File
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=siparisler_${targetDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Excel oluşturma hatası' });
    }
};

exports.getOrderDetails = (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!order) return res.status(404).json({ success: false, error: 'Sipariş bulunamadı' });

        // Check ownership (if not admin)
        if (req.user.role !== 'admin' && order.user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Bu siparişi görüntüleme yetkiniz yok' });
        }

        db.all(`
            SELECT oi.*, p.code as product_code, p.name as product_name, p.unit 
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        `, [order.id], (err, items) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            res.json({
                success: true,
                order: {
                    ...order,
                    is_locked: !!order.is_locked,
                    items
                }
            });
        });
    });
};

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
