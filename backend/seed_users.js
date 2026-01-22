const { User, sequelize } = require('./db');
const bcrypt = require('bcryptjs');

const admins = [
    { username: 'muhasebe', name: 'Muhasebe', role: 'admin' },
    { username: 'yonetim', name: 'Yönetim', role: 'admin' },
    { username: 'bora', name: 'Bora', role: 'admin' }
];

const users = [
    { id: '01', name: 'Dinçer Sezan' },
    { id: '02', name: 'Ferhat Öztaş' },
    { id: '03', name: 'Sercan Dinç' },
    { id: '04', name: 'Orçun Cansız' },
    { id: '05', name: 'Muhammet Arık' },
    { id: '06', name: 'Hüseyin Akgüneş' },
    { id: '07', name: 'Emre Özdemir' },
    { id: '08', name: 'Murat Deniz Gündoğdu' },
    { id: '09', name: 'İlker Hepçetinler' },
    { id: '11', name: 'Cemal Çenikli' },
    { id: '13', name: 'Ozan Yılmaz' },
    { id: '16', name: 'Ertunç Terazi' },
    { id: '17', name: 'Hakan Kılınçdemir' },
    { id: '19', name: 'Salih Arı' },
    { id: '21', name: 'Fatih Tercan' },
    { id: '23', name: 'Mertcan Sekerci' },
    { id: '24', name: 'M. Cabbar Balarısı' },
    { id: '25', name: 'Feti Bende' },
    { id: '26', name: 'Tugay Güven' },
    { id: '27', name: 'İsmail Sağır' },
    { id: '28', name: 'Bahadır Deniz' },
    { id: '40', name: 'Hasan Güler' },
    { id: '42', name: 'Erol Dereli' }
];

async function seed() {
    try {
        // FORCE: TRUE -> Tabloları silip yeniden oluşturur. (Yeni column eklendiği için gerekli)
        await sequelize.sync({ force: true });

        console.log('--- Veritabanı Sıfırlandı ve Kullanıcılar Ekleniyor ---');

        const hash = await bcrypt.hash('1234', 10);

        // 1. Adminleri Ekle
        for (const admin of admins) {
            await User.create({
                username: admin.username,
                personelCode: 'ADM_' + admin.username.toUpperCase(),
                name: admin.name,
                password: hash,
                role: 'admin'
            });
            console.log(`Admin ${admin.username} eklendi.`);
        }

        // 2. Personelleri Ekle
        for (const u of users) {
            await User.create({
                username: u.id, // Kullanıcı adı '01', '02' vs.
                personelCode: u.id,
                name: u.name,
                password: hash,
                role: 'user'
            });
            console.log(`Personel ${u.id} - ${u.name} eklendi.`);
        }

        console.log('--- Seed İşlemi Tamamlandı ---');
        process.exit(0);
    } catch (e) {
        console.error('Seed Hatası:', e);
        process.exit(1);
    }
}

seed();
