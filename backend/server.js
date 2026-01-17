const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { sequelize, User, Location, Report, seed } = require('./db');
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
app.use(express.json());

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

// Socket.io Bağlantısı
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Kimlik doğrulama için token bekle
    socket.on('authenticate', (token) => {
        try {
            const user = jwt.verify(token, SECRET_KEY);
            socket.user = user;
            socket.join(user.role === 'admin' ? 'admins' : `user_${user.id}`);
            console.log(`${user.name} authenticated.`);
        } catch (e) {
            console.log('Socket auth failed');
        }
    });

    // Konum Güncellemesi (Her 10 saniyede bir gelecek)
    socket.on('updateLocation', async (data) => {
        if (!socket.user) return;

        // Veritabanına kaydet
        await Location.create({
            UserId: socket.user.id,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date()
        });

        // Adminlere ilet
        io.to('admins').emit('locationUpdate', {
            userId: socket.user.id,
            name: socket.user.name,
            code: socket.user.code,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date()
        });
    });

    // Chat Mesajlaşma
    socket.on('sendMessage', (data) => {
        // data: { to: 'admin' | userId, message: '...' }
        if (!socket.user) return;

        const messagePayload = {
            from: socket.user.id,
            fromName: socket.user.name,
            message: data.message,
            timestamp: new Date()
        };

        if (data.to === 'admin') {
            io.to('admins').emit('newMessage', messagePayload);
        } else {
            io.to(`user_${data.to}`).emit('newMessage', messagePayload);
        }
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

// Rapor Gönderme API'si (Basitleştirilmiş)
app.post('/api/reports', authenticateToken, async (req, res) => {
    // Burada dosya yükleme ve rapor kaydetme işlemleri yapılacak
    // Şimdilik taslak
    try {
        const report = await Report.create({
            ...req.body,
            UserId: req.user.id
        });

        // Rapor fiziksel dosya olarak kaydedilecek (PDF oluşturma vs frontend tarafında veya burada yapılabilir)
        // Kullanıcı için klasör:
        // backend/personel/KOD_ISIM/raporlar/TARIH.pdf

        res.json({ success: true, report });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Backend'i başlat ve DB'yi hazırla
const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // İlk çalıştırmada DB'yi seed etmek için kontrol
    const userCount = await User.count();
    if (userCount === 0) {
        console.log('Veritabanı boş, seed işlemi başlatılıyor...');
        await seed();
    }
});
