require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
// const cron = require('node-cron'); // Will be enabled when cron jobs are implemented

// Database
const db = require('./config/database');

// Routes (Placeholder for now)
const authRoutes = require('./routes/auth');
const gpsRoutes = require('./routes/gps');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const userRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');

// Socket handlers
const socketHandler = require('./sockets/handler');

// Cron jobs
const cronJobs = require('./cron/jobs');

const app = express();
const server = http.createServer(app);

const corsOrigins = process.env.SOCKET_CORS_ORIGIN ? process.env.SOCKET_CORS_ORIGIN.split(',') : ['http://localhost:3000'];

const io = socketIo(server, {
    cors: {
        origin: corsOrigins,
        credentials: true
    }
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach IO to request for controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Static files (uploads) - Ensure directory exists or create it
const fs = require('fs');
['uploads', 'uploads/profiles', 'uploads/receipts', 'uploads/messages', 'uploads/groups', 'uploads/reports'].forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.get('/', (req, res) => {
    res.json({ message: 'Atilim Gida Backend API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Sunucu hatası'
            : err.message
    });
});

// Socket.io
socketHandler(io);

// Cron jobs
cronJobs.startAll();

// Server start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Base URL: ${process.env.BASE_URL}`);
    console.log(`🗄️ Database: ${process.env.DB_PATH}`);
    console.log(`⏰ Timezone: ${process.env.TZ}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        db.close(() => {
            console.log('Database connection closed');
            process.exit(0);
        });
    });
});
