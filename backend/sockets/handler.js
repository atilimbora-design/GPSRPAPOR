const socketIo = require('socket.io');

module.exports = (io) => {
    io.on('connection', (socket) => {
        // Authenticate socket connection
        const token = socket.handshake.auth.token;
        // In a real scenario, verify token here. For now, assume it's passed or handled by middleware wrapper if needed.
        // But typically we extract user info from token.
        // Let's assume user ID and Role are sent in handshake query or auth for simplicity of this handler template,
        // or effectively decoded.
        // For security, implement proper JWT verification here similar to auth middleware.

        const userId = socket.handshake.query.userId || (socket.handshake.auth.user ? socket.handshake.auth.user.id : null);
        const userRole = socket.handshake.query.userRole || (socket.handshake.auth.user ? socket.handshake.auth.user.role : null);

        if (userId) {
            console.log(`User connected: ${userId} (${userRole})`);

            // Join user specific room
            socket.join(`user_${userId}`);

            // If admin, join admin rooms
            if (userRole === 'admin') {
                socket.join('admin_gps');
                console.log(`User ${userId} joined admin_gps room`);
            }

            // Join group rooms logic would go here (fetching from DB)
        }

        // GPS Update Event (Personel -> Admin)
        socket.on('gps_update', (data) => {
            // Data: { user_id, latitude, longitude, speed, battery_level, is_online, timestamp }
            // Broadcast to all admins
            io.to('admin_gps').emit('gps_updated', {
                ...data,
                server_timestamp: new Date().toISOString()
            });
        });

        // Typing events
        socket.on('typing', (data) => {
            const { receiver_id, is_typing } = data;
            io.to(`user_${receiver_id}`).emit('user_typing', {
                user_id: userId,
                is_typing
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
            if (userId && userRole === 'personel') {
                // Notify admins that user is offline
                io.to('admin_gps').emit('user_offline', {
                    user_id: userId,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
};
