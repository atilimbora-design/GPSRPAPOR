const db = require('../config/database');

exports.getAllProducts = (req, res) => {
    const { search, category, active_only, user_id } = req.query;
    const currentUserId = user_id || req.user.id; // Use authenticated user ID or provided filter

    let sql = `
    SELECT 
        p.*,
        (SELECT 1 FROM order_items oi 
         WHERE oi.product_id = p.id AND oi.is_favorite = 1 
         AND oi.order_id IN (SELECT id FROM orders WHERE user_id = ?)
         LIMIT 1
        ) as is_favorite
    FROM products p
    WHERE 1=1
  `;
    // Optimized favorite logic: The prompt implies a dedicated user favorite list, 
    // but looking at schema 'is_favorite' is in 'order_items'. 
    // Let's re-read schema carefully: 
    // "order_items... is_favorite INTEGER DEFAULT 0 -- Favori ürün mü?"
    // This implies favoritism is marked per order item or derived. 
    // Actually, usually favorites are a separate table or a flag on products per user.
    // Given the schema "order_items" has "is_favorite", it seems favorites are tracked via previous usage habits or explicitly marked there?
    // Wait, prompt says: "GET /api/products ... is_favorite: true // Kullanıcının favorisi mi?"
    // And "POST /api/products/:productId/favorite".
    // BUT the Schema definition provided in prompt ONLY has 'is_favorite' in 'order_items'. 
    // There is NO 'favorites' table and NO 'is_favorite' column in 'products' table relative to user.
    // This suggests a slight schema gap or we infer favorites from "most ordered" or "last ordered marked favorite".
    // However, specifically "POST .../favorite" implies persistent state.
    // Best approach given constraints: Create a separate 'favorites' table or use 'order_items' effectively strictly?
    // Let's assume there's a missing table 'favorites' OR we attach it to user metadata.
    // OR simpler: we use a new hidden table 'user_favorites' we'll create quickly or just mock it for now.
    // WAIT: "5. order_items (Sipariş Detayları) ... is_favorite ... Favori ürün mü?"
    // This is odd for a general favorite product list. 
    // Let's strictly follow the Prompt's "POST /api/products/:productId/favorite" endpoint requirement.
    // To support this proper "Favorite" feature, I will create a simple 'user_favorites' table if it doesn't exist, 
    // OR just check if the user EVER marked it favorite in ANY past order_item?
    // Let's assume the latter for now to stick to the provided schema "order_items.is_favorite".
    // Query: "Has this user ever had an order_item for this product with is_favorite=1?"

    const params = [currentUserId];

    if (search) {
        sql += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.code) LIKE LOWER(?))`;
        params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
        sql += ` AND p.category = ?`;
        params.push(category);
    }

    if (active_only === 'true') {
        sql += ` AND p.is_active = 1`;
    }

    // Ordering: Favorites first, then sort_order
    // We need to JOIN or subquery for sorting.
    // Re-writing SQL for robust ordering
    sql = `
    SELECT 
      p.*,
      COALESCE((
        SELECT 1 FROM order_items oi 
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id 
        AND o.user_id = ? 
        AND oi.is_favorite = 1 
        LIMIT 1
      ), 0) as is_favorite
    FROM products p
    WHERE 1=1
  `;

    // Re-attach filters
    if (search) {
        sql += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.code) LIKE LOWER(?))`;
    }
    if (category && category !== 'all') {
        sql += ` AND p.category = ?`;
    }
    if (active_only === 'true') {
        sql += ` AND p.is_active = 1`;
    }

    sql += ` ORDER BY is_favorite DESC, p.sort_order ASC, p.name ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        // Map boolean for convenience
        const products = rows.map(r => ({
            ...r,
            is_active: !!r.is_active,
            is_favorite: !!r.is_favorite
        }));

        res.json({ success: true, products });
    });
};

exports.toggleFavorite = (req, res) => {
    const { productId } = req.params;
    const { is_favorite } = req.body;
    const userId = req.user.id;

    db.run(`CREATE TABLE IF NOT EXISTS user_favorite_products (user_id INTEGER, product_id INTEGER, PRIMARY KEY(user_id, product_id))`, [], (err) => {
        if (err) console.error(err);

        if (is_favorite) {
            db.run(`INSERT OR IGNORE INTO user_favorite_products (user_id, product_id) VALUES (?, ?)`, [userId, productId], (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, message: 'Ürün favorilere eklendi' });
            });
        } else {
            db.run(`DELETE FROM user_favorite_products WHERE user_id = ? AND product_id = ?`, [userId, productId], (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, message: 'Ürün favorilerden çıkarıldı' });
            });
        }
    });
};

// --- Product Management (Admin) ---

exports.createProduct = (req, res) => {
    const { name, category, unit, is_active, sort_order } = req.body;

    // Auto-generate Code
    const code = name
        .replace(/ /g, '_')
        .replace(/\./g, '')
        .replace(/–/g, '-')
        .replace(/&/g, '')
        .toUpperCase();

    const sql = `INSERT INTO products (code, name, category, unit, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [code, name, category, unit || 'KOLI', is_active ? 1 : 0, sort_order || 999];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Ürün başarıyla oluşturuldu', product: { id: this.lastID, ...req.body } });
    });
};

exports.updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, category, unit, is_active, sort_order, code } = req.body;

    const sql = `
        UPDATE products 
        SET name = ?, category = ?, unit = ?, is_active = ?, sort_order = ?, code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const params = [name, category, unit, is_active ? 1 : 0, sort_order, code, id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'Ürün bulunamadı' });
        res.json({ success: true, message: 'Ürün güncellendi' });
    });
};

exports.deleteProduct = (req, res) => {
    const { id } = req.params;
    // Hard delete for now as requested.
    // If FK constraint fails (due to existing orders), we catch it.
    db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
        if (err) {
            if (err.message.includes('FOREIGN KEY')) {
                return res.status(400).json({ success: false, error: 'Bu ürün geçmiş siparişlerde kullanıldığı için silinemez. Bunun yerine pasife alabilirsiniz.' });
            }
            return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'Ürün bulunamadı' });
        res.json({ success: true, message: 'Ürün silindi' });
    });
};

// Re-implementing getAllProducts to use the new table for consistency
exports.getAllProductsWithNewLogic = (req, res) => {
    const { search, category, active_only, user_id } = req.query;
    const currentUserId = user_id || req.user.id;

    // Create table if not exists (Lazy init for dev speed)
    db.run(`CREATE TABLE IF NOT EXISTS user_favorite_products (user_id INTEGER, product_id INTEGER, PRIMARY KEY(user_id, product_id))`, [], (err) => {

        let sql = `
            SELECT 
                p.*,
                CASE WHEN uf.product_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
            FROM products p
            LEFT JOIN user_favorite_products uf ON uf.product_id = p.id AND uf.user_id = ?
            WHERE 1=1
        `;

        const params = [currentUserId];

        if (search) {
            sql += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.code) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category && category !== 'all') {
            sql += ` AND p.category = ?`;
            params.push(category);
        }

        if (active_only === 'true') {
            sql += ` AND p.is_active = 1`;
        }

        sql += ` ORDER BY is_favorite DESC, p.sort_order ASC, p.name ASC`;

        db.all(sql, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            const products = rows.map(r => ({
                ...r,
                is_active: !!r.is_active,
                is_favorite: !!r.is_favorite
            }));

            res.json({ success: true, products });
        });
    });
};
