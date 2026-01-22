const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { sequelize, User, Location, Report, Message, seed } = require('./db');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Uploads klasörünü dışarı aç (Resim ve PDF'ler için)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const SECRET_KEY = 'gps_rapor_secret_key_change_this';

// Basit Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Username admin ise veya ID ise
    const user = await User.findOne({ where: { personelCode: username } });

    if (!user) {
        return res.status(400).json({ message: 'Kullanıcı bulunamadı' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ message: 'Şifre hatalı' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, code: user.personelCode }, SECRET_KEY);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, code: user.personelCode } });
});

// Admin: Kullanıcı Listesi Getir
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const users = await User.findAll({
            attributes: ['id', 'personelCode', 'name', 'role', 'avatar']
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Kullanıcı Avatar Yükleme API
app.post('/api/users/avatar', authenticateToken, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Resim verisi yok' });

        // Klasör oluştur
        const avatarDir = path.join(__dirname, 'uploads', 'avatars');
        if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
        }

        // Dosyayı kaydet
        const fileName = `avatar_${req.user.id}_${Date.now()}.jpg`;
        const filePath = path.join(avatarDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(imageBase64, 'base64'));

        // URL oluştur (localhost veya domain)
        // Şimdilik upload path'ini static sunuyoruz
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${fileName}`;

        // DB güncelle
        await User.update({ avatar: avatarUrl }, { where: { id: req.user.id } });

        res.json({ success: true, avatarUrl });
    } catch (e) {
        console.error('Avatar yükleme hatası:', e);
        res.status(500).json({ error: e.message });
    }
});

// Socket.io Bağlantısı
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Kimlik doğrulama için token bekle
    // Kimlik doğrulama için token bekle
    socket.on('authenticate', async (token) => {
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            // Veritabanından güncel rolü çek
            const dbUser = await User.findByPk(decoded.id);

            if (dbUser) {
                const user = { ...decoded, role: dbUser.role }; // Rolü güncelle
                socket.user = user;
                const room = user.role === 'admin' ? 'admins' : `user_${user.id}`;
                socket.join(room);
                console.log(`${user.name} authenticated. Role: ${user.role} (Updated) Room: ${room}`);
            } else {
                console.log('User not found in DB');
            }

        } catch (e) {
            console.log('Socket auth failed', e);
        }
    });

    // Konum Güncellemesi (Her 10 saniyede bir gelecek)
    socket.on('updateLocation', async (data) => {
        console.log(`[LAT/LNG] Veri Geldi: ${data.lat}, ${data.lng} (User: ${socket.user?.name})`);

        if (!socket.user) return;

        // Veritabanına kaydet
        await Location.create({
            UserId: socket.user.id,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            battery: data.battery,
            timestamp: new Date()
        });

        // 2. User tablosunu güncelle (Son Konum)
        await User.update({
            lastLat: data.lat,
            lastLng: data.lng,
            speed: data.speed,
            battery: data.battery,
            lastSeen: new Date()
        }, { where: { id: socket.user.id } });

        // Tüm istemcilere (adminlere) konum güncellemesini bildir
        // Avatar bilgisini de ekliyoruz
        io.emit('locationUpdate', {
            id: socket.user.id,
            userId: socket.user.id,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            battery: data.battery,
            timestamp: new Date(),
            name: socket.user.name,
            avatar: socket.user.avatar // Avatar eklendi
        });
    });

    // Chat Mesajlaşma
    // Chat Mesajlaşma (DB Destekli)
    socket.on('sendMessage', async (data) => {
        // data: { to: 'admin' | userId | 'group_name', message: '...', type: 'text'|'image'|'location' }
        if (!socket.user) return;

        try {
            let receiverId = null;
            let groupId = null;

            if (data.to === 'admin') {
                groupId = 'admins';
            } else if (data.to.startsWith('group_')) {
                groupId = data.to;
            } else {
                receiverId = data.to;
            }

            // DB'ye Kaydet
            // Eğer groupId varsa, senderId ve receiverId (null) olabilir.
            const savedMsg = await Message.create({
                senderId: socket.user.id,
                receiverId: receiverId,
                groupId: groupId,
                content: data.message,
                senderName: socket.user.name,
                type: data.type || 'text',
                timestamp: new Date()
            });

            const messagePayload = {
                id: savedMsg.id,
                from: socket.user.id,
                fromName: socket.user.name,
                message: savedMsg.content,
                type: savedMsg.type,
                timestamp: savedMsg.timestamp,
                to: data.to
            };

            if (groupId === 'admins') {
                io.to('admins').emit('newMessage', messagePayload);
            } else if (groupId) {
                io.to(groupId).emit('newMessage', messagePayload);
            } else {
                io.to(`user_${receiverId}`).emit('newMessage', messagePayload);
                socket.emit('messageSent', messagePayload); // Onay
            }
        } catch (e) {
            console.error('Mesaj kaydetme hatası:', e);
        }
    });

    socket.on('joinGroup', (groupName) => {
        if (socket.user) {
            socket.join(groupName);
        }
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

// Rapor Gönderme API'si (Basitleştirilmiş)
// Rapor Gönderme API'si
app.post('/api/reports', authenticateToken, async (req, res) => {
    try {
        const { date, vehiclePlate, startKm, endKm, expenses, collections, cashDelivered, description, pdfBase64 } = req.body;

        // Klasör Yolunu Hazırla
        const userFolderName = `${req.user.code}_${req.user.name.replace(/\s+/g, '_')}`;
        const userDir = path.join(__dirname, 'personel', userFolderName, 'raporlar');

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        // PDF Kaydet
        let pdfPath = null;
        if (pdfBase64) {
            const fileName = `Rapor_${date}_${req.user.code}.pdf`;
            pdfPath = path.join(userDir, fileName);
            fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, 'base64'));
        }

        // Fiş Fotoğraflarını Kaydet (Eğer varsa)
        // expenses.fuel.image (base64) -> personel/.../fisler/Fuel_Date.jpg
        const receiptDir = path.join(__dirname, 'personel', userFolderName, 'fisler');
        if (!fs.existsSync(receiptDir)) {
            fs.mkdirSync(receiptDir, { recursive: true });
        }

        // Helper function for saving images
        const saveImage = (base64Data, type) => {
            if (!base64Data) return null;
            const fileName = `${type}_${date}_${req.user.code}.jpg`;
            const filePath = path.join(receiptDir, fileName);
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            return fileName; // DB'ye sadece dosya adı kaydedelim veya path
        };

        if (expenses && expenses.fuel && expenses.fuel.image) {
            expenses.fuel.imagePath = saveImage(expenses.fuel.image, 'Yakıt');
            delete expenses.fuel.image; // Base64'ü DB'ye kaydetme
        }
        if (expenses && expenses.maintenance && expenses.maintenance.image) {
            expenses.maintenance.imagePath = saveImage(expenses.maintenance.image, 'Tamir');
            delete expenses.maintenance.image;
        }

        // Veritabanına Kaydet
        const report = await Report.create({
            date,
            vehiclePlate,
            startKm,
            endKm,
            expenses,
            collections,
            cashDelivered,
            description,
            UserId: req.user.id
        });

        res.json({ success: true, message: 'Rapor başarıyla kaydedildi', reportId: report.id });
    } catch (e) {
        console.error('Rapor kaydetme hatası:', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin: Tüm Raporları Getir
app.get('/api/reports', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    try {
        const reports = await Report.findAll({
            include: [{ model: User, attributes: ['name', 'personelCode'] }],
            order: [['date', 'DESC']]
        });
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// User: Kendi Raporlarını Getir
app.get('/api/reports/user', authenticateToken, async (req, res) => {
    try {
        const reports = await Report.findAll({
            where: { UserId: req.user.id },
            order: [['date', 'DESC']]
        });
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// User: İstatistikler (Günlük, Haftalık, Aylık)
app.get('/api/stats/user', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
        // Pazartesiden başla
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)).toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        const reports = await Report.findAll({
            where: {
                UserId: req.user.id,
                date: { [Op.gte]: startOfMonth } // En eski tarih (Ay başı)
            }
        });

        let daily = 0;
        let weekly = 0;
        let monthly = 0;

        reports.forEach(r => {
            let total = 0;
            if (r.collections) {
                let col = r.collections;
                if (typeof col === 'string') col = JSON.parse(col);
                total += (parseFloat(col.cash) || 0);
                total += (parseFloat(col.check) || 0);
                // Kredi kartı eklenebilir
            }

            if (r.date >= startOfDay) daily += total;
            if (r.date >= startOfWeek) weekly += total;
            monthly += total;
        });

        res.json({ daily, weekly, monthly });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mesaj Geçmişi API'si
app.get('/api/messages/:target', authenticateToken, async (req, res) => {
    try {
        const target = req.params.target;
        let whereClause = {};

        if (target === 'admins') {
            if (req.user.role === 'admin') {
                whereClause = { groupId: 'admins' };
            } else {
                return res.status(403).json({ error: 'Bu kanalı görme yetkiniz yok' });
            }
        } else if (target.startsWith('group_')) {
            whereClause = { groupId: target };
        } else {
            whereClause = {
                [Op.or]: [
                    { senderId: req.user.id, receiverId: target },
                    { senderId: target, receiverId: req.user.id }
                ]
            };
        }

        const messages = await Message.findAll({
            where: whereClause,
            order: [['timestamp', 'ASC']],
            limit: 100
        });

        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Backend'i başlat ve DB'yi hazırla
const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Veritabanı tablolarını güncelle (Veri kaybı olmadan)
    // Veritabanı tablolarını güncelle (Veri kaybı olmadan)
    try {
        await sequelize.sync(); // alter: true riskli, kaldirdim
    } catch (e) {
        console.error('DB Sync Error (Ignored):', e.message);
    }

    // İlk çalıştırmada DB'yi seed etmek için kontrol
    const userCount = await User.count();
    if (userCount === 0) {
        console.log('Veritabanı boş, seed işlemi başlatılıyor...');
        await seed();
    }
});
