const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || './database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

const newProducts = [
    // Donuk / Hazır
    { category: 'Donuk / Hazır', name: 'D. Piliç Sticks' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Tenders' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Nugget' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Burger' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Kadınbudu' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Cordon Bleu' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Schnitzel' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Pişmiş Döner' },
    { category: 'Donuk / Hazır', name: 'D. Piliç Bey Kebap' },
    { category: 'Donuk / Hazır', name: 'Piliç Pişmiş Döner' },

    // Kıyma
    { category: 'Kıyma', name: 'Mate Göğüs Kıyma' },
    { category: 'Kıyma', name: 'Mate Boyun Kıyma' },

    // Parça & Kesim Ürünleri
    { category: 'Parça & Kesim', name: 'Çatal But' },
    { category: 'Parça & Kesim', name: 'But' },
    { category: 'Parça & Kesim', name: 'But 270' },
    { category: 'Parça & Kesim', name: 'But 350' },
    { category: 'Parça & Kesim', name: 'Baget' },
    { category: 'Parça & Kesim', name: 'Baget 115' },
    { category: 'Parça & Kesim', name: 'Sırtsız Üst But' },
    { category: 'Parça & Kesim', name: 'Derili But Izgara' },
    { category: 'Parça & Kesim', name: 'Kemiksiz But' },
    { category: 'Parça & Kesim', name: 'But Pirzola' },
    { category: 'Parça & Kesim', name: 'But Izgara' },
    { category: 'Parça & Kesim', name: 'But Şiş' },
    { category: 'Parça & Kesim', name: 'But Sote' },
    { category: 'Parça & Kesim', name: 'Sırtsız Göğüs' },
    { category: 'Parça & Kesim', name: 'Dönerlik Fileto' },
    { category: 'Parça & Kesim', name: 'Fileto' },
    { category: 'Parça & Kesim', name: 'Bonfile' },
    { category: 'Parça & Kesim', name: 'Bonfile 120' },
    { category: 'Parça & Kesim', name: 'Bonfile 170' },
    { category: 'Parça & Kesim', name: 'Bonfile 200' },
    { category: 'Parça & Kesim', name: 'Biftek' },
    { category: 'Parça & Kesim', name: 'Piliç Sote' },
    { category: 'Parça & Kesim', name: 'Kanat' },
    { category: 'Parça & Kesim', name: 'Uçsuz Kanat' },
    { category: 'Parça & Kesim', name: 'Izgara Kanat' },
    { category: 'Parça & Kesim', name: 'B Izgara Kanat' },
    { category: 'Parça & Kesim', name: 'Parmak Bonfile' },
    { category: 'Parça & Kesim', name: 'Çorbalık' },
    { category: 'Parça & Kesim', name: 'Ön Sırt' },
    { category: 'Parça & Kesim', name: 'Sırtsız But 230' },
    { category: 'Parça & Kesim', name: 'Sırtsız But 280' },
    { category: 'Parça & Kesim', name: 'Kanat Ucu' },
    { category: 'Parça & Kesim', name: 'Bütün Göğüs' },
    { category: 'Parça & Kesim', name: 'Piliç Julyen' },
    { category: 'Parça & Kesim', name: 'Kelebek Pirzola' },
    { category: 'Parça & Kesim', name: 'Piliç Boyun' },
    { category: 'Parça & Kesim', name: 'Piliç Taleks' },
    { category: 'Parça & Kesim', name: 'Piliç Taşlık (Kutulu)' },
    { category: 'Parça & Kesim', name: 'Piliç Ciğer (Kutulu)' },

    // Bütün – Poşetli
    { category: 'Bütün Poşetli', name: 'Poşet 1300' },
    { category: 'Bütün Poşetli', name: 'Poşet 1400' },
    { category: 'Bütün Poşetli', name: 'Poşet 1500' },
    { category: 'Bütün Poşetli', name: 'Poşet 1600' },
    { category: 'Bütün Poşetli', name: 'Poşet 1700' },
    { category: 'Bütün Poşetli', name: 'Poşet 1800' },
    { category: 'Bütün Poşetli', name: 'Poşet 1900' },
    { category: 'Bütün Poşetli', name: 'Poşet 2000' },
    { category: 'Bütün Poşetli', name: 'Poşet İri' },
    { category: 'Bütün Poşetli', name: 'Piliç 700x900' },
    { category: 'Bütün Poşetli', name: 'Poşetli Roster' },

    // HS Bütün
    { category: 'HS Bütün', name: 'HS 1000–1200' },
    { category: 'HS Bütün', name: 'HS 1000' },
    { category: 'HS Bütün', name: 'HS 1100' },
    { category: 'HS Bütün', name: 'HS 1200' },
    { category: 'HS Bütün', name: 'HS 1300' },
    { category: 'HS Bütün', name: 'HS 1400' },
    { category: 'HS Bütün', name: 'HS 1500' },
    { category: 'HS Bütün', name: 'HS 1600' },
    { category: 'HS Bütün', name: 'HS 1700' },
    { category: 'HS Bütün', name: 'HS 1800' },
    { category: 'HS Bütün', name: 'HS 1900' },
    { category: 'HS Bütün', name: 'HS 2000' },
    { category: 'HS Bütün', name: 'HS İri' },

    // TB (Tabaklı / TB Ürünler)
    { category: 'TB', name: 'TB Roster' },
    { category: 'TB', name: 'TB Ciğer' },
    { category: 'TB', name: 'TB Taşlık' },
    { category: 'TB', name: 'TB But' },
    { category: 'TB', name: 'TB Baget' },
    { category: 'TB', name: 'TB Parmak Bonfile' },
    { category: 'TB', name: 'TB But Pirzola' },
    { category: 'TB', name: 'TB But Izgara' },
    { category: 'TB', name: 'TB But Şiş' },
    { category: 'TB', name: 'TB Fileto' },
    { category: 'TB', name: 'TB Bonfile' },
    { category: 'TB', name: 'TB Izgara Kanat' },
    { category: 'TB', name: 'TB But Sote' },
    { category: 'TB', name: 'TB Sırtsız Üst But' },
    { category: 'TB', name: 'TB Kanat' },
    { category: 'TB', name: 'TB Kelebek Pirzola' }
];

db.serialize(() => {
    console.log('Clearing existing products...');
    db.run('DELETE FROM products');
    db.run('DELETE FROM sqlite_sequence WHERE name="products"'); // Reset Auto Increment

    console.log('Inserting new products...');
    const stmt = db.prepare('INSERT INTO products (code, name, category, sort_order) VALUES (?, ?, ?, ?)');

    let count = 0;
    newProducts.forEach((p, index) => {
        // Generate Code: TB Roster -> TB_ROSTER
        const code = p.name
            .replace(/ /g, '_')
            .replace(/\./g, '')
            .replace(/–/g, '-')
            .replace(/&/g, '')
            .toUpperCase();

        stmt.run(code, p.name, p.category, index + 1, (err) => {
            if (err) {
                console.error(`Error inserting ${p.name}:`, err.message);
            }
        });
        count++;
    });

    stmt.finalize(() => {
        console.log(`Successfully updated ${count} products.`);
        db.close();
    });
});
