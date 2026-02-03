const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || './database/atilim.db';

// Klasör yoksa oluştur
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

async function migrate() {
    console.log('Starting database migration...');

    // Tabloları oluştur
    db.serialize(() => {
        // users
        db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('personel', 'admin')),
        profile_photo TEXT,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        remember_token TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // gps_locations
        db.run(`
      CREATE TABLE IF NOT EXISTS gps_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed REAL DEFAULT 0,
        battery_level INTEGER,
        accuracy REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_online INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_gps_user_timestamp ON gps_locations(user_id, timestamp DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_gps_timestamp ON gps_locations(timestamp DESC)`);

        // products
        db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT DEFAULT 'KOLI',
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 999,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // orders
        db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('draft', 'active', 'locked')),
        is_locked INTEGER DEFAULT 0,
        total_items INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        locked_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, order_date)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, order_date DESC)`);

        // order_items
        db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        unit_price REAL DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(order_id, product_id)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_favorite ON order_items(is_favorite DESC)`);

        // reports
        db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        report_date DATE NOT NULL,
        vehicle_plate TEXT NOT NULL,
        start_km INTEGER NOT NULL,
        end_km INTEGER NOT NULL,
        total_km INTEGER GENERATED ALWAYS AS (end_km - start_km) STORED,
        fuel_expense REAL DEFAULT 0,
        fuel_receipt TEXT,
        maintenance_expense REAL DEFAULT 0,
        maintenance_receipt TEXT,
        maintenance_description TEXT,
        toll_expense REAL DEFAULT 0,
        credit_card_amount REAL DEFAULT 0,
        check_amount REAL DEFAULT 0,
        eft_amount REAL DEFAULT 0,
        cash_amount REAL DEFAULT 0,
        total_collection REAL GENERATED ALWAYS AS (
          credit_card_amount + check_amount + eft_amount + cash_amount
        ) STORED,
        accounting_delivered REAL DEFAULT 0,
        cash_difference REAL GENERATED ALWAYS AS (
          cash_amount - accounting_delivered
        ) STORED,
        cash_difference_reason TEXT,
        pdf_path TEXT,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted')),
        submitted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, report_date)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, report_date DESC)`);

        // messages
        db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER,
        group_id INTEGER,
        message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file')),
        content TEXT NOT NULL,
        file_size INTEGER,
        thumbnail TEXT,
        is_read INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        read_at DATETIME,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        CHECK (
          (receiver_id IS NOT NULL AND group_id IS NULL) OR
          (receiver_id IS NULL AND group_id IS NOT NULL)
        )
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read, receiver_id)`);

        // chat_groups
        db.run(`
      CREATE TABLE IF NOT EXISTS chat_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        photo TEXT,
        created_by INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_groups_active ON chat_groups(is_active, created_at DESC)`);

        // chat_group_members
        db.run(`
      CREATE TABLE IF NOT EXISTS chat_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_group_members_group ON chat_group_members(group_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_group_members_user ON chat_group_members(user_id)`);

        // leaderboard_cache
        db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        total_collection REAL DEFAULT 0,
        rank INTEGER,
        previous_rank INTEGER,
        report_count INTEGER DEFAULT 0,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, period_type, period_start, period_end)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard_cache(period_type, period_start, period_end, rank)`);

        // App versions table
        db.run(`
      CREATE TABLE IF NOT EXISTS app_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_code INTEGER NOT NULL UNIQUE,
        version_name TEXT NOT NULL,
        apk_url TEXT NOT NULL,
        apk_size INTEGER,
        changelog TEXT,
        is_mandatory INTEGER DEFAULT 1,
        min_supported_version INTEGER,
        release_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    });

    // Seed data
    await seedUsers();
    await seedProducts();

    console.log('Migration completed successfully!');
    db.close();
}

