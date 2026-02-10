const socketIo = require('socket.io');
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Store active user sessions: userId -> socketId
const activeSessions = new Map();

module.exports = (io) => {
    // Middleware for Auth
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (token) {
            jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar', (err, decoded) => {
                if (err) return next(); // Continue without auth (let connection open, userId might be null)
                socket.handshake.auth.user = decoded;
                next();
            });
        } else {
            next();
        }
    });

    io.on('connection', (socket) => {
        // Authenticate socket connection
        const authUser = socket.handshake.auth.user;
        // Support legacy manual userId
        const userId = authUser ? authUser.id : socket.handshake.query.userId;
        const userRole = authUser ? authUser.role : socket.handshake.query.userRole;

        if (userId) {
            console.log(`User connected: ${userId} (${userRole})`);

            // ✅ SINGLE SESSION LOCK: Check if user is already logged in
            const existingSocketId = activeSessions.get(userId);
            if (existingSocketId && existingSocketId !== socket.id) {
                console.log(`🔒 Kicking out previous session for user ${userId}: ${existingSocketId}`);

                // Force logout the old session
                io.to(existingSocketId).emit('force_logout', {
                    message: 'Hesabınız başka bir cihazdan giriş yaptı.',
                    reason: 'duplicate_login'
                });

                // Disconnect the old socket
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    oldSocket.disconnect(true);
                }
            }

            // Register new session
            activeSessions.set(userId, socket.id);
            console.log(`✅ New session registered for user ${userId}: ${socket.id}`);

            // Join user specific room
            socket.join(`user_${userId}`);

            // Join User's Groups
            db.all(`SELECT group_id FROM chat_group_members WHERE user_id = ?`, [userId], (err, rows) => {
                if (!err && rows) {
                    rows.forEach(row => {
                        socket.join(`group_${row.group_id}`);
                        console.log(`User ${userId} joined group_${row.group_id}`);
                    });
                }
            });

            // If admin, join admin rooms
            if (userRole === 'admin') {
                socket.join('admin_gps');
                console.log(`Admin ${userId} joined admin_gps room`);
            }
        }

        // Register event (Mobile app calls this on connect)
        socket.on('register', (id) => {
            console.log(`User registered via socket: ${id}`);
            socket.join(`user_${id}`);

            const now = new Date();
            const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)).toISOString();
            io.to('admin_gps').emit('gps_updated', {
                user_id: intId = parseInt(id),
                is_online: true,
                timestamp: turkeyTime
            });
        });

        // Location Update Event (Mobile -> Server)
        socket.on('locationUpdate', (data) => {
            const now = new Date();
            const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)).toISOString();

            io.to('admin_gps').emit('gps_updated', {
                user_id: data.userId,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed || 0,
                heading: data.heading,
                battery_level: data.batteryLevel || 100,
                is_online: true,
                timestamp: turkeyTime
            });

            db.run(`UPDATE users SET latitude = ?, longitude = ?, speed = ?, battery_level = ?, last_location_update = CURRENT_TIMESTAMP WHERE id = ?`,
                [data.latitude, data.longitude, data.speed || 0, data.batteryLevel || 100, data.userId],
                (err) => { if (err) console.error("DB Loc Update Error:", err.message); }
            );
        });

        // Legacy GPS Update (if still used)
        socket.on('gps_update', (data) => {
            io.to('admin_gps').emit('gps_updated', { ...data, server_timestamp: new Date().toISOString() });
        });

        socket.on('disconnect', () => {
            if (userId) {
                // Remove from active sessions
                if (activeSessions.get(userId) === socket.id) {
                    activeSessions.delete(userId);
                    console.log(`🔓 Session removed for user ${userId}`);
                }

                io.to('admin_gps').emit('gps_updated', {
                    user_id: userId,
                    is_online: false
                });
            }
        });
    });
};