async function seedUsers() {
    const passwordHash = await bcrypt.hash('1234', 10);
    const personels = [
        { id: 1, username: '1', full_name: 'Dinçer Sezan' },
        { id: 2, username: '2', full_name: 'Ferhat Öztaş' },
        { id: 3, username: '3', full_name: 'Sercan Dinç' },
        { id: 4, username: '4', full_name: 'Orçun Cansız' },
        { id: 5, username: '5', full_name: 'Emrehan Karakaya' },
        { id: 6, username: '6', full_name: 'Hüseyin Akgüneş' },
        { id: 7, username: '7', full_name: 'Emre Özdemir' },
        { id: 8, username: '8', full_name: 'Murat Deniz Gündoğdu' },
        { id: 9, username: '9', full_name: 'Çağatay Temiz' },
        { id: 11, username: '11', full_name: 'Cemal Cenikli' },
        { id: 13, username: '13', full_name: 'Ozan Yılmaz' },
        { id: 16, username: '16', full_name: 'Ertunç Terazi' },
        { id: 17, username: '17', full_name: 'Hakan Kılınçdemir' },
        { id: 19, username: '19', full_name: 'Salih Arı' },
        { id: 21, username: '21', full_name: 'Fatih Tercan' },
        { id: 23, username: '23', full_name: 'Mertcan Sekerci' },
        { id: 24, username: '24', full_name: 'M. Cabbar Balarısı' },
        { id: 25, username: '25', full_name: 'Feti Bende' },
        { id: 26, username: '26', full_name: 'Tugay Güven' },
        { id: 27, username: '27', full_name: 'İsmail Sağır' },
        { id: 28, username: '28', full_name: 'Bahadır Deniz' },
        { id: 40, username: '40', full_name: 'Hasan Güler' },
        { id: 42, username: '42', full_name: 'Erol Dereli' }
    ];

    const admins = [
        { username: 'bora', full_name: 'Bora Atılım' },
        { username: 'burak', full_name: 'Burak Admin' },
        { username: 'muhasebe', full_name: 'Muhasebe' },
        { username: 'necati', full_name: 'Necati Admin' },
        { username: 'yasemin', full_name: 'Yasemin Admin' },
        { username: 'ismail', full_name: 'İsmail Admin' }
    ];

    // Personel ekle
    for (const p of personels) {
        db.run(`
      INSERT OR IGNORE INTO users (id, username, full_name, password_hash, role)
      VALUES (?, ?, ?, ?, 'personel')
    `, [p.id, p.username, p.full_name, passwordHash]);
    }

    // Admin ekle
    for (const a of admins) {
        db.run(`
      INSERT OR IGNORE INTO users (username, full_name, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `, [a.username, a.full_name, passwordHash]);
    }

    console.log('Users seeded');
}

async function seedProducts() {
    const products = [
        'TB ROASTER', 'TB CİĞER', 'TB TAŞLIK', 'TB BUT', 'TB BAGET',
        'TB PARMAK BONFİLE', 'TB BUT PİRZOLA', 'TB BUT IZGARA', 'TB BUT ŞİŞ',
        'TB FİLETO', 'TB BONFİLE', 'TB IZGARA KANAT', 'TB BUT SOTE',
        'TB SIRTSIZ ÜST BUT', 'TB KANAT', 'TB. KELEBEK PİRZOLA',
        'HS B 1000-1200', 'HS 1000', 'HS 1100', 'HS 1200', 'HS 1300',
        'HS 1400', 'HS 1500', 'HS 1600', 'HS 1700', 'HS 1800', 'HS 1900',
        'HS 2000', 'HS İRİ',
        'POŞET 1300', 'POŞET 1400', 'POŞET 1500', 'POŞET 1600',
        'POŞET 1700', 'POŞET 1800', 'POŞET 1900', 'POŞET 2000', 'POŞET İRİ',
        'PİLİÇ 700*900 POŞETLİ ROSTER', 'ÇATAL BUT', 'BUT BUT', 'BUT 270',
        'BUT 350', 'BAGET', 'BAGET 115', 'SIRTSIZ ÜST BUT', 'DERİLİ BUT IZGARA',
        'KEMİKSİZ BUT', 'BUT PİRZOLA', 'BUT IZGARA', 'BUT ŞİŞ', 'BUT SOTE',
        'SIRTSIZ GÖĞÜS', 'DÖNERLİK FİLETO', 'FİLETO', 'BONFİLE', 'BONFİLE 120',
        'BONFİLE 170', 'BONFİLE 200', 'BİFTEK', 'PİLİÇ SOTE', 'KANAT UÇSUZ',
        'KANAT B IZGARA', 'KANAT IZGARA', 'KANAT PARMAK BONFİLE', 'ÇORBALIK ÖN SIRT',
        'SIRTSIZ BUT 280', 'KANAT UCU', 'BÜTÜN GÖĞÜS', 'PİLİÇ JULYEN',
        'PİLİÇ TAŞLIK KUTULU', 'KELEBEK PİRZOLA', 'PİLİÇ CİĞER KUTULU',
        'PİLİÇ BOYUN', 'SIRTSIZ BUT 280', 'PİLİÇ TALEKS D.', 'PİLİÇ STİCKS',
        'D.PİLİÇ TENDERS', 'D. PİLİÇ NUGGET', 'D. PİLİÇ BURGER', 'D. PİLİÇ KADINBUDU',
        'D. PİLİÇ CORDON BLEU', 'D. PİLİÇ SCHNİTZEL', 'D. PİLİÇ PİŞMİŞ DÖNER',
        'D.PİLİÇ BEY KEBAP', 'PİLİÇ PİŞMİŞ DÖNER', 'MATE GÖĞÜS KIYMA', 'MATE BOYUN KIYMA'
    ];

    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const code = product.replace(/ /g, '_').replace(/\./g, '').toUpperCase();
        const category = product.split(' ')[0];

        db.run(`
      INSERT OR IGNORE INTO products (code, name, category, sort_order)
      VALUES (?, ?, ?, ?)
    `, [code, product, category, i + 1]);
    }

    console.log('Products seeded');
}

migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
